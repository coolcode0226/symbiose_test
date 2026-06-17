import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPolygon } from '@forest/database';
import { POLYGON_ANALYZER } from './analysis/analysis.contract';
import type { PolygonAnalysis, PolygonAnalyzer } from './analysis/analysis.contract';

/** Shape returned to the resolver (maps onto SavedPolygonType). */
interface SavedPolygonRow {
    id: string;
    name: string;
    areaHectares: number;
    status: string;
    createdAt: Date;
    geometry: object;
    analysisResults: PolygonAnalysis | null;
}

// Columns selected for read responses, with geometry re-encoded as GeoJSON.
const SELECT_COLUMNS = `
    id,
    name,
    area_hectares     AS "areaHectares",
    status,
    created_at        AS "createdAt",
    analysis_results  AS "analysisResults",
    ST_AsGeoJSON(geometry)::json AS geometry
`;

@Injectable()
export class PolygonsService {
    constructor(
        @InjectRepository(UserPolygon)
        private readonly repo: Repository<UserPolygon>,
        @Inject(POLYGON_ANALYZER)
        private readonly analyzer: PolygonAnalyzer,
    ) {}

    async save(userId: string, name: string, geometry: object): Promise<SavedPolygonRow> {
        const areaHectares = await this.areaHectares(geometry);
        const { analysis, status } = await this.runAnalysis(geometry, areaHectares);

        // Draw emits a Polygon; the column is MultiPolygon → coerce with ST_Multi.
        const [{ id }]: Array<{ id: string }> = await this.repo.query(
            `INSERT INTO user_polygons (user_id, name, geometry, area_hectares, analysis_results, status)
             VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)), $4, $5::jsonb, $6)
             RETURNING id`,
            [userId, name, JSON.stringify(geometry), areaHectares, analysis ? JSON.stringify(analysis) : null, status],
        );

        return this.findOne(userId, id);
    }

    async findAll(userId: string): Promise<SavedPolygonRow[]> {
        return this.repo.query(
            `SELECT ${SELECT_COLUMNS} FROM user_polygons WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId],
        );
    }

    async findOne(userId: string, id: string): Promise<SavedPolygonRow> {
        const rows: SavedPolygonRow[] = await this.repo.query(
            `SELECT ${SELECT_COLUMNS} FROM user_polygons WHERE user_id = $1 AND id = $2`,
            [userId, id],
        );
        if (!rows[0]) {
            throw new NotFoundException('Polygon not found');
        }
        return rows[0];
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const deleted: Array<{ id: string }> = await this.repo.query(
            `DELETE FROM user_polygons WHERE user_id = $1 AND id = $2 RETURNING id`,
            [userId, id],
        );
        if (deleted.length === 0) {
            throw new NotFoundException('Polygon not found');
        }
        return true;
    }

    async reanalyze(userId: string, id: string): Promise<SavedPolygonRow> {
        const polygon = await this.findOne(userId, id);
        const { analysis, status } = await this.runAnalysis(polygon.geometry, polygon.areaHectares);

        await this.repo.query(
            `UPDATE user_polygons SET analysis_results = $3::jsonb, status = $4 WHERE user_id = $1 AND id = $2`,
            [userId, id, analysis ? JSON.stringify(analysis) : null, status],
        );

        return this.findOne(userId, id);
    }

    /** Area of the drawn polygon in hectares (geography cast → m²). */
    private async areaHectares(geometry: object): Promise<number> {
        const [{ area }]: Array<{ area: string }> = await this.repo.query(
            `SELECT ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) / 10000.0 AS area`,
            [JSON.stringify(geometry)],
        );
        return Number(area);
    }

    /** Run analysis behind the boundary; a failure degrades to status 'failed', not a thrown request. */
    private async runAnalysis(
        geometry: object,
        areaHectares: number,
    ): Promise<{ analysis: PolygonAnalysis | null; status: 'completed' | 'failed' }> {
        try {
            const analysis = await this.analyzer.analyze(geometry, areaHectares);
            return { analysis, status: 'completed' };
        } catch (err) {
            console.error('Polygon analysis failed:', err);
            return { analysis: null, status: 'failed' };
        }
    }
}
