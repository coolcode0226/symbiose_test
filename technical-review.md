# Part 1 — Technical Review of the Existing Codebase

These are my notes from reading the project as I first cloned it, before changing anything. I had
a 1–3 day budget in mind, so I spent the reading time figuring out where that time is best spent
rather than listing every nit. The detailed, line-cited version is in
[`review-notes.md`](./review-notes.md); this is the summary.

Forest BD Viewer is a Next.js 16 / NestJS 11 / PostGIS monorepo for browsing French BD Forêt data
on a map, drawing polygons, and getting a spatial breakdown of the drawn area. The bones are good.
This isn't a project that needs rescuing — it needs finishing and hardening. Almost everything I
flagged is either "half-wired" or "fine on localhost, breaks anywhere else," which is pretty much
what inheriting a real codebase feels like.

---

## What it already does well

A few things the author got right that are easy to get wrong:

- **The workspace split holds up.** Turborepo with `apps/web`, `apps/api`, and a shared
  `packages/database` for the TypeORM entities. The API imports entities by the `@forest/database`
  package name instead of reaching across the repo with relative paths, so the data model has one
  obvious home. Build ordering (`dependsOn: ["^build"]`) is correct too.
- **PostGIS is done properly.** Geometry is consistently `MultiPolygon` / SRID 4326, the bounds
  filter uses `ST_Intersects` + `ST_MakeEnvelope`, and results come back as GeoJSON via
  `ST_AsGeoJSON`. The spatial SQL looks raw but it's built through parameterized QueryBuilder
  calls, so there's no injection hole hiding in there.
- **The JWT strategy gets the non-obvious parts right.** `ignoreExpiration: false`, and it
  re-loads the user from the DB on every request instead of trusting whatever's in the token. So a
  deleted or changed user can't keep riding a still-valid token.
- **GeoServer is proxied, not exposed.** It sits behind a Next rewrite (`/geoserver/*`), so the
  browser never hits the upstream directly and tile/feature-info CORS is a non-issue. With GraphQL
  handling data and auth, that two-channel split is a sensible fit for a map app and I'd keep it.

---

## The weaknesses and risks I found

**The app never gets past its loading screen.** This is the first thing I hit, and it's the worst,
because everything else is stuck behind it. `page.tsx` resolves auth through
`useQuery(ME_QUERY, { onCompleted, onError })`, but the project is on Apollo Client v4, which
dropped those two callbacks from `useQuery`. So neither one fires, `setAuth`/`logout` are never
called, and `authStore.isLoading` (which starts `true`) never flips. The redirect guard
`!isLoading && !isAuthenticated && !meLoading` can therefore never be true, and a fresh visit just
sits on "Loading map…" forever instead of bouncing to `/auth`. Tiny bug, but it makes the whole app
unusable, so it's the first thing I'd fix.

**There's no forest data, and no way to load it.** Every BD Forêt shapefile under
`data/bd-foret/raw/` is 0 bytes, and there's no seed or loader script anywhere. So `forest_plots`
is empty: the DB-backed queries (`regions`, `forestPlots`, the dropdown cascades) return nothing,
and the forest you see on the map is actually coming from the *remote* GeoServer
(`janazapro.com:8080`), not the local database. Until there's data, nothing DB-geospatial can be
built or shown — which makes a seed script essentially a prerequisite for the rest of the work.

**The headline polygon feature is only half-built.** The web app already imports and calls
`savePolygon`, `myPolygons`, `deletePolygon`, and `reanalyzePolygon`, but there's no polygons
module on the API side — `schema.gql` exposes only `login/logout/register/updateMapState`. The
`UserPolygon` entity exists in `packages/database` but isn't in the `entities: [User, ForestPlot]`
array in `app.module.ts`, so its table isn't even created. The frontend also asks for
`analysisResults.coveragePercentage`, which doesn't exist on the entity, and Mapbox Draw hands back
a `Polygon` while the column is `MultiPolygon`. So the whole draw → analyze → save loop throws end
to end, even though the UI makes it look finished. Judging by how much of the frontend is built
around it, this is clearly meant to be the point of the product.

**Saving the workspace silently fails.** On every `moveend` the map calls `updateMapState` with an
`activeLayers` field that isn't part of `MapStateInput`, so GraphQL rejects the variable and the
error gets swallowed by `.catch(console.error)`. Map state never actually saves. And restore is
only half-wired anyway: `me`/`login` return `lastFilters`, but it's never written back into the
store, so even a working save wouldn't bring the filters back on the next login.

