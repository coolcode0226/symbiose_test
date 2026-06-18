/**
 * Synthetic forest_plots seed.
 *
 * The real IGN BD Forêt shapefiles under data/bd-foret/raw are empty (0 bytes), so the
 * DB-backed queries (regions, dropdown cascades, forestPlots) return nothing out of the box.
 * This inserts a small, realistic set of plots over three French regions so the filter
 * cascade and viewport/bounds queries are demonstrable.
 *
 * Idempotent: clears rows with id LIKE 'seed-%' and re-inserts. Assumes the schema already
 * exists (TypeORM `synchronize` creates forest_plots when the API boots).
 *
 * Run:  npm run seed --workspace=api          (locally, with apps/api/.env)
 *       docker compose exec api npm run seed   (against the Docker stack)
 */
import { Client } from 'pg';

type SeedPlot = {
    id: string;
    codeRegion: string;
    codeDepartement: string;
    codeCommune: string;
    lieuDit: string;
    essences: string[];
    surfaceHectares: number;
    typeForet: string;
    lng: number;
    lat: number;
    sizeDeg: number;
};

// A square polygon (closed ring) around a center point, as WKT.
function squareWkt(lng: number, lat: number, size: number): string {
    const h = size / 2;
    const ring = [
        [lng - h, lat - h],
        [lng + h, lat - h],
        [lng + h, lat + h],
        [lng - h, lat + h],
        [lng - h, lat - h],
    ]
        .map(([x, y]) => `${x} ${y}`)
        .join(', ');
    return `POLYGON((${ring}))`;
}

