import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@forest/database';
import { PolygonsService } from './polygons.service';
import { SavedPolygonType } from './dto/polygon.types';
import { SavePolygonInput } from './dto/polygon.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => SavedPolygonType)
@UseGuards(GqlAuthGuard)
export class PolygonsResolver {
    constructor(private readonly polygonsService: PolygonsService) {}

    @Query(() => [SavedPolygonType])
    async myPolygons(@CurrentUser() user: User): Promise<SavedPolygonType[]> {
        return this.polygonsService.findAll(user.id) as unknown as SavedPolygonType[];
    }

    @Mutation(() => SavedPolygonType)
    async savePolygon(
        @CurrentUser() user: User,
        @Args('input') input: SavePolygonInput,
    ): Promise<SavedPolygonType> {
        return this.polygonsService.save(user.id, input.name, input.geometry) as unknown as SavedPolygonType;
    }

    @Mutation(() => Boolean)
    async deletePolygon(
        @CurrentUser() user: User,
        @Args('polygonId') polygonId: string,
    ): Promise<boolean> {
        return this.polygonsService.delete(user.id, polygonId);
    }

    @Mutation(() => SavedPolygonType)
    async reanalyzePolygon(
        @CurrentUser() user: User,
        @Args('polygonId') polygonId: string,
    ): Promise<SavedPolygonType> {
        return this.polygonsService.reanalyze(user.id, polygonId) as unknown as SavedPolygonType;
    }
}
