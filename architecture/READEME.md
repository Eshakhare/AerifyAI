# Aerify AI architecture handoff


This handoff reflects the decisions made through **10 October 2026**, including the demo-core scope tiers, the task execution order, the route-entity change set and reviewer gaps B1–B8.


Aerify AI's Delhi demo uses a hybrid evidence model: real historical bus/station PM observations, regional weather and satellite context, nearby industrial/source geography and deterministic synthetic local/post-action data. All records preserve provenance, time, spatial support and units. Synthetic scenario projections stay separate from future evaluations based on observed pre/post data.


Raw source cadence is preserved. The demo derives one-minute operational records, 15/30/60-minute comparison windows, configurable 100–500 m road segments, 2–3 km cells and district summaries. A single mobile pass is not presented as a persistent hotspot.


The public UI drills from Delhi's official districts to 2–3 km analysis cells and then measured roads. It also provides a permission-based Near You card with separate nearest road observation, nearest station, regional model fallback and nearby-city AQI. Missing or stale coverage is shown directly.


Water suppression on the Palam–Dwarka corridor is the proposed flagship scenario, with Anand Vihar ISBT among the other actions; the flagship is confirmed at Gate 1 against the per-zone anchor-overlap table of verified IIT Delhi anchors. Routes are versioned entities like zones: real IIT Delhi trace groups and the generator's 6–8 synthetic corridors co-planned with the 12 action zones so every zone sits on a route. PM2.5 and PM10 are required impact metrics; PM1 is supplemental. PM0.3 particle count, CO2, HCHO and TVOC are optional and require a valid source or independent documented generator. Weather is regional model context. Satellite and facility layers show possible nearby-source context and cannot prove that a factory caused a street reading. Video/images illustrate the scene and do not measure AQI or verify impact.


Actions record start, completion and Mark Done times. Event-time evaluations run at completion, +1 h, +3 h, +6 h and +12 h by default for water suppression, with catch-up for late reporting. The 30-day synthetic demo uses paired with/without-action branches and an injectable clock. AQI is derived from concentrations; PM-only results are never labelled regulatory CPCB AQI.


Action/reference geometry is immutable and versioned. Every action freezes its reference selection, windows, thresholds and method before start. The demo road pipeline uses a pinned Geofabrik/OpenStreetMap snapshot, self-hosted OSRM Match and versioned 250 m maximum segments. Overlapping actions and declared rain/wind/traffic conditions trigger automatic policy outcomes. One server-owned clock drives API, worker, UI freshness and caches.


Google Cloud SQL for PostgreSQL with the PostGIS extension is the only operational database and Cloud Storage holds immutable raw payloads. There is no Docker or locally installed PostgreSQL/PostGIS database. Development, CI and demo use isolated Cloud SQL databases/roles, reached by Cloud Run or the Cloud SQL Python Connector with IAM authentication. BigQuery is an optional asynchronous analytics/SQL-native AI mirror; it is not required for the map request path and LLM output never determines AQI or impact results.


## How this repository is used


The architecture in `docs/architecture.md` is the team's shared base, kept in the repo so implementation can branch from it. It defines workstreams, tasks, gates and their execution order — not who does what: anyone may pick up any task, and parallel work follows the dependency graph, not a person roster. When implementation reality requires a change in schema or plan, the change is raised against the architecture with a bumped architecture revision (and a bumped `schema_version` when DTOs change); UI and API work then revises only what the merged change names. This keeps parallel work from breaking other work. See "Architecture and contract change management" in `docs/architecture.md`.


## Reading order


| Read in order | Purpose |
| --- | --- |
| `docs/data-and-schema-decisions.md` | Accepted evidence, generation, map and result rules; open decisions. |
| `contracts/domain.schema.json` | Draft shared DTOs for observed, modeled, synthetic and derived records. |
| `data/sources/manifest.example.json` | Source inventory, access and validation status. |
| `contracts/fixtures/observation.synthetic.json` | Schema-valid synthetic mobile PM10 measurement using event/processing time and provenance 0.5. |
| `contracts/fixtures/camera-event.synthetic.json` | Restricted illustrative-media event; explicitly excluded from AQI and impact verification. |
| `contracts/fixtures/public-intervention.synthetic.json` | Public water-suppression response with three timestamps and separate synthetic projections/observed evaluations. |
| `contracts/fixtures/action-overlap.synthetic.json` | Required overlapping-action case that excludes contaminated bins and becomes inconclusive. |
| `docs/architecture.md` | Scope tiers, task execution order, change management, data fusion, scenario engine, maps, APIs, services and AI boundaries. |
| `docs/role-prompts.md` | Paste-ready task instructions for the four workstreams; task-based, not person-based. |
| `docs/pricing.md` | Deployment estimates and cost controls. |


## Contract precedence


1. Accepted decisions in `docs/data-and-schema-decisions.md`.
2. Accepted JSON Schema and generated OpenAPI.
3. `docs/architecture.md`.
4. Workstream prompts and implementation details.


The schema is `0.8` (additive geometry transport over `0.7-draft`). Do not promote it to `1.0` until the exact action/reference geometry, current feed access, aggregation freshness/coverage rules, CPCB calculation version and production observed-evaluation policy are accepted. Every schema change must update fixtures, backend models/OpenAPI, generated TypeScript and both consumers together, per the change-management section of `docs/architecture.md`.


All files under `contracts/fixtures/` are executable examples, not additional sources of truth. Validate each against its matching `$defs` entry before backend/frontend integration. Synthetic fixtures must keep their permanent synthetic provenance and public disclaimer.




