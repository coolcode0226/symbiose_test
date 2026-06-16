import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@forest/database';
import { UsersService } from './users.service';
import { MapStateInput } from './dto/map-state.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {UserModel} from "./models/user.model";

@Resolver(() => UserModel)
export class UsersResolver {
    constructor(private usersService: UsersService) {}

    @Query(() => UserModel)
    @UseGuards(GqlAuthGuard)
    async me(@CurrentUser() user: User): Promise<UserModel> {
        return user as unknown as UserModel;
    }

    @Mutation(() => UserModel)
    @UseGuards(GqlAuthGuard)
    async updateMapState(
        @CurrentUser() user: User,
        @Args('input') input: MapStateInput,
    ): Promise<UserModel> {
        return this.usersService.updateMapState(user.id, input) as unknown as UserModel;
    }
}