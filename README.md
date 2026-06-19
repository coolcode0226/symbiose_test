# Forest BD Viewer

A geospatial full-stack app for browsing French **BD Forêt** (IGN forest inventory) data on an
interactive map, drawing polygons over areas of interest, and getting a spatial analysis (forest
plots, species distribution, coverage) for the drawn region.

**Stack:** Next.js 16 + React 19 (web) · NestJS 11 + code-first GraphQL (api) · PostgreSQL/PostGIS ·
Turborepo monorepo · Docker.

This README is the submission for the take-home: setup, what changed, the bounded service extraction,
trade-offs, and what's left. The full **Part 1 technical review** is in
[`technical-review.md`](./technical-review.md) (detailed line-cited notes in
[`review-notes.md`](./review-notes.md)).

---

## Setup

### Prerequisites
- Docker + Docker Compose
- A **Mapbox public token** (`pk.…`) for the map tiles

### Run
```bash
# 1. Put your Mapbox token in a root .env file:
echo 'NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here' > .env

# 2. Bring up the stack (PostGIS + API + web)
docker compose up --build        # or: docker compose up -d

# 3. Seed synthetic forest data (after the API is up — it creates the tables on boot)
docker compose exec api npm run seed --workspace=api
```

- **Web:** http://localhost:3000  ·  **GraphQL:** http://localhost:4000/graphql
- Register a user on the auth screen, then explore.
- To see a non-zero polygon analysis, navigate to a seeded region (e.g. **Pays de la Loire** via the
  region selector), draw a polygon over the **green "analyzable forest" plots**, and save.

```bash
docker compose down              # stop  (add -v to also wipe the DB volume)
```

### Notes
- The DB is bound to **`127.0.0.1:5432`** with a non-default password.
- TypeORM `synchronize` creates the schema on boot in dev; `docker/init-db.sql` enables the PostGIS
  extensions. The seed is idempotent (re-run any time).
- Dev gotcha: file-watching across the Docker bind mount doesn't always fire on this setup — after
  editing `apps/*/src`, `docker compose restart api` (or `web`) to pick up changes.

---

## What I changed

Ordered to land foundations first. Each maps to an exercise requirement.

1. **Data layer + seed (enabling).** Registered the `UserPolygon` entity (its table wasn't being
   created), added a **GiST index** on `forest_plots.geom` and btree indexes on the admin codes, and
   added an idempotent **synthetic seed** (`apps/api/scripts/seed.ts`) since the provided IGN
   shapefiles were empty. Fixed a latent bug where `forestPlots` returned all-`null` rows (raw-query
   alias mismatch).

2. **Part 2.1 — fixed broken end-to-end flows.** The app was stuck on an infinite "Loading map…"
   spinner (relied on Apollo v4–removed `useQuery` callbacks); and **workspace persistence silently
   failed** because the client sent an `activeLayers` field absent from `MapStateInput`, so
   `updateMapState` 400'd on every map move.

3. **Part 2.2 — geospatial loading/filtering.** Wired the previously-dead `forestPlots` query into the
   map, **scoped to the viewport** (`bounds` envelope → loads only in-view plots, on the GiST index),
   and rendered the DB plots as a visible "analyzable forest" layer so users can see and draw over
   exactly what the analysis measures. Also **decoupled the GeoJSON overlays from the slow remote WMS
   tiles**: both the saved-polygon and forest-plot layers were gated behind `map.isStyleLoaded()`,
   which returns `false` while *any* source (including the remote raster tiles) is still loading — so
   a user's own DB data only appeared after WMS finished. Removed the gate (callers already guarantee
   the style is loaded via the `load`/`style.load` events); local data now paints immediately.

4. **Part 2.3 — persisted workspace/user-state.** Persist & restore map view, filters, and active
   layers (`lastActiveLayers` added end-to-end); restore on login; `partialize`d the auth store to
   persist only the token (transient `isLoading`/`isAuthenticated` are re-derived from `me`); fixed a
   stale-closure in the `moveend` handler so persisted state reflects the live UI.

5. **Part 2.4 — code quality.** Removed dead/misleading code (the no-op Cadastre toggle + its missing
   server layer, the orphaned admin-area filter cascade, an unused `ANALYZE_POLYGON` doc, `mock-data`,
   stale `@ts-ignore`s), and fixed the buggy `GeoJSONScalar.parseLiteral`.

6. **Part 3 — service-boundary extraction** (see below): the polygon-analysis domain, which also
   completed the previously-backendless draw → analyze → save → list/delete feature.

7. **Tests** (`apps/api`, Jest): the analysis aggregation, the auth flow, and the polygons service —
   4 suites, 12 tests. Run `docker compose exec api npm run test --workspace=api`.

