import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber } from 'class-validator';

@InputType()
export class BoundsInput {
    @Field(() => Float)
    @IsNumber()
    minLng!: number;

    @Field(() => Float)
    @IsNumber()
    minLat!: number;

    @Field(() => Float)
    @IsNumber()
    maxLng!: number;

    @Field(() => Float)
    @IsNumber()
    maxLat!: number;
}

@InputType()
export class ForestPlotsFilterInput {
    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    regionCode?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    departementCode?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    communeCode?: string;

    @Field({ nullable: true })
    @IsString()
    @IsOptional()
    lieuDit?: string;

    @Field(() => BoundsInput, { nullable: true })
    @IsOptional()
    bounds?: BoundsInput;
}