# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Forest BD Viewer is a web app for browsing French BD Forêt (IGN forest inventory)
data on an interactive map, drawing polygons over areas of interest, and getting a
spatial analysis (forest plots, species distribution, area) for the drawn region.
The "BD Forêt" name comes from the IGN shapefile dataset stored under `data/bd-foret/`.

## Monorepo layout

Turborepo + npm workspaces. Three workspaces:

- `apps/web` — Next.js 16 (App Router) + React 19 frontend. Map UI, auth, drawing.
- `apps/api` — NestJS 11 GraphQL (code-first, Apollo) backend.
- `packages/database` — `@forest/database`: shared TypeORM entities, consumed by the API.

`apps/api` imports entities via the `@forest/database` package name (not relative paths).
When you change an entity, the API depends on the package's compiled output / TS resolution —
keep `packages/database/src/index.ts` exports in sync.

## Commands

Run from the repo root (turbo fans out to all workspaces):

```bash
npm run dev      # turbo: web (next dev, :3000) + api (nest --watch, :4000)
npm run build    # turbo build (respects ^build dependency order)
npm run lint     # turbo lint
```

Per-workspace (cd into `apps/api`, `apps/web`, or `packages/database`):

```bash
# apps/api
npm run start:dev          # nest watch mode
npm run test               # jest (unit, *.spec.ts under src/)
npm run test -- users      # run a single spec by name pattern
npm run test:watch
npm run test:e2e           # jest --config ./test/jest-e2e.json
npm run lint               # eslint --fix

# apps/web
npm run dev
npm run lint

# packages/database
npm run build              # tsc → dist/  (run after editing entities if API can't resolve them)
```

The API is the only workspace with tests (Jest via ts-jest).

## Environment

Both apps need `.env` files (see `.env.example` in each):

- `apps/api/.env` — `DATABASE_*` (PostgreSQL **with PostGIS**), `JWT_SECRET`, `JWT_EXPIRATION`, `PORT` (4000).
- `apps/web/.env` — `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/graphql`),
  `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_GEOSERVER_WORKSPACE` (default `prod`).

`apps/api/src/app.module.ts` sets `synchronize: true` only when `NODE_ENV=development`
(auto-creates tables). `packages/database/scripts.sql` is the canonical schema (incl. PostGIS
extensions and GIST index) for non-dev setup.

## Architecture

### Data flow
The frontend talks to the backend in **two** independent channels:

1. **GraphQL** (Apollo Client → NestJS Apollo) for auth, filter lookups, forest plot
   queries, and saved polygons. Token is read from `localStorage` and attached as a
   `Bearer` header by an Apollo auth link (`apps/web/src/lib/apollo-client.ts`).
2. **GeoServer WMS** for rendering map tiles and click-to-query feature info. The browser
   hits `/geoserver/*`, which `apps/web/next.config.ts` **rewrites/proxies** to the remote
   GeoServer. Layer definitions, zoom ranges, and tile URL builders live in
   `apps/web/src/services/wmsLayers.ts`; GetFeatureInfo logic (with manual EPSG:4326→3857
   conversion) in `apps/web/src/services/wmsFeatureInfo.ts`.

### Backend (NestJS, code-first GraphQL)
- Schema is generated to `apps/api/src/schema.gql` (`autoSchemaFile`). Do not hand-edit it.
- Modules: `auth` (JWT register/login via bcrypt + passport-jwt), `users` (the `me` query
  and `updateMapState` to persist a user's last map view/filters), `geospatial` (filter
  dropdown lookups + `forestPlots` query).
- `geospatial.service.ts` builds raw SQL via TypeORM QueryBuilder and returns geometry as
  GeoJSON using PostGIS `ST_AsGeoJSON`. The `forestPlots` query supports a `bounds` filter
  (`ST_Intersects` + `ST_MakeEnvelope`) and is capped at `limit(10000)`.
- Auth is enforced with `GqlAuthGuard` (`@UseGuards`) + the `@CurrentUser()` decorator,
  which pull the request out of the GraphQL execution context.

### Frontend (Next.js App Router)
- Single primary route `/` (the map) plus `/auth`. `apps/web/src/app/page.tsx` redirects to
  `/auth` when unauthenticated (auth state in a Zustand store, `store/authStore.ts`).
- `components/map/ForestMap.tsx` is the central component: initializes Mapbox GL, wires up
  Mapbox Draw, switches base layers, overlays WMS tiles, and orchestrates the side panels
  (`FilterPanel`, `LayerControlPanel`, `SavePolygonModal`, `PolygonResultsPanel`,
  `SavedPolygonsList`, `FeatureQueryPopup`).
- Client state is in Zustand (`store/mapStore.ts` for view/filters/cadastre toggle;
  `store/authStore.ts`). Map defaults center on France (lng 2.2137, lat 46.2276, zoom 5).
- GraphQL documents are grouped under `src/graphql/` (`auth.ts`, `geospatial.ts`, `polygons.ts`).

### Shared entities (`packages/database`)
`User`, `ForestPlot`, `UserPolygon`. Geometry columns are PostGIS `MultiPolygon` SRID 4326.
Entity column names are explicitly mapped (e.g. `name: 'geom'`) to match the SQL schema —
preserve these mappings when editing.

## Work in progress / gotchas

- **Saved-polygon feature is partially built.** The frontend already defines and uses
  `savePolygon`, `myPolygons`, `deletePolygon`, `reanalyzePolygon` GraphQL operations
  (`apps/web/src/graphql/polygons.ts`, used in `ForestMap.tsx`), but **the API has no
  polygons resolver/module yet** and `UserPolygon` is **not** registered in
  `app.module.ts`'s TypeORM `entities` array. Wiring this up is the active task (see recent
  commits about the draw tool). The frontend queries also reference a `coveragePercentage`
  field not yet present on the entity.
- WMS layer names contain known typos kept to match the live GeoServer (`commune` layer is
  named `cummune`). Don't "fix" these without confirming the server side.
- `synchronize: true` in dev will mutate the DB schema from entities — be careful adding
  entities to `app.module.ts` against a real database.
