import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

export const GeoJSONScalar = new GraphQLScalarType({
    name: 'GeoJSON',
    description: 'GeoJSON geometry object',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.OBJECT) {
            return ast;
        }
        return null;
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