// Three regions, each with a couple of departments/communes, clustered near real city centers.
const PLOTS: SeedPlot[] = [
    // Normandie (region 28) — Calvados (14), near Caen / Lisieux
    { id: 'seed-28-01', codeRegion: '28', codeDepartement: '14', codeCommune: '14118', lieuDit: 'Bois de Caen', essences: ['Chêne', 'Hêtre'], surfaceHectares: 12.4, typeForet: 'Forêt fermée de feuillus', lng: 0.36, lat: 49.18, sizeDeg: 0.02 },
    { id: 'seed-28-02', codeRegion: '28', codeDepartement: '14', codeCommune: '14118', lieuDit: 'Bois de Caen', essences: ['Chêne'], surfaceHectares: 7.1, typeForet: 'Forêt fermée de feuillus', lng: 0.40, lat: 49.20, sizeDeg: 0.015 },
    { id: 'seed-28-03', codeRegion: '28', codeDepartement: '14', codeCommune: '14654', lieuDit: 'Forêt de Lisieux', essences: ['Hêtre', 'Frêne', 'Charme'], surfaceHectares: 21.8, typeForet: 'Forêt fermée de feuillus', lng: 0.23, lat: 49.14, sizeDeg: 0.025 },
    { id: 'seed-28-04', codeRegion: '28', codeDepartement: '61', codeCommune: '61001', lieuDit: 'Forêt d’Écouves', essences: ['Pin sylvestre', 'Épicéa commun'], surfaceHectares: 33.0, typeForet: 'Forêt fermée de conifères', lng: 0.07, lat: 48.55, sizeDeg: 0.03 },

    // Centre-Val de Loire (region 24) — Loiret (45), near Orléans
    { id: 'seed-24-01', codeRegion: '24', codeDepartement: '45', codeCommune: '45234', lieuDit: 'Forêt d’Orléans', essences: ['Pin sylvestre', 'Chêne'], surfaceHectares: 45.6, typeForet: 'Forêt fermée mixte', lng: 2.10, lat: 47.98, sizeDeg: 0.035 },
    { id: 'seed-24-02', codeRegion: '24', codeDepartement: '45', codeCommune: '45234', lieuDit: 'Forêt d’Orléans', essences: ['Pin sylvestre'], surfaceHectares: 28.3, typeForet: 'Forêt fermée de conifères', lng: 2.16, lat: 48.01, sizeDeg: 0.03 },
    { id: 'seed-24-03', codeRegion: '24', codeDepartement: '45', codeCommune: '45285', lieuDit: 'Les Bordes', essences: ['Chêne', 'Charme'], surfaceHectares: 9.7, typeForet: 'Forêt fermée de feuillus', lng: 2.42, lat: 47.83, sizeDeg: 0.018 },
    { id: 'seed-24-04', codeRegion: '24', codeDepartement: '18', codeCommune: '18033', lieuDit: 'Forêt de Bourges', essences: ['Chêne', 'Châtaignier'], surfaceHectares: 17.2, typeForet: 'Forêt fermée de feuillus', lng: 2.40, lat: 47.08, sizeDeg: 0.022 },

    // Pays de la Loire (region 52) — Loire-Atlantique (44), near Nantes
    { id: 'seed-52-01', codeRegion: '52', codeDepartement: '44', codeCommune: '44109', lieuDit: 'Forêt du Gâvre', essences: ['Chêne', 'Hêtre', 'Pin maritime'], surfaceHectares: 38.9, typeForet: 'Forêt fermée mixte', lng: -1.74, lat: 47.49, sizeDeg: 0.03 },
    { id: 'seed-52-02', codeRegion: '52', codeDepartement: '44', codeCommune: '44109', lieuDit: 'Forêt du Gâvre', essences: ['Pin maritime'], surfaceHectares: 14.5, typeForet: 'Forêt fermée de conifères', lng: -1.70, lat: 47.52, sizeDeg: 0.02 },
    { id: 'seed-52-03', codeRegion: '52', codeDepartement: '44', codeCommune: '44020', lieuDit: 'Bois de la Chabossière', essences: ['Chêne', 'Châtaignier', 'Douglas'], surfaceHectares: 11.0, typeForet: 'Forêt fermée mixte', lng: -1.65, lat: 47.28, sizeDeg: 0.017 },
    { id: 'seed-52-04', codeRegion: '52', codeDepartement: '49', codeCommune: '49007', lieuDit: 'Forêt de Longuenée', essences: ['Chêne', 'Frêne'], surfaceHectares: 19.6, typeForet: 'Forêt fermée de feuillus', lng: -0.65, lat: 47.55, sizeDeg: 0.024 },

    // Larger "massif" patches — visible at region zoom and easy to draw over for a demo.
    { id: 'seed-28-05', codeRegion: '28', codeDepartement: '14', codeCommune: '14118', lieuDit: 'Massif de Caen', essences: ['Chêne', 'Hêtre', 'Frêne'], surfaceHectares: 120.0, typeForet: 'Forêt fermée de feuillus', lng: 0.30, lat: 49.05, sizeDeg: 0.07 },
    { id: 'seed-24-05', codeRegion: '24', codeDepartement: '45', codeCommune: '45234', lieuDit: "Massif d'Orléans", essences: ['Pin sylvestre', 'Chêne', 'Châtaignier'], surfaceHectares: 160.0, typeForet: 'Forêt fermée mixte', lng: 2.25, lat: 47.92, sizeDeg: 0.08 },
    { id: 'seed-52-05', codeRegion: '52', codeDepartement: '44', codeCommune: '44109', lieuDit: 'Massif du Gâvre', essences: ['Pin maritime', 'Chêne', 'Douglas'], surfaceHectares: 140.0, typeForet: 'Forêt fermée mixte', lng: -1.72, lat: 47.50, sizeDeg: 0.075 },
];

async function main(): Promise<void> {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'forest_bd_viewer',
    });

    await client.connect();
    try {
        await client.query(`DELETE FROM forest_plots WHERE id LIKE 'seed-%'`);

        for (const p of PLOTS) {
            await client.query(
                `INSERT INTO forest_plots
                   (id, code_region, code_departement, code_commune, lieu_dit, geom, essences, surface_hectares, type_foret)
                 VALUES
                   ($1, $2, $3, $4, $5,
                    ST_Multi(ST_SetSRID(ST_GeomFromText($6), 4326)),
                    $7::varchar[], $8, $9)`,
                [
                    p.id,
                    p.codeRegion,
                    p.codeDepartement,
                    p.codeCommune,
                    p.lieuDit,
                    squareWkt(p.lng, p.lat, p.sizeDeg),
                    p.essences,
                    p.surfaceHectares,
                    p.typeForet,
                ],
            );
        }

        const { rows } = await client.query(`SELECT count(*)::int AS n FROM forest_plots WHERE id LIKE 'seed-%'`);
        console.log(`✅ Seeded ${rows[0].n} forest plots across regions 24, 28, 52.`);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
