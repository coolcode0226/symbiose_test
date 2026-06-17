# Codebase reading notes — Forest BD Viewer

Running notes from reading the code cold, organized around three questions:
the **main user flow**, the **data model**, and the **seams** between web / GraphQL / API.
Every entry cites `file:line`. Findings are tagged: 🐞 broken, 🟠 risk/smell, 💀 dead code,
🧩 mismatch, ✅ done well.

---

## 1. Main user flow

Intended flow: **login → load map → filter / view forest data → draw polygon → analyze → save workspace.**
Most of that flow is wired in the UI but breaks (or no-ops) at one seam or another.

### Auth bootstrap — the app never leaves the loading screen
- 🐞 **Infinite "Loading map…".** `page.tsx` resolves auth through
  `useQuery(ME_QUERY, { onCompleted, onError })`, but the project is on Apollo Client v4, which
  dropped both callbacks from `useQuery`. Neither fires → `setAuth`/`logout` never run →
  `authStore.isLoading` (starts `true`) never flips → the redirect guard
  `!isLoading && !isAuthenticated && !meLoading` can never be true. A fresh visit sits on the
  spinner forever instead of bouncing to `/auth`. Tiny bug, makes the whole app unusable.
  Fix: drive `isLoading` off the `me` query result (e.g. a `useEffect` keyed on `meLoading`).
- 🟠 **Residual risk (even once the above is fixed):** `isLoading` lives in the *persisted* zustand store
  (`store/authStore.ts:26-32`, `persist({name:'auth-storage'})`). The whole state object is
  persisted, including `isLoading: true` and `isAuthenticated`. On rehydration the app trusts a
  stale `isAuthenticated` from localStorage before `me` confirms it. Persisting transient flags
  (`isLoading`) and trusting `isAuthenticated` from disk is a latent auth-flicker / false-positive
  bug. Should use a `partialize` to persist only `token` (and arguably nothing else).
- 🟠 `ME_QUERY` runs on every load even with no token; server `me` is guarded so it errors. The
  effect ignores the error path and treats "no data" as logout — works, but only by luck of
  ordering.

### Filter → map: the link doesn't exist
- 🐞 **Selecting an administrative area does not change what's on the map.** `FilterPanel`
  writes `regionCode/departementCode/communeCode/lieuDit` into `mapStore`
  (`FilterPanel.tsx:77-107`), and the cascading dropdowns query the API for child codes. But
  **nothing consumes `filters` to re-render the map.** The forest data on screen is WMS raster
  tiles (`ForestMap.tsx:226-244`), which are not filtered by admin code at all. So the headline
  "filter by administrative area" only does a hardcoded `flyTo` for the 3 hardcoded regions
  (`FilterPanel.tsx:72-75`, `ForestMap.tsx:307-314`); picking a real region/dept/commune updates
  state and dropdowns but the map shows the same tiles.
- 🧩 The dropdown for "Other Regions" feeds raw codes from `regions` query, but the Department
  select is gated on `!REGIONS.find(...)` (`FilterPanel.tsx:161`) — i.e. it only appears for
  non-hardcoded regions, so the two region sources behave inconsistently.

### `forestPlots` GraphQL query is dead on the frontend
- 💀 `GET_FOREST_PLOTS` and `ANALYZE_POLYGON` are defined in `graphql/geospatial.ts:27-55` but
  **never imported anywhere** (grep: only the definition file references them). The entire
  `forestPlots` resolver path (`geospatial.resolver.ts:36`, `geospatial.service.ts:54-90`) is
  unused by the product as wired.
- This reframes the "forestPlots won't scale / send viewport bounds" concern: it's real if/when
  the query is *used*, but today it's dead code. The actual data-loading path is WMS tiles, whose
  scaling story (zoom-banded layers `wmsLayers.ts:16-72`) is separate. Worth deciding: wire it up
  *or* delete it — right now it's misleading.

### Draw → analyze → save: broken end-to-end (no backend)
- 🐞 The whole polygon feature has **no API implementation.** `schema.gql` (Mutation block
  `schema.gql:64-69`) has only `login/logout/register/updateMapState`. There is **no**
  `savePolygon / myPolygons / deletePolygon / reanalyzePolygon / analyzePolygon` resolver — grep
  across `apps/api/src` finds zero references. So `SAVE_POLYGON_MUTATION`, `GET_MY_POLYGONS`,
  `DELETE_POLYGON_MUTATION` (used in `ForestMap.tsx:88-90,283`, `SavedPolygonsList.tsx:18-25`) all
  fail against the schema.
