import { Resolver, Query, Args } from '@nestjs/graphql';
import { GeospatialService } from './geospatial.service';
import { ForestPlotsFilterInput } from './dto/geospatial.input';
import { ForestPlotType } from './dto/geospatial.types';

@Resolver()
export class GeospatialResolver {
    constructor(private geoService: GeospatialService) {}

    @Query(() => [String])
    async regions(): Promise<string[]> {
        return this.geoService.getRegions();
    }

    @Query(() => [String])
    async departements(
        @Args('regionCode') regionCode: string,
    ): Promise<string[]> {
        return this.geoService.getDepartements(regionCode);
    }

    @Query(() => [String])
    async communes(
        @Args('departementCode') departementCode: string,
    ): Promise<string[]> {
        return this.geoService.getCommunes(departementCode);
    }

    @Query(() => [String])
    async lieuxDits(
        @Args('communeCode') communeCode: string,
    ): Promise<string[]> {
        return this.geoService.getLieuxDits(communeCode);
    }

    @Query(() => [ForestPlotType])
    async forestPlots(
        @Args('filters', { nullable: true }) filters: ForestPlotsFilterInput,
    ): Promise<ForestPlotType[]> {
        return this.geoService.getForestPlots(filters || {});
    }
}