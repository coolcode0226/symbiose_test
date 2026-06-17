import { ObjectType, Field, Float, Int, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { GeoJSONScalar } from '../../geospatial/dto/geospatial.types';

@ObjectType()
export class SpeciesDistributionType {
    @Field()
    species!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field(() => Float)
    percentage!: number;
}

@ObjectType()
export class AnalysisResultsType {
    @Field(() => Int, { nullable: true })
    plotCount?: number;

    @Field(() => Float, { nullable: true })
    totalForestArea?: number;

    @Field(() => Float, { nullable: true })
    coveragePercentage?: number;

    @Field(() => [String], { nullable: true })
    forestTypes?: string[];

    @Field(() => [SpeciesDistributionType], { nullable: true })
    speciesDistribution?: SpeciesDistributionType[];
}

@ObjectType()
export class SavedPolygonType {
    @Field(() => ID)
    id!: string;

    @Field()
    name!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field()
    status!: string;

    @Field(() => GraphQLISODateTime)
    createdAt!: Date;

    @Field(() => GeoJSONScalar, { nullable: true })
    geometry?: any;

    @Field(() => AnalysisResultsType, { nullable: true })
    analysisResults?: AnalysisResultsType | null;
}
