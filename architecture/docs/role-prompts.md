# Aerify AI: workstream prompts with one contract


Use the shared instruction at the start of every AI Studio or Antigravity task. All workstreams use the same accepted decisions and `contracts/domain.schema.json` version.


The build is organized as four workstreams — frontend, data/geography, analysis/workflow, contract/platform — with a task execution order and gates in `docs/architecture.md` ("Task execution order"). These prompts are task-based, not person-based: anyone may execute a prompt from any workstream; the workstream only describes the tasks, not who does them. Do not make independent scope cuts between the demo core and optional extensions; quality, provenance, auditability and CI gates are never traded for time.


## Shared instruction


```text
You are contributing to Team Orions' Aerify AI repository. Read README.md, docs/data-and-schema-decisions.md, contracts/domain.schema.json, docs/architecture.md, the source manifest and relevant fixtures before editing. Report the schema version and starting commit. Precedence is accepted decisions > JSON Schema/OpenAPI > architecture > workstream prompt > generated UI.


Delhi is the first city. The demo combines observed historical bus/station PM, regional weather and satellite context, nearby-source geography and deterministic synthetic local/post-action records. Preserve origin, time, spatial support, units, source IDs and quality flags. Never backdate current context as historical observation. Never relabel synthetic data as observed. PM2.5 and PM10 are the required independent intervention metrics. PM1 is supplemental. PM0.3 is particle count with a documented count unit. CO2, HCHO and TVOC are optional and cannot be inferred directly from PM.


The public map drills from official Delhi districts to 2–3 km analysis cells and then measured roads. A cell with insufficient recent observations must say no recent data or show its modeled/synthetic origin; do not imply full road coverage. The Near You card separates nearest road observation, nearest official station, regional model fallback and nearby-city official AQI.


Preserve raw collection cadence. Derive one-minute operations, 15/30/60-minute windows and configurable 100–500 m road segments. A single pass is not a persistent hotspot. Expose evidence state separately from action-effect status. AQI is derived from concentrations; never call a PM-only indicator regulatory CPCB AQI.


Satellite and facility layers are possible source context only. A satellite pixel does not identify a factory or prove causation. Weather values retain model-grid resolution. Video/images retain their true capture time and never measure AQI or verify action/impact. No live Vision AI is in scope.


Synthetic pre/post data produces a scenario projection. Only eligible observed pre/post PM can produce an observed evaluation. Keep their DTOs, statuses and UI wording separate. Gemini explains typed evidence through read-only tools and cannot generate authoritative measurements, change action state or set results. Never silently change schemas. Update schema, fixtures, backend/OpenAPI, generated TypeScript and both consumers together. Do not commit credentials or restricted media.


Actions carry action_started_at, action_completed_at and marked_done_at. Evaluation anchors to completion/event time and supports catch-up checkpoints. Cloud Storage preserves immutable raw payloads; Google Cloud SQL for PostgreSQL/PostGIS is operational truth. BigQuery, if enabled, is an asynchronous analytical/AI mirror only. LLM output never computes AQI, evidence state or intervention effect.


Interventions reference immutable action/reference zone versions and a frozen pre-action evaluation plan. Completed-action corrections are supervisor-only, append-only and trigger superseding/recomputation. All services use the server ClockService; never accept client-selected scenario time. Road outputs retain OSM snapshot, segmentation and OSRM matching versions. Automatic overlap/confounder gates are policy-driven, not analyst-selected.
```


## Workstream 1 — frontend and public map


```text
Build the React + TypeScript + Vite UI against generated OpenAPI types and a FixtureApi/HttpApi adapter pair. Implement:


1. Delhi district overview using current official district polygons.
2. Metric selector for PM2.5, PM10 and official AQI; optional context layers remain separate.
3. District selection -> 2–3 km cells -> measured roads/areas.
4. Colour legend, accessible text categories, coverage/freshness/source badges and no-data state.
5. Permission-based Near You card with distinct nearest road observation, station AQI, regional fallback and nearby-city AQI.
6. Context drawer for weather, satellite and nearby possible sources with native resolution/time.
7. Scenario pages labelled Synthetic demonstration with lineage and projected result.
8. Separate future observed-evaluation page with qualified association wording.
9. Officer action flow for water suppression and Mark Done; video is contextual media only.
10. Completion/+1/+3/+6/+12 h action timeline with reference comparison and evidence state.
11. Zone catalog/geometry selector, draft/start/complete states, restricted media metadata and supervisor correction notice.


Do not calculate data values or result status in React. Do not use the removed Google Maps HeatmapLayer; use district polygons and deck.gl/custom grid or hex overlays. Run schema fixture validation, frontend build and browser flows for observed, modeled, synthetic, stale and no-data states.
```


## Workstream 2 — source ingestion, geography and generator


