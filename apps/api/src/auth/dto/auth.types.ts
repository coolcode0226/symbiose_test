import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '@forest/database';
import { UserModel } from "../../users/models/user.model";

@ObjectType()
export class AuthPayload {
    @Field()
    token!: string;

    @Field(() => UserModel)
    user!: UserModel;
}