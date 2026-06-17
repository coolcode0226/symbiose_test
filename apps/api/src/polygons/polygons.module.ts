import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForestPlot, UserPolygon } from '@forest/database';
import { PolygonsResolver } from './polygons.resolver';
import { PolygonsService } from './polygons.service';
import { POLYGON_ANALYZER } from './analysis/analysis.contract';
import { PostgisAnalyzer } from './analysis/postgis-analyzer.service';

@Module({
    imports: [TypeOrmModule.forFeature([UserPolygon, ForestPlot])],
    providers: [
        PolygonsResolver,
        PolygonsService,
        // Bind the analysis boundary to its in-process PostGIS implementation. To extract analysis
        // into a separate service later, swap this for a client that implements PolygonAnalyzer.
        { provide: POLYGON_ANALYZER, useClass: PostgisAnalyzer },
    ],
})
export class PolygonsModule {}