8. **Apollo Server 4 → 5 (deps).** Bumped the api to `@apollo/server@^5` to clear the `@nestjs/apollo@13`
   peer conflict. A bump alone doesn't suffice — `@nestjs/apollo` drags in a v4 copy via the deprecated
   graphql-playground plugin — so a root `overrides: { "@apollo/server": "^5.0.0" }` forces a single v5
   (API verified booting on it). Also made the Dockerfile's `package-lock.json` COPY a glob so a clean
   clone (the lockfile is gitignored) still builds.

---

## Part 3 — bounded service extraction: polygon analysis

**Boundary chosen.** The **polygon-analysis** domain — turning a drawn GeoJSON polygon into a spatial
result (plot count, total forest area, coverage %, species distribution, forest types).

**Why.** It's the most self-contained, compute-heavy, and independently-evolvable piece of the product:
pure data in (a GeoJSON geometry) → pure data out (an analysis object). It's exactly the kind of work
that, at scale, you'd push onto its own service/worker pool. It was also unbuilt, so I could design the
seam cleanly from the start instead of retrofitting it.

**How it's implemented (Option A — service-ready boundary).** Consumers depend only on a contract, not
an implementation:
- `apps/api/src/polygons/analysis/analysis.contract.ts` — the `PolygonAnalyzer` interface +
  `POLYGON_ANALYZER` DI token and the result types.
- `PostgisAnalyzer` is the in-process implementation (PostGIS `ST_Intersects`/`ST_Intersection`/
  `ST_Area` against `forest_plots`), bound via `{ provide: POLYGON_ANALYZER, useClass: PostgisAnalyzer }`.
- `PolygonsService`/`PolygonsResolver` inject `POLYGON_ANALYZER` and never reference PostGIS or SQL.

**Coupling it reduces.** The polygons domain (persistence, GraphQL, auth) is fully decoupled from *how*
analysis is computed. The contract is deliberately serializable (GeoJSON in, plain object out), so the
implementation can move out of process with **no change to consumers**.

**Path to a real microservice.** Swap `PostgisAnalyzer` for an `HttpAnalyzerClient` (or gRPC) that
implements the same `PolygonAnalyzer` interface and calls a standalone analysis service. Only the
module's provider binding changes; resolver, service, and tests stay identical. The result types
already double as a wire contract.

**What stays coupled (deliberately).** The analyzer still reads the **same `forest_plots` table** as the
rest of the app (shared DB). A fuller extraction would give the analysis service its own data access
(a read replica or its own ingest of the forest inventory). Polygon **persistence** (`UserPolygon`)
stays in the main app — only the *analysis* is the boundary, not storage.

---

## Trade-offs & simplifications

- **Synthetic seed instead of real IGN data — the one gap I want to call out plainly.** The map and the
  analysis read from **two different sources**. What you *see* (the green forest tiles, everywhere) is
  streamed from a **remote GeoServer (WMS)** and is never in our DB. What we *analyze* is only the
  **synthetic seed** in `forest_plots` (the provided shapefiles were 0 bytes). So **what you see ≠ what
  you analyze**: drawing over WMS-only tiles returns 0, and analysis is meaningful only over the seeded
  patches. This is deliberate scoping, not an oversight — the seam is clean (analyzer untouched), and the
  fix is purely a data step (next section), not a code change.
- **`synchronize` kept for dev; no migrations.** Faster to iterate; flagged as a known risk.
- **Region selector is navigation-only.** After removing the broken admin-area cascade, it focuses the
  map on a region; it does not yet filter the data (left as a deliberate, documented scope cut).
- **`@ts-ignore` in the web app reduced, not eliminated.** Fully removing them wants GraphQL codegen.
- **Analysis attributes a plot's intersected area equally across its listed species** — a reasonable
  approximation given BD Forêt's multi-essence plots.

## What's unfinished / next in production

- **Close the see-vs-analyze gap: ingest the WFS into PostGIS.** The single highest-leverage next step.
  Pull the BD Forêt features from the same GeoServer over **WFS** (`GetFeature`, GeoJSON/4326) into
  `forest_plots`, so the analyzable layer *is* what the map shows. The analyzer never changes — only the
  data source does. (Scoped out here as a small risk: it depends on the external GeoServer being up at
  ingest time.)
- **Migrations** (drop `synchronize`), and make `packages/database/scripts.sql` clean-runnable.
- **GraphQL codegen** to type Apollo results and retire the remaining `@ts-ignore`s.
- **Auth hardening**: move the JWT out of `localStorage`, server-side session invalidation, login
  throttling.
- **Config hardening**: env-driven CORS + GeoServer proxy target, disable GraphQL introspection in prod.
- **Broader tests + CI**, including an e2e against a real PostGIS instance.
- **Wire the filter to actually scope data** (region → `forestPlots`/analysis), unifying region codes.

---

## Time spent

~**2 days** of focused work.
