import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { GeoJSONScalar } from '../../geospatial/dto/geospatial.types';

@InputType()
export class SavePolygonInput {
    @Field()
    @IsString()
    @IsNotEmpty()
    name!: string;

    /** GeoJSON geometry from the draw tool (Polygon/MultiPolygon, SRID 4326). */
    @Field(() => GeoJSONScalar)
    @IsObject()
    geometry!: object;
}