**The filter doesn't actually filter the map.** Picking a region/department/commune updates state
and drives the cascading dropdowns, but nothing consumes those filters to re-render the map — the
WMS tiles aren't scoped by admin code at all. The obvious place for viewport/bounds scoping, the
`forestPlots` GraphQL query, is dead code on the frontend: it's defined but imported nowhere. So
the map's main "filter by administrative area" promise is mostly cosmetic today.

**The data layer isn't indexed or guarded.** There's no GiST index on `forest_plots.geom`, and the
admin-code indexes are commented out on the entity, so the `SELECT DISTINCT` dropdown lookups
table-scan. `forestPlots` (and the dropdown queries) sit outside the auth guard, and `forestPlots`
is uncapped apart from an arbitrary `limit(10000)`.

**A handful of "fine on localhost, not deployable" things.** `scripts.sql` doesn't run cleanly —
it uses `geometry` before `CREATE EXTENSION postgis` and defines `users` twice — and has drifted
from the entities, with no migrations to catch the drift; `synchronize` is on in the Docker image
via `NODE_ENV=development`. CORS is hardcoded to `localhost:3000`, the WMS proxy target is a
hardcoded plaintext-http host, and GraphQL `introspection`/`playground` are always on. The JWT
lives in `localStorage` (so an XSS becomes account takeover) and logout is client-only. There are
~a dozen `@ts-ignore`s in the web app papering over Apollo v4's untyped `useQuery` results — which
is exactly how the `coveragePercentage` and `activeLayers` mismatches slipped through. And the only
tests are the two Nest boilerplate specs, so nothing would catch a regression.

---

## Top 3 to address first

1. **The loading bug.** Best return on effort by a mile. A few lines, but until the `me` query
   actually drives `isLoading`, the app never even shows the login form and nothing else is
   testable by hand. So it goes first.
2. **Seed data + a usable data layer.** Without forest data, nothing geospatial can be demonstrated.
   A small synthetic `forest_plots` seed (a few MultiPolygons over France with
   `essences`/`surface_hectares`) plus the GiST index unblocks the filtering and analysis work and
   covers the "seed scripts required to run the project" deliverable.
3. **The polygon feature, end-to-end.** Register `UserPolygon`, add the polygons module
   (resolver + service), reconcile the `coveragePercentage` field, and coerce `Polygon → MultiPolygon`.
   It's the reason the product exists and it's broken from draw to save. It's also the cleanest
   candidate for the Part 3 service boundary (polygon analysis), so one body of work serves both.

   *Close behind:* fixing workspace persistence (the `activeLayers` mismatch + restoring
   `lastFilters` on login) — small, high-confidence, and it directly repairs the "save your
   workspace" promise.

---

## What I'd intentionally leave alone, and why

- **Loading the real IGN BD Forêt dataset.** Sourcing the real shapefiles and writing a
  `shp2pgsql`/`ogr2ogr` import, with LAMB93 → 4326 reprojection on large files, is heavy and off
  the critical path. A small synthetic seed makes the whole flow demonstrable for a fraction of the
  effort; real-data loading I'd document as a next step.
- **A full migration system / rewriting `scripts.sql`.** It's the right long-term move, but doing
  it properly (baseline migration, tested up and down, dropping `synchronize`) is fiddly and easy
  to half-do. In this window I'd rather flag it as a known risk and keep `synchronize` for dev than
  ship a shaky migration setup.
- **Deeper security hardening** — moving the JWT out of `localStorage`, server-side session
  invalidation, login throttling, env-driven CORS, turning off introspection in prod. All real
  production concerns, but they don't change the product behavior this exercise is about, so I'd
  note them rather than chase them.
- **Breaking up `ForestMap.tsx` (515 lines).** Lots of churn, little the user can see, and it's a
  moving target while the polygon feature is being finished. Better to refactor once that settles.
- **Broad test coverage + CI.** I'd write targeted tests for the auth flow and the new polygons
  resolver, not chase coverage across the whole codebase.
- **The full `@ts-ignore` / Apollo typing cleanup.** Cosmetic next to the functional gaps above. I'd
  fix the root cause where it pays off and leave the rest.
