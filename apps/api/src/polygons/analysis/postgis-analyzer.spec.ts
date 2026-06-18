import { PostgisAnalyzer } from './postgis-analyzer.service';

// The analyzer's value is the JS aggregation it does on the intersection rows; the SQL itself is
// thin. So we mock the repository's `query` and assert the aggregation maths.
describe('PostgisAnalyzer', () => {
    const makeAnalyzer = (rows: unknown[]) => {
        const repo = { query: jest.fn().mockResolvedValue(rows) } as any;
        return new PostgisAnalyzer(repo);
    };

    it('aggregates intersecting plots into count, area, coverage, species and forest types', async () => {
        const analyzer = makeAnalyzer([
            { typeForet: 'Forêt fermée de feuillus', essences: ['Chêne', 'Hêtre'], interHa: '10' },
            { typeForet: 'Forêt fermée de conifères', essences: ['Pin maritime'], interHa: '5' },
            { typeForet: 'Forêt fermée de feuillus', essences: ['Chêne'], interHa: '5' },
        ]);

        const result = await analyzer.analyze({ type: 'Polygon', coordinates: [] }, 100);

        expect(result.plotCount).toBe(3);
        expect(result.totalForestArea).toBe(20);
        expect(result.coveragePercentage).toBe(20); // 20 ha of 100 ha
        expect(result.forestTypes).toEqual(['Forêt fermée de feuillus', 'Forêt fermée de conifères']);

        // Plot area is split equally across its listed species:
        // Chêne = 5 (plot1) + 5 (plot3) = 10; Hêtre = 5; Pin maritime = 5.
        const byName = Object.fromEntries(result.speciesDistribution.map((s) => [s.species, s]));
        expect(byName['Chêne'].areaHectares).toBe(10);
        expect(byName['Chêne'].percentage).toBe(50);
        expect(byName['Hêtre'].areaHectares).toBe(5);
        expect(byName['Pin maritime'].areaHectares).toBe(5);
        // Sorted by area descending.
        expect(result.speciesDistribution[0].species).toBe('Chêne');
    });

    it('returns zeros when the polygon intersects no plots', async () => {
        const analyzer = makeAnalyzer([]);
        const result = await analyzer.analyze({ type: 'Polygon', coordinates: [] }, 50);

        expect(result.plotCount).toBe(0);
        expect(result.totalForestArea).toBe(0);
        expect(result.coveragePercentage).toBe(0);
        expect(result.speciesDistribution).toEqual([]);
        expect(result.forestTypes).toEqual([]);
    });

    it('guards against a zero-area polygon (no divide-by-zero)', async () => {
        const analyzer = makeAnalyzer([{ typeForet: 'x', essences: ['Chêne'], interHa: '5' }]);
        const result = await analyzer.analyze({}, 0);

        expect(result.coveragePercentage).toBe(0);
        expect(result.totalForestArea).toBe(5);
    });
});
