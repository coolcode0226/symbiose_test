import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForestPlot } from '@forest/database';
import { PolygonAnalysis, PolygonAnalyzer, SpeciesShare } from './analysis.contract';

/** Row shape returned by the intersection query below. */
interface IntersectionRow {
    typeForet: string | null;
    essences: string[] | null;
    interHa: string; // numeric -> string from pg
}

/**
 * In-process PostGIS implementation of the polygon-analysis boundary.
 *
 * Intersects the drawn polygon with forest_plots and aggregates the result. This is the piece that
 * would move out of process first if analysis became heavy — consumers depend on PolygonAnalyzer,
 * not on this class, so swapping it for a remote client requires no change upstream.
 */
@Injectable()
export class PostgisAnalyzer implements PolygonAnalyzer {
    constructor(
        @InjectRepository(ForestPlot)
        private readonly forestRepo: Repository<ForestPlot>,
    ) {}

    async analyze(geometry: object, polygonAreaHectares: number): Promise<PolygonAnalysis> {
        // Per intersecting plot: the area (ha) of its overlap with the polygon, plus its species/type.
        // ST_MakeValid guards against self-intersecting hand-drawn polygons; geography cast gives m².
        const rows: IntersectionRow[] = await this.forestRepo.query(
            `WITH poly AS (
                 SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS g
             )
             SELECT p.type_foret AS "typeForet",
                    p.essences   AS essences,
                    ST_Area(ST_Intersection(p.geom, poly.g)::geography) / 10000.0 AS "interHa"
             FROM forest_plots p, poly
             WHERE ST_Intersects(p.geom, poly.g)`,
            [JSON.stringify(geometry)],
        );

        const plotCount = rows.length;
        const totalForestArea = round(rows.reduce((sum, r) => sum + Number(r.interHa), 0));

        // Attribute each plot's intersected area equally across its listed species.
        const speciesArea = new Map<string, number>();
        const forestTypes = new Set<string>();
        for (const r of rows) {
            if (r.typeForet) forestTypes.add(r.typeForet);
            const area = Number(r.interHa);
            const species = r.essences && r.essences.length > 0 ? r.essences : [];
            if (species.length === 0) continue;
            const perSpecies = area / species.length;
            for (const s of species) {
                speciesArea.set(s, (speciesArea.get(s) ?? 0) + perSpecies);
            }
        }

        const speciesDistribution: SpeciesShare[] = [...speciesArea.entries()]
            .map(([species, areaHectares]) => ({
                species,
                areaHectares: round(areaHectares),
                percentage: totalForestArea > 0 ? round((areaHectares / totalForestArea) * 100, 1) : 0,
            }))
            .sort((a, b) => b.areaHectares - a.areaHectares);

        const coveragePercentage =
            polygonAreaHectares > 0 ? round((totalForestArea / polygonAreaHectares) * 100, 1) : 0;

        return {
            plotCount,
            totalForestArea,
            coveragePercentage,
            forestTypes: [...forestTypes],
            speciesDistribution,
        };
    }
}

function round(n: number, decimals = 2): number {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
}
