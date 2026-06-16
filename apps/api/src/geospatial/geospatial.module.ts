import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForestPlot } from '@forest/database';
import { GeospatialService } from './geospatial.service';
import { GeospatialResolver } from './geospatial.resolver';

@Module({
    imports: [TypeOrmModule.forFeature([ForestPlot])],
    providers: [GeospatialService, GeospatialResolver],
    exports: [GeospatialService],
})
export class GeospatialModule {}