- 🧩 `UserPolygon` entity exists (`packages/database/.../user-polygon.entity.ts`) but is **not**
  in `app.module.ts`'s `entities: [User, ForestPlot]` (`app.module.ts:25`), and is **not**
  exported via a relation (`user.entity.ts:43-44` `@OneToMany` is commented out). So even the
  table won't be created by `synchronize`.
- 🧩 Frontend asks for `analysisResults.coveragePercentage`
  (`polygons.ts:16,40,69`, rendered `PolygonResultsPanel.tsx:50,103`) but the entity's
  `analysisResults` jsonb shape (`user-polygon.entity.ts:26-36`) has no `coveragePercentage`.
- 🧩 Geometry-type mismatch waiting to happen: Mapbox Draw emits a **Polygon**
  (`ForestMap.tsx:135` `e.features[0].geometry`), the entity column is **MultiPolygon**
  (`user-polygon.entity.ts:20`). A future resolver will need `ST_Multi()` / `ST_GeomFromGeoJSON`.

### Workspace persistence (save map state) — silently broken
- 🐞 On every `moveend`, `ForestMap` calls `updateMapState` with an `input` that includes
  **`activeLayers`** (`ForestMap.tsx:153-161`). But `MapStateInput` (`map-state.input.ts:23-41`
  and `schema.gql:57`) has **no `activeLayers` field**. GraphQL will reject the variable
  ("field not defined by type MapStateInput") → mutation errors every time → `.catch(console.error)`
  swallows it (`ForestMap.tsx:165`). **Map view/filter persistence never actually saves.**
- 🐞 **Restore-on-login is half-wired.** `me`/`login` return `lastFilters`
  (`auth.ts:26-32,44-47`) and `ForestMap` restores `lastLng/lastLat/lastZoom`
  (`ForestMap.tsx:96-98`), but **`lastFilters` is never pushed into `mapStore`** — persisted
  filters are fetched and dropped. So even if save worked, filters wouldn't restore.
- 🟠 The `moveend` closure captures `filters` and `wmsLayers` from first render
  (`ForestMap.tsx:159-160`); the init effect only re-runs on `user?.id` (`ForestMap.tsx:192`).
  Stale-closure: persisted filters/layers would lag behind UI even once the mutation is fixed.

### Cadastre toggle — dead control
- 💀 The "Cadastre" button flips `showCadastre` in the store (`ForestMap.tsx:497`,
  `mapStore.ts:36`), but **nothing reads `showCadastre`** to show/hide the cadastre WMS layer
  (grep confirms no consumer). The cadastre layer sits `visible:false` in `wmsLayers.ts:62-71`
  and is never toggled. Button does nothing.

---

## 2. Data model

Entities in `packages/database/src/entities`: `User`, `ForestPlot`, `UserPolygon`. Geometry is
PostGIS `MultiPolygon` SRID 4326 throughout — consistent. ✅

### Spatial indexing
- 🟠 `forest_plots.geom` has **no GiST index** anywhere — not declared on the entity
  (`forest-plot.entity.ts:23-28`, no `@Index`), and `scripts.sql` only indexes `user_polygons`
  (`scripts.sql:59`). The `bounds`/`ST_Intersects` filter (`geospatial.service.ts:81-86`) will
  table-scan. (Low impact *today* because the query is unused — see §1 — but it's a trap.)
- 🟠 The admin-code indexes are **commented out** (`forest-plot.entity.ts:4-6`). The dropdown
  lookups do `SELECT DISTINCT code_region/departement/commune …` (`geospatial.service.ts:14-52`)
  — full scans on every dropdown open, no covering index.

### `scripts.sql` is not runnable / has drifted
- 🐞 `scripts.sql` creates `forest_plots` with `GEOMETRY(MultiPolygon,4326)` at line 1–11,
  **before** `CREATE EXTENSION postgis` at line 29. Will fail on a clean DB.
- 🐞 It defines `public.users` **twice** (`scripts.sql:13-25` and `:32-44`) with two different
  UUID defaults (`gen_random_uuid()` vs `uuid_generate_v4()`). Second `CREATE TABLE` errors.
- 🟠 CLAUDE.md calls `scripts.sql` "canonical schema," but the real path is `synchronize:true` +
  `docker/init-db.sql` (which only enables extensions — `init-db.sql:1-4`). docker-compose even
  documents that scripts.sql isn't clean-runnable (`docker-compose.yml:18-20`). So the "canonical"
  file is actually stale/broken — schema truth lives in the entities. No migrations anywhere →
  entities and SQL can drift with nothing to catch it.

### Schema-lifecycle risk
- 🟠 `synchronize: process.env.NODE_ENV === 'development'` (`app.module.ts:26`) + docker setting
  `NODE_ENV=development` (`docker-compose.yml:33`) means the containerized "prod-ish" run mutates
  schema from entities on boot. Fine for the exercise, dangerous as a pattern.

---

## 3. Seams (web ↔ GraphQL ↔ API)

### Apollo v4 typing papered over
- 🟠 ~a dozen `@ts-ignore` in the web app, concentrated at Apollo result access
  (`page.tsx:16,24`, `ForestMap.tsx:174,292,318,322`, `FilterPanel.tsx:111-113` triple-stacked).
  These hide the fact that `useQuery` results are typed `unknown`/loosely — no generated types
  from the schema (no codegen). A field rename would not be caught at compile time. This is how the
  `coveragePercentage` / `activeLayers` mismatches survive.

### Two-channel split (GraphQL + WMS proxy) ✅ but hardcoded
- ✅ The GraphQL-for-data / WMS-for-tiles split is sensible, and GeoServer is proxied via Next
  rewrite (`next.config.ts:3-8`) so the browser never hits it directly (CORS-free).
- 🟠 The proxy target is a hardcoded `http://janazapro.com:8080` (`next.config.ts:6`) — not env
  driven, plaintext http, and `next.config.ts` is written as `module.exports = {}` (CommonJS) in a
  `.ts` file with no `NextConfig` typing.
- 🟠 WMS layer name `cummune` is a deliberate typo to match the server (`wmsLayers.ts:42`) — fine,
  but only known from a comment; brittle.

### API hardening gaps
- 🟠 CORS hardcoded to `http://localhost:3000` (`main.ts:8-11`); GraphQL `playground` &
  `introspection` unconditionally on (`app.module.ts:33-34`).
- 🟠 `forestPlots` resolver has **no `@UseGuards(GqlAuthGuard)`** (`geospatial.resolver.ts:36`) —
  unauthenticated, uncapped except `limit(10000)` (`geospatial.service.ts:88`). The dropdown
  queries are also unguarded. (`me`/`updateMapState` *are* guarded — `users.resolver.ts:15,21`.)
- ✅ JWT strategy re-loads the user from DB each request and `ignoreExpiration:false`
  (`jwt.strategy.ts:16-28`) — a deleted/changed user can't ride a valid token.
- 🟠 JWT stored in `localStorage` (`authStore.ts:35`, `apollo-client.ts:9`) → XSS = token theft.
  Client-only logout (`authStore.ts:39-42`); there's a `logout` mutation in the schema
  (`schema.gql:66`) but the client just clears localStorage and `window.location.href`s
  (`ForestMap.tsx:382-385`). No server-side invalidation. No rate-limit/throttle on `login`.

### Tests / safety net
- 🟠 Only the two Nest boilerplate specs exist (`app.controller.spec.ts`, `app.e2e-spec.ts`).
  Nothing covers auth, geospatial, or any component. Every bug above is invisible to CI.

---

## Quick triage (my read on what matters most)

1. **Workspace persistence is silently broken** (`activeLayers` not in `MapStateInput`, plus
   `lastFilters` never restored). High-value, low-effort, hits the core "save your workspace" promise.
   This is a clean Part-2 "end-to-end inconsistency" target.
2. **Polygon feature has no backend** — biggest functional hole, but biggest effort (new module,
   resolver, service, entity registration, geometry coercion, `coveragePercentage`).
3. **Filter → map data link is missing / `forestPlots` is dead.** Decide the product story: either
   drive WMS/tiles by viewport+filter and wire `forestPlots` with a `bounds` filter + GiST index +
   auth guard, or delete the dead query. Good Part-2 "geospatial loading strategy" target.
4. Cleanups: kill the dead Cadastre toggle or wire it; `partialize` the auth store; add schema
   codegen to retire the `@ts-ignore` wall; fix or delete `scripts.sql`.

### Candidate service boundary (Part 3)
The **polygon analysis** domain is the natural extraction: drawn geometry → spatial analysis
(plot count, species distribution, coverage %) is a self-contained, CPU/PostGIS-bound contract with
a clear input (GeoJSON polygon) and output (analysis result). It's also the part that's *not built
yet*, so building it behind a service-client interface from day one is the lowest-friction way to
satisfy "credible path to a real microservice." Alternative: the admin-area lookup
(`regions/departements/communes/lieuxDits`) is a clean read-only contract but lower value.
