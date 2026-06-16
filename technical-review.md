# Technical Review — Forest BD Viewer

*Notes from reading the codebase as I first cloned it, before changing anything. I was working to a ~2–3 day budget, so I spent the time figuring out where it's best spent rather than listing every nit.*

## First impressions

It's a Next.js 16 / NestJS 11 / PostGIS monorepo for browsing French BD Forêt data on a map, drawing polygons, and getting a spatial breakdown of the drawn area. The bones are good. This isn't a project that needs rescuing, it needs finishing and hardening. Almost everything I flagged is either "half-wired" or "fine in dev, breaks anywhere else," which is pretty much what inheriting a real codebase feels like.

## What it does well

A few things the author got right that are easy to get wrong:

- **The workspace split holds up.** Turborepo with `apps/web`, `apps/api`, and a shared `packages/database` for the TypeORM entities. The API imports entities by the `@forest/database` package name instead of reaching across the repo with relative paths, so the data model has one obvious home. Build ordering (`dependsOn: ["^build"]`) is correct too.
- **PostGIS is done properly.** Geometry is consistently `MultiPolygon` / SRID 4326, the bounds filter uses `ST_Intersects` + `ST_MakeEnvelope`, and results come back as GeoJSON via `ST_AsGeoJSON`. The spatial SQL looks raw but it's built through parameterized QueryBuilder calls, so there's no injection hole hiding in there.
- **The JWT strategy gets the non-obvious parts right.** `ignoreExpiration: false`, and it re-loads the user from the DB on every request instead of trusting whatever's in the token. So a deleted or changed user can't keep riding a still-valid token.
- **GeoServer is proxied, not exposed.** It sits behind a Next rewrite (`/geoserver/*`), so the browser never hits the upstream directly and tile/feature-info CORS is a non-issue. With GraphQL handling data and auth, that two-channel split is a sensible fit for a map app and I'd keep it.

## Weaknesses and risks

**The headline feature is only half-built.** The web app already imports and calls `savePolygon`, `myPolygons`, `deletePolygon`, and `reanalyzePolygon` (`apps/web/src/graphql/polygons.ts`, used in `ForestMap.tsx`), but there's no polygons module on the API side. No resolver, no service. The `UserPolygon` entity exists in `packages/database` but isn't in the `entities: [User, ForestPlot]` array in `app.module.ts`, so it's not even part of the connection. And the frontend queries ask for `analysisResults.coveragePercentage`, which doesn't exist as a field anywhere. The whole draw → analyze → save loop throws end to end, even though the UI makes it look finished. Judging by how much of the frontend is built around it, this is clearly meant to be the point of the product.

**The app couldn't get past its loading screen.** `page.tsx` resolved auth through `useQuery(ME_QUERY, { onCompleted, onError })`. But the project is on Apollo Client v4, which dropped those two callbacks from `useQuery`. So neither one ever fired, `setAuth`/`logout` were never called, and `authStore.isLoading` (which starts at `true`) never flipped. The redirect guard `!isLoading && !isAuthenticated && !meLoading` could therefore never be true, and a fresh visit just sat on "Loading map…" forever instead of bouncing to `/auth`. Tiny bug, but it made the whole app unusable.

**There's no real schema lifecycle.** Dev relies on `synchronize: true`, which quietly rewrites the database to match the entities. That's fine until two branches disagree about a column. The non-dev path is `packages/database/scripts.sql`, and that file doesn't run cleanly: it creates `forest_plots` with the `GEOMETRY` type before it runs `CREATE EXTENSION postgis`, and it defines the `users` table twice with two different UUID defaults (`gen_random_uuid()` once, `uuid_generate_v4()` the other). No migrations anywhere, so the entities and the SQL can drift apart and nothing will tell you.

**The main map query won't scale.** Nothing it filters on is indexed. The `@Index` decorators for `code_region` / `code_departement` / `code_commune` are commented out on the entity, and `forest_plots.geom` has no GiST index at all (`scripts.sql` only indexes `user_polygons`). The service *does* take a `bounds` envelope filter, but the frontend never sends one, so instead of fetching the plots in view it pulls everything matching the admin-area filters, capped at an arbitrary `limit(10000)`, and ships full geometries as GeoJSON in one unpaginated, unsimplified response. The query also isn't behind the auth guard. Heavy to parse and render on the client, and cheap to abuse on the server.

A handful of smaller things in the same "fine on localhost, not deployable" bucket: CORS is hardcoded to `http://localhost:3000` in `main.ts`, the GeoServer proxy target is a hardcoded `http://` host in `next.config.ts`, and GraphQL `playground`/`introspection` are on unconditionally. The JWT lives in `localStorage`, so any injected script can read it and an XSS becomes account takeover; logout is client-only, so the token stays valid until it expires; and there's no throttling on `login`.

On the safety-net side, the only tests are the two Nest boilerplate specs, so there's nothing covering auth, the geospatial queries, or any component to catch a regression. `ForestMap.tsx` has grown to 515 lines and will be awkward to change safely, and there are ~13 `@ts-ignore`s in the web app (plus a few `as unknown as` / `geom!: any` at the API seams), mostly papering over Apollo v4 result typing.

## Top 3 to address first

1. **The auth/loading bootstrap bug.** Best return on effort by a mile. A few lines, but until the `me` query actually drives `isLoading` the app never even shows the login form, and nothing else is testable by hand until it's fixed. So it goes first.
2. **The polygons feature.** Register `UserPolygon`, add the polygons module (resolver + service), and reconcile the `coveragePercentage` field between the entity's analysis results and what the frontend asks for. It's the reason the product exists and it's broken end to end.
3. **The data layer under the map: index it, scope it, guard it.** Add the GiST index on `forest_plots.geom` (and the commented-out admin-code indexes), have the frontend send the viewport `bounds` the API already accepts so it only fetches what's on screen, and put `forestPlots` behind the auth guard with a sane cap. I'd also add one test for the auth flow and one for a geospatial query here, so the work above lands on top of at least some coverage.

## What I'm intentionally not fixing, and why

- **A full migration system / rewriting `scripts.sql`.** It's the right long-term move, but doing it properly (baseline migration, tested up and down, dropping `synchronize`) is fiddly and easy to half-do. In this window I'd rather flag it as a known risk and keep `synchronize` for dev than ship a shaky migration setup.
- **Breaking up `ForestMap.tsx`.** Lots of churn, little the user can see, and it's a moving target while the polygon feature is being finished. Better to refactor once that settles.
- **Broad test coverage + CI.** I'll write targeted tests for the auth flow and the new polygons resolver, not chase coverage across the whole codebase.
- **The `@ts-ignore` / Apollo typing cleanup.** Cosmetic next to the functional gaps above, so it can wait.
