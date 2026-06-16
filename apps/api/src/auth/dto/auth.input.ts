import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

@InputType()
export class RegisterInput {
    @Field()
    @IsEmail()
    email!: string;

    @Field()
    @IsString()
    @MinLength(6)
    password!: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    firstName?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    lastName?: string;
}

@InputType()
export class LoginInput {
    @Field()
    @IsEmail()
    email!: string;

    @Field()
    @IsString()
    password!: string;
}