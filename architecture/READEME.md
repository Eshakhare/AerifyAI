# Aerify AI architecture handoff (Revision 0.11)


**Architecture Version:** `0.11` | **Schema Version:** `0.9` — Updated **18 October 2026** (incorporates Google Maps Platform integration, Near You permission query, Municipal Action Center Cloud SQL persistence & checkpoint timeline, clean Google Auth, and Gemini 2.5 summary ID purge with industrial factor analysis).


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
| `contracts/fixtures/location-context.synthetic.json` | `LocationContext` with weather, regional model and satellite `Measurement` rows carrying `ContextDescriptor`. |
| `contracts/fixtures/scenario-run.synthetic.json` | `ScenarioRun` for catalog case S02 with catalog, zone, plan and route lineage. |
| `contracts/fixtures/scenario-projection.confounded.synthetic.json` | Rain-confounded projection with structured `ConfounderFinding` records. |
| `contracts/fixtures/zone-catalog.synthetic.json` | `ZoneSummary[]` for the 12 candidate action zones; all `UNVERIFIED` before Gate 1. |
| `contracts/fixtures/zone-version.palam-dwarka.placeholder.json` | Coarse placeholder geometry for the proposed flagship; never loaded into Cloud SQL. |
| `contracts/fixtures/session.officer.synthetic.json` | `SessionInfo` for an officer. |
| `data/legends/legend-bands.v1.json` | Server-owned legend band sets behind `MapAggregate.category`. |
| `data/scenarios/scenario-catalog.v1.json` | The accepted 12 scenario cases (generator input). |
| `contracts/tools/validate_contracts.py` | Executable contract gate for all of the above. |
| `docs/architecture.md` | Scope tiers, task execution order, change management, data fusion, scenario engine, maps, APIs, services and AI boundaries. |
| `docs/CHANGES.md` | Consolidated record of all user-driven enhancements, refactorings, and architectural migrations across versions. |
| `docs/role-prompts.md` | Paste-ready task instructions for the four workstreams; task-based, not person-based. |
| `docs/pricing.md` | Deployment estimates and cost controls. |


## Contract precedence


1. Accepted decisions in `docs/data-and-schema-decisions.md`.
2. Accepted JSON Schema and generated OpenAPI.
3. `docs/architecture.md`.
4. Workstream prompts and implementation details.


The schema is `0.9` (context descriptors, structured confounders, scenario-catalog fields, legend bands, zone summaries and session roles over `0.8`; `confounders` items, `MapAggregate.category` and `ScenarioRun.clock_mode` changed meaning, see the revision history in `docs/architecture.md`). Do not promote it to `1.0` until the exact action/reference geometry, current feed access, aggregation freshness/coverage rules, CPCB calculation version and production observed-evaluation policy are accepted. Every schema change must update fixtures, backend models/OpenAPI, generated TypeScript and both consumers together, per the change-management section of `docs/architecture.md`. Run `python architecture/contracts/tools/validate_contracts.py` (needs `jsonschema`) before every contract change; it validates all fixtures, the legend sets, the scenario catalog, geometry hashes and the schema's negative guards.


All files under `contracts/fixtures/` are executable examples, not additional sources of truth. Validate each against its matching `$defs` entry before backend/frontend integration. Synthetic fixtures must keep their permanent synthetic provenance and public disclaimer.


## Architecture version history

> **Team rule:** Whenever anyone on the team makes any change to the architecture or contracts, always bump the version by `+1` (for example, `0.9` → `0.10`) across the architecture docs/schema and add a new row at the bottom of this table listing the changes in short, simple bullet points.

| Version | Changes |
| --- | --- |
| **0.8** | - Architecture created |
| **0.9** | - Added weather and satellite context metadata (`ContextDescriptor`) and `/v1/public/locations/{id}/context` endpoint<br>- Changed `confounders` from plain text to structured objects (`ConfounderFinding`)<br>- Added fixed 12-scenario catalog (`S01`–`S12` in `scenario-catalog.v1.json`)<br>- Kept user roles (`PUBLIC`, `OFFICER`, `SUPERVISOR`) in Cloud SQL `app_users` (Firebase Auth for sign-in only) and added `/v1/me`<br>- Moved map category and AQI/PM threshold bands to the server (`legend-bands.v1.json` and `/v1/public/legends`)<br>- Added zone summary endpoint (`/v1/public/zones`), Palam–Dwarka placeholder fixture, and canonical `sha256:` geometry hash rule<br>- Pinned Vertex AI to **`gemini-2.5-flash-lite`** via Cloud Run service account (no API key) with billing spend cap and daily call limits<br>- Added `validate_contracts.py` to check all schemas, fixtures, legends, and scenarios |
| **0.10** | - Added Government Clean Air Actions & Directives Registry to public/officer outcomes experience with Pre vs Post AQI comparisons<br>- Added live civic status widgets for Delhi Odd-Even Vehicle Rationing Scheme (plate rules, fine, hours) and Delhi 24x7 Green War Room / AI Command Center<br>- Added stable scientific notice states for unmeasured actions (data gaps) and weather-confounded events (rain scavenging)<br>- Formatted 3-tier action badges (`VERIFIED_IMPACT`, `CONFOUNDED`, `UNMEASURED`, `POLICY_ACTIVE`, `CIVIC_INFRASTRUCTURE`)<br>- Decomposed Vertex AI GenAI layer into 3 specialized, cached narrative agents: `aerify-hotspot-agent`, `aerify-simulation-agent`, and `aerify-audit-agent` |
| **0.11** | - Integrated Google Maps Platform (`@vis.gl/react-google-maps`) with dynamic multi-layer styling, satellite/terrain view, and 11 Delhi administrative districts GeoJSON overlay.<br>- Added Near You location permission query (`navigator.permissions.query`) with silent auto-load on refresh when granted, plus localStorage fallback caching.<br>- Reorganized portal into 3 core pillars (Air Quality Dashboard, Govt Actions & Impact, Municipal Action Center) and retired redundant action simulations menu.<br>- Enabled Cloud SQL database persistence for municipal operations (`actions` table) with interactive `[Mark as Done]` status transitions and automated +3h, +6h, +12h, +24h checkpoint timeline measurement scheduling.<br>- Purged internal database IDs and technical enum constants from Gemini 2.5 Flash-Lite executive narratives; added upwind/downwind industrial/transit factor analysis within 1km/3km radii.<br>- Streamlined authentication with standard Firebase "Login with Google" button and removed municipal directory credentials list. |