```text
Implement source adapters and the deterministic scenario engine.


- Import IIT Delhi PM1/PM2.5/PM10/GPS/time without changing its historical identity.
- Add candidate CPCB/DPCC station import with license and access notes.
- Add weather adapter for temperature, RH, precipitation, wind speed/direction; persist grid/resolution/model.
- Add selected Sentinel-5P/CAMS contextual adapter with footprint, acquisition time and quality flags.
- Add a licensed facility/industrial-land registry and 1 km/3 km spatial queries.
- Load official Delhi districts, analysis cells and road geometry into PostGIS.
- Build map aggregation with configurable freshness and coverage gates.
- Preserve raw cadence, create one-minute mobile series, 15/30/60-minute windows and configurable 100–500 m road aggregates with repeat-pass metadata.
- Import the pinned Geofabrik Northern Zone OSM snapshot, clip Delhi, run OSRM Match as a version-pinned Cloud Run job/service (not a required local container) and build `delhi_osm_250m_v1`; reject low-confidence/distant matches and preserve unmatched points.


The generator selects observed PM anchors, joins time-compatible context, generates missing action/reference local series, reproduces missingness/noise and creates paired WITHOUT_ACTION/WITH_ACTION water-suppression timelines. Produce the accepted 30-day, 4–6-bus, 6–8-route profile and 12 action cases, with corridors from the joint route/action-zone plan and `route_version_ids` in every run's lineage. Store seed, generator version, config hash, anchors, context IDs, route versions, generated metrics and assumptions. Enforce PM1 <= PM2.5 <= PM10 for generated mass records. Generate PM0.3/CO2/HCHO/TVOC only if a separate documented model is configured; otherwise leave absent. Test reproducibility, units, time alignment, provenance and aggregation coverage.


One of the three confounded/inconclusive cases must contain spatiotemporally overlapping actions and contaminated reference bins.
```


## Workstream 3 — interventions, analysis and AI workflows


```text
Implement deterministic hotspots, scenario projections and later observed evaluations. Compute each zone's display wording from the per-zone anchor-overlap table: with verified anchors use the anchored synthetic label; with none, use the fully-synthetic label and suppress observation-grade fallback wording for that zone.


Store action_started_at, action_completed_at, marked_done_at and timezone. Anchor evaluation to completion. Schedule water-suppression checkpoints at completion/+1/+3/+6/+12 h, optional +24 h, and immediately catch up already-due checkpoints after late reporting. Use an injected clock for tests. Scenario projections accept synthetic records and use simulated_* statuses. Observed evaluations reject synthetic core PM and use observed_improvement_association/no_measurable_change/confounded/inconclusive. Never convert a scenario projection into an observed evaluation.


Create and freeze the evaluation plan before action start. Implement `water_suppression_demo_policy_v1` exactly: coverage/bin gates, rain/wind/traffic triggers and action-overlap contamination. Do not fit weather-adjusted coefficients for the demo. Implement server-owned REAL/SCENARIO/TEST time for API, scheduler, freshness and cache namespaces. Implement supervisor corrections as new revisions that supersede and recompute affected results.


Keep AQI, video and satellite context out of the short-window PM effect calculation. Store pollutant-specific samples, independent bins, source counts, interval, threshold/method version, confounders and limitations. Implement bounded Gemini/ADK explanations through validated read-only tools for hotspot evidence, weather, satellite, possible sources, scenario lineage and computed results. Reject unsupported causal/factory claims and any numeric output inconsistent with tools. Provide deterministic fallback text. Test both pollutants, sparse data, rain/wind confounding, invalid reference, idempotency and result versioning.
```


## Workstream 4 — contract, platform and integration


```text
Own the single contract and deployed integration. Keep FastAPI as the only operational API, Google Cloud SQL for PostgreSQL with PostGIS as the only operational database, immutable raw payloads in Cloud Storage, Firebase Auth for officers, Cloud Tasks -> private Cloud Run worker, Secret Manager for third-party keys and workload identity for Google Cloud. Do not create a Docker/local PostgreSQL database.


Treat BigQuery as an optional asynchronous analytical/AI mirror. If enabled, partition by event date, cluster by source/device/geography and use SQL-native AI only for batch, reviewable enrichment of compact derived rows. Persist model/prompt/version/status metadata. Never put BigQuery LLM calls on the synchronous public API path or use their output to calculate AQI, concentrations, action effects or evidence state.


Define immutable zone/version, route/version, evaluation-plan, intervention-revision and clock DTOs plus all public/officer/supervisor endpoints. Provision isolated `aerify_dev`, `aerify_ci` and `aerify_demo` databases/roles on the hackathon Cloud SQL instance. Use Cloud SQL Python Connector/IAM authentication for developer and CI access and Cloud Run's Cloud SQL integration in deployment; do not use static database credentials or expose PostgreSQL broadly on a public IP. Alembic owns migrations and deterministic seeds. Each CI run migrates/seeds a unique empty schema and removes it afterward. Required CI validates fixtures, migrations, backend tests, OpenAPI generation, zero-diff TypeScript generation, frontend tests/build, Playwright role/evidence/correction flows, containers and secrets. Protect the integration branch and require contract-steward review for contracts/migrations/generated clients.


Freeze schema only after remaining geometry/source/gate decisions. Generate Pydantic/OpenAPI and TypeScript types from the accepted contract. Add endpoints for city overview, district cells, cell roads, Nearby, contextual layers, scenarios and interventions. Cache provider responses by valid time/grid and enforce source rate limits. Redact officer identity, plates and restricted media from public responses.


Integration acceptance: district-to-road map; no-data/freshness states; Near You fallback; synthetic lineage; separate scenario/observed result wording; weather/satellite resolution display; 1 km/3 km possible-source context without causation; officer Mark Done; unauthorized denial; reproducible offline fixture demo. Run JSON Schema validation, OpenAPI/client drift check, backend tests, frontend build and full browser path.
```


## Merge rule


No one changes `contracts/` without a shared contract proposal, per the change-management section of `docs/architecture.md`. Additive optional fields still require fixture and consumer updates before use. Breaking enum or meaning changes require a version bump. Runtime aliases or UI-only invented values are rejected.

