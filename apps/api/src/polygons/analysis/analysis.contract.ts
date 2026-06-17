/**
 * Polygon-analysis service boundary (Part 3).
 *
 * This is the contract between the polygons domain and whatever computes the spatial analysis.
 * Consumers (PolygonsService) depend only on the `PolygonAnalyzer` interface via the
 * `POLYGON_ANALYZER` DI token — never on a concrete PostGIS/SQL implementation. That keeps the
 * boundary swappable: today it's an in-process PostGIS analyzer; tomorrow it can become an HTTP/gRPC
 * client to a standalone analysis microservice with no change to consumers.
 *
 * The contract is intentionally pure data in / pure data out (GeoJSON + a domain result object),
 * so it serializes cleanly across a process boundary.
 */

/** Share of one tree species within the analyzed area. */
export interface SpeciesShare {
    species: string;
    areaHectares: number;
    /** Percentage of the total forest area (0–100). */
    percentage: number;
}

/** Result of analyzing a drawn polygon against the forest inventory. */
export interface PolygonAnalysis {
    plotCount: number;
    /** Total forest area intersecting the polygon, in hectares. */
    totalForestArea: number;
    /** Forest area as a percentage of the polygon's own area (0–100). */
    coveragePercentage: number;
    forestTypes: string[];
    speciesDistribution: SpeciesShare[];
}

export interface PolygonAnalyzer {
    /**
     * @param geometry GeoJSON Polygon/MultiPolygon geometry (SRID 4326).
     * @param polygonAreaHectares Total area of the drawn polygon, used for coverage %.
     */
    analyze(geometry: object, polygonAreaHectares: number): Promise<PolygonAnalysis>;
}

/** DI token consumers inject instead of a concrete class. */
export const POLYGON_ANALYZER = 'POLYGON_ANALYZER';
