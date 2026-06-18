import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { GraphQLScalarType, valueFromASTUntyped } from 'graphql';

export const GeoJSONScalar = new GraphQLScalarType({
    name: 'GeoJSON',
    description: 'GeoJSON geometry object',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    // Convert the literal AST into a plain JS value. The previous impl returned the raw AST node,
    // so inline-literal geometry args were unusable (only variables, via parseValue, worked).
    parseLiteral(ast, variables) {
        return valueFromASTUntyped(ast, variables ?? undefined);
    },
});

@ObjectType()
export class ForestPlotType {
    @Field()
    id!: string;

    @Field()
    codeRegion!: string;

    @Field()
    codeDepartement!: string;

    @Field()
    codeCommune!: string;

    @Field({ nullable: true })
    lieuDit?: string;

    @Field(() => GeoJSONScalar)
    geometry!: any;

    @Field(() => [String])
    essences!: string[];

    @Field(() => Float, { nullable: true })
    surfaceHectares?: number;

    @Field({ nullable: true })
    typeForet?: string;
}