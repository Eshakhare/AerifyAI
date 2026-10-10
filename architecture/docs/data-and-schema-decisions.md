# Aerify AI: data and schema decisions


**Updated 10 October 2026.** Reviewer gaps B1–B8 are now decision-locked for the demo. The build is planned as scope tiers (demo core vs optional extensions) and a task execution order in `docs/architecture.md`, not as a person-based schedule; any team member may execute any task. Scope may compress, but evidence integrity, auditability, contract validation and automated testing are never traded for time. Exact Anand Vihar polygons and production-grade observed-effect thresholds still require domain approval, but deterministic demo policies and fixtures are fixed below.


## Reviewer recommendation disposition


| Recommendation | Decision | Reason / qualification |
| --- | --- | --- |
| Preserve raw cadence; use one-minute operations and 15/30/60-minute windows | Accept | Collection and presentation resolution must be independent. |
| Use 100–500 m road segments, then 2–3 km cells | Accept as configurable | A segment is coloured as stable only after repeat-coverage gates; a single pass remains point-in-time evidence. |
| Immutable raw plus calibrated versions | Accept | Corrections are new linked records, never overwrites. |
| Three action timestamps and delayed catch-up | Accept | Evaluation anchors to completion/event time, not the UI click time. |
| Completion/+1/+3/+6/+12 h, optional +24 h | Accept as water-suppression default | Schedules remain per action type, not globally hardcoded. |
| Reference-area/difference-in-differences evaluation | Accept | Requires pre-trend, overlap and coverage checks; otherwise result is inconclusive. |
| Explicit evidence states | Accept | Evidence basis stays separate from intervention-effect status. |
| Concentration-first CPCB AQI rules | Accept | PM-only output is a PM sub-index or estimated local indicator, not regulatory CPCB AQI. |
| 30-day, 4–6-bus, 12-action synthetic demo | Accept | Six buses × 16 h/day × 60 min × 30 days = 172,800 minute observations. |
| Paired with/without-action timelines | Accept | Both branches share exogenous context and random disturbances. |
| BigQuery silver/gold + Firestore transactions now | Modify | Keep PostGIS as operational truth and add BigQuery only as an asynchronous analytical/AI mirror when SQL-native AI or scale provides a concrete workload. Do not add Firestore by default. |
| Use Tokyo/Copenhagen/Oakland as design evidence | Accept with boundary | They validate schema and aggregation choices; they are not Delhi concentration seeds without transfer validation and licensing review. |
| Satellite for factories/construction | Narrow | Combine satellite context with a facility/permit registry; imagery alone cannot identify or prove an active source or causation. |


## B1–B8 decision closure


| Gap | Locked decision |
| --- | --- |
| B1 — scope cutline | Complete demonstrable map, synthetic generator, officer workflow, checkpoint analysis and CI gates are demo core. Only live hardware, automated Earth Engine refresh, +24 h checkpoint and BigQuery mirror are optional extensions. |
| B2 — zones/workflow | Add immutable `zones`/`zone_versions`, full create/edit/start/complete/media/list APIs and supervisor-only post-completion correction revisions. |
| B3 — p-hacking | Freeze the evaluation plan before action start; post-action data cannot change reference, windows, thresholds or method. Correction creates a new audited revision and recomputation. |
| B4 — roads | Use dated Geofabrik OSM Northern Zone data, Delhi clip, self-hosted OSRM Match and immutable `delhi_osm_250m_v1` segment IDs. |
| B5 — overlapping actions | Detect spatiotemporal action interference, exclude contaminated bins and force confounded/inconclusive results when gates fail; include one overlap fixture among the 12 actions. |
| B6 — confounders | The demo uses automatic versioned exclusion/disclosure thresholds, not a fitted weather-adjustment model. Production observed-effect publication remains gated on domain review. |
| B7 — virtual time | One server-owned ClockService supplies effective time to API, worker, UI metadata, freshness and cache keys. Clients cannot choose time. |
| B8 — CI/environments | Cloud SQL PostgreSQL/PostGIS is used directly in every environment; no local database or Docker Compose. Use isolated `aerify_dev`, `aerify_ci` and `aerify_demo` databases/roles, Alembic, deterministic seeds and required schema/migration/backend/OpenAPI/TS/frontend/Playwright/container/secret checks. CI uses a unique empty schema per run and removes it after completion. |


## Accepted decisions


| ID | Decision | Status |
| --- | --- | --- |
| D1 — geography | Delhi is the first city. Use the official districts from the verified boundaries snapshot (11 revenue districts), configurable 2–3 km analysis cells and measured road segments. The proposed flagship water-suppression action is the Palam–Dwarka corridor, with Anand Vihar ISBT among the other scenario actions; the flagship is confirmed at Gate 1 from the per-zone anchor-overlap table. | Accepted; exact action/reference geometry pending. |
| D2 — evidence mode | Use real historical bus/station PM where verified, modelled weather/satellite context at native resolution, and visibly synthetic local history/post-action data for the demo. | Accepted. |
| D3 — base pollutants | PM2.5 and PM10 are required for hotspots and intervention analysis. PM1 is supplemental when measured. | Accepted. |
| D4 — optional variables | Temperature, RH, precipitation and wind are contextual. PM0.3 particle count, CO2, HCHO and TVOC are optional and require a real source or separate documented generator. | Accepted. |
| D5 — satellite/source context | Use satellite atmospheric layers plus a licensed facility/industrial-land registry to show possible nearby sources within 1 km and 3 km. No causal factory claim. | Accepted. |
| D6 — media | Team-recorded video/images retain true capture time and may illustrate a street scene or suspected source. Camera data never measures AQI or proves action/impact. | Accepted. |
| D7 — synthetic lineage | The deterministic generator records seed, version, observed anchors, context sources, assumptions and generated variables. Current context cannot be presented as historical observation. | Accepted. |
| D8 — results | Synthetic pre/post data produces a `scenario_projection`. Only eligible observed pre/post data can produce an `observed_evaluation`. | Accepted. |
| D9 — public map | City → district → 2–3 km cell → measured road/area drill-down. High readings are coloured; missing or stale coverage is shown as no recent data. | Accepted. |
| D10 — user location | With permission, show nearest recent road observation, nearest official station, regional model fallback and nearby-city official AQI as separate rows. | Accepted. |
| D11 — resolution | Keep source cadence immutable; derive one-minute operations, 15/30/60-minute windows, configurable 100–500 m roads, 2–3 km cells and hourly/daily summaries. | Accepted. |
| D12 — actions | Store start, completion and marked-done times. Run event-time checkpoints with immediate catch-up for late reporting. | Accepted. |
| D13 — evidence states | APIs/UI expose `DIRECTLY_OBSERVED`, `OBSERVED_NEARBY`, `MODEL_ESTIMATED`, `SYNTHETIC` or `INSUFFICIENT_EVIDENCE`. | Accepted. |
| D14 — AQI | Generate/ingest concentrations first. A regulatory CPCB AQI label requires CPCB pollutant and coverage sufficiency. | Accepted. |
| D15 — demo profile | Generate 30 days, 4–6 virtual buses, 6–8 routes and 12 action cases with paired branches and an injectable clock. | Accepted. |
| D16 — storage | Add immutable Cloud Storage bronze; use Google Cloud SQL for PostgreSQL with PostGIS as the sole operational/transactional database. BigQuery is an optional analytical and SQL-native AI mirror extension, not the request-serving database. | Accepted. |
| D17 — zones | Stable zone identity plus immutable geometry versions; interventions reference exact action/reference zone versions. | Accepted. |
| D17a — routes | Routes are versioned entities with the same immutability pattern as zones: `routes` identity plus immutable `route_versions` carrying purpose (`OBSERVED_TRACE` for real IIT Delhi trace groups, `SYNTHETIC_CORRIDOR` for generator corridors), source, road/segmentation versions and device IDs. The 6–8 synthetic corridors and the 12 action zones are chosen jointly in one Phase 1 artifact so every action and reference zone sits on a route. | Accepted. |
| D18 — correction | Officer edits before completion; supervisor-only append-only correction after completion supersedes and recomputes affected outputs. | Accepted. |
| D19 — evaluation lock | Freeze reference selection, windows, gates, methods and source versions before action start. | Accepted. |
| D20 — road pipeline | Geofabrik OSM snapshot → Delhi clip → self-hosted OSRM Match → versioned 250 m maximum segments. | Accepted. |
| D21 — contamination | Spatial/temporal action overlap invalidates affected bins/reference evidence under a deterministic policy. | Accepted. |
| D22 — confounders | Use `water_suppression_demo_policy_v1` automatic gates; no trained/adjusted causal model in the demo. | Accepted. |
| D23 — clock | Server-owned real/scenario/test clock is authoritative across services and caches. | Accepted. |
| D24 — delivery gate | The demo build retains contract drift, migration, test and staging gates; optional integrations are the only deferrals. | Accepted. |
| D25 — managed database | Do not provision local PostgreSQL/PostGIS or Docker Compose. Use one small non-HA Cloud SQL instance for the hackathon with isolated dev/CI/demo databases and least-privilege roles; use a separate instance before production. Connect with IAM and the Cloud SQL connector/integration, never a repository password or unrestricted public database endpoint. | Accepted. |


## Critical interpretation rules


1. **Weather is regional context.** Persist provider grid and nominal resolution. It is not measured on every road.
2. **Satellite is contextual.** Persist footprint, acquisition time and quality flags. It does not identify a factory by itself.
3. **PM0.3 usually represents particle count.** Store its documented count unit; never put it into a `µg/m³` mass field.
4. **Optional gases are independent variables.** PM2.5/PM10 alone cannot determine CO2, HCHO or TVOC.
5. **Historical joining requires time alignment.** Prefer historical weather/satellite data for the PM timestamp. Current context may condition a synthetic scenario only with an explicit label.
6. **AQI retains its method and averaging period.** A bus's short PM reading is a PM observation. Official AQI is a separate source or a declared calculation from eligible inputs.
7. **Synthetic is permanent provenance.** Later live data creates new observed records and observed evaluations; it never upgrades old synthetic values.
8. **Evidence state is not effect evidence.** `DIRECTLY_OBSERVED` means the displayed concentration was directly measured; it does not prove that an action or nearby source caused it.
9. **One pass is not a stable hotspot.** Persistent-road labels require configurable repeat counts and temporal diversity.
10. **Time has two axes.** `event_time` drives environmental alignment and evaluation; `processed_at` drives ingestion and audit.


## Source matrix


| Source | Expected variables | Origin | Spatial meaning | Demo role |
| --- | --- | --- | --- | --- |
| IIT Delhi bus archive | PM1, PM2.5, PM10, GPS, time, device | Observed historical | Moving point/road pass | Historical anchor and route playback. |
| CPCB/DPCC | PM2.5, PM10, other station pollutants, AQI | Observed official | Station/city context | Official context and validation candidate. |
| Open-Meteo or selected weather provider | Temperature, RH, rain, wind | Model/reanalysis | Model grid | Time-matched confounder/context. |
| Sentinel-5P/CAMS | NO2, SO2, aerosol/other supported layers | Satellite/model | Multi-km footprint/grid | Regional atmospheric context. |
| Facility/land-use registry | Facility/location/category | Registry | Point/polygon | Nearby possible source context. |
| Portable/live bus sensor | PM2.5, PM10 and documented extras | Observed live | Street/road pass | Future true current/future collection. |
| Scenario generator | Missing PM/context/post-action fields | Synthetic | Declared zone/cell/road | Reproducible demo only. |
| Google Air Quality API (optional) | Hourly current/history/forecast pollutants and AQIs | Modelled external | Up to provider 500 × 500 m grid | Gap-filling/context only; history request/availability and caching follow provider terms. |
| OpenAQ (optional) | Public station observations and metadata | Observed aggregator | Station point | Discovery/reference; retain original provider attribution. |
| Tokyo/AEROS, Copenhagen, Oakland | Reference schemas/campaign evidence | Reference only | Station/mobile campaign | Inform architecture; do not numerically seed Delhi by default. |
| Geofabrik OpenStreetMap Northern Zone | Road ways/nodes and attributes | Versioned registry snapshot | Delhi road graph | Demo map matching and stable road segmentation; ODbL attribution required. |
| Route registry (`routes`/`route_versions`) | Route geometry, purpose, device IDs | Versioned registry | Corridor/route path | Groups real IIT Delhi trace passes and names the generator's synthetic corridors; versioned like zones. |


## Synthetic-generation contract


A scenario run must contain:


- one or more real anchor observation IDs;
- a scenario clock separate from source-observation time;
- context source IDs and their time/spatial compatibility;
- a list of generated metrics;
- generator version, configuration hash and seed;
- immutable action/reference zone-version IDs and frozen evaluation-plan ID;
- route version IDs used by the run, split by purpose;
- assumptions for water-suppression effect, traffic, weather and missingness;
- unit/range/relationship validation results; and
- public disclaimer text.


Default profile: 30 days; 4–6 virtual buses; 6–8 routes; approximately 16 operating hours/day; hourly cell background/weather; optional 15-minute traffic context; and 12 action cases split evenly among sustained, temporary, no-effect and inconclusive/confounded outcomes.


Exactly one inconclusive/confounded case contains overlapping action influence windows so the contamination evaluator is covered.


A zone-level wording guard applies everywhere synthetic values are shown: the display label is computed from the zone's verified anchor state — **Synthetic demo — based on historical PM observations and contextual models** with anchors, **Fully synthetic demonstration — no verified observed anchors in this zone** without — and Near You fallback wording never claims observation grade for a zone without verified anchors.


Each action scenario contains paired `WITHOUT_ACTION` and `WITH_ACTION` branches with the same exogenous inputs and stochastic noise. Only the versioned intervention-response curve changes. Production uses real time, demo uses a virtual/retroactive clock and automated tests use an injected clock.


PM10 must be greater than or equal to PM2.5 for coherent synthetic mass observations. PM1 should be less than or equal to PM2.5 when generated as mass. Optional metrics remain `null`/absent if their model is not configured. Do not create plausible-looking gases simply to fill the UI.


## Map aggregation decisions


- Administrative layer: current official Delhi district boundaries.
- Analysis layer: stable H3/hex or square cells with an initial 2–3 km target width.
- Detail layer: road segments that actually contain eligible observations.
- Each aggregate returns metric, unit, category, value time/window, last observation time, source count, sample count, coverage state and provenance mix.
- Coverage states: `current`, `stale`, `sparse`, `modeled_only`, `synthetic_only`, `no_data`.
- A cell may be coloured from observed data only after a configurable sample/source gate. Other origins receive distinct patterns/badges.
- “Street-level” is reserved for an eligible nearby street observation; otherwise identify the actual fallback.
- Preserve raw source cadence. Use one-minute operational aggregates and 15/30/60-minute comparison windows.
- Lock `segmentation_version=delhi_osm_250m_v1`: split OSM ways at intersections and fixed 250 m maximum length. Future segmentation creates a new version and crosswalk; it never rewrites historical IDs.
- Use self-hosted OSRM Match. Keep unmatched observations when confidence is below 0.50 or snapped distance exceeds 40 m.


## Scenario projection versus observed evaluation


| Property | Scenario projection | Observed evaluation |
| --- | --- | --- |
| Allowed synthetic inputs | Yes | No for core PM pre/post series |
| Intended use | Demo, planning and what-if explanation | Evaluation after real future action data exists |
| Example status | `simulated_improvement` | `observed_improvement_association` |
| Claim strength | Assumption-driven projection | Evidence-supported association with limitations |
| Can overwrite the other? | No | No; link them by intervention/scenario. |


Proposed observed calculation for pollutant P:


`effect_P = (action_post_P - action_pre_P) - (reference_post_P - reference_pre_P)`


For the synthetic demo, `water_suppression_demo_policy_v1` freezes thresholds before generation/evaluation: 75% minimum coverage, three independent 15-minute bins, rain ≥0.5 mm/h in at least two post bins, wind-speed change ≥2 m/s, wind-direction shift ≥45°, traffic-index divergence >0.20, and any qualifying action overlap. Production observed-effect thresholds and interval method remain pending environmental review. AQI, media and satellite context are not numerical water-suppression outcome inputs.


## AQI derivation contract


- Store concentration inputs, pollutant sub-indices, `aqi_standard`, `aqi_algorithm_version`, `averaging_window` and `data_sufficiency_status`.
- A CPCB regulatory-style overall index is emitted only when the declared CPCB algorithm's pollutant count, required PM pollutant and time coverage rules pass; the maximum qualifying sub-index is selected.
- If only PM2.5 and PM10 qualify, emit pollutant-specific sub-indices and optionally an `estimated_local_aqi`/PM-based indicator with an explicit non-regulatory label.
- Official AQI received from CPCB/DPCC remains a separately sourced station/city value.


## Action time and checkpoint contract


- Required workflow times: `action_started_at`, `action_completed_at`, `marked_done_at`, plus `timezone` and server processing/audit times.
- Evaluation windows anchor to `action_completed_at` and use event time. Late entry triggers all already-due checkpoints immediately.
- Water suppression initially uses completion, +1 h, +3 h, +6 h and +12 h; +24 h is optional. Other actions own their schedule configuration.
- Each checkpoint stores affected and reference geographies, input window IDs, evidence state, pollutant-specific result, uncertainty, confounders, coverage and method version.
- The evaluation plan is created with the proposal and frozen before action start. It includes zone versions, windows, thresholds, reference evidence, road/matcher versions, overlap/confounder policies and method versions.
- Post-completion corrections are supervisor-only, append-only and reasoned; they supersede and recompute affected snapshots/evaluations without deleting former versions.


## Authoritative clock contract


- `ClockService` is the only source of effective now: `REAL`, `SCENARIO` or `TEST`.
- Demo clock state is stored server-side per deployment/scenario and cannot be overridden by client parameters or headers.
- Every response carries clock mode/effective time/scenario/revision. UI freshness, tasks and caches use those fields.
- Cache namespace includes schema version, scenario ID, clock revision and effective time bucket.


## Schema change process


1. Record the decision and source need as a change proposal against `docs/architecture.md` (see its change-management section).
2. Bump the draft schema version and identify compatibility impact.
3. Update schema, fixtures, backend models/OpenAPI, generated TypeScript client and UI handling together.
4. Add validation for provenance, spatial/time support and synthetic lineage.
5. Freeze v1.0 only after action/reference geometry, live-source availability and numerical gates are accepted.


## Assignment policy


This repository defines workstreams, tasks, gates and their execution order (`docs/architecture.md`, "Task execution order"). It never assigns people to tasks. Any team member may pick up any task in any workstream, in dependency order; the only role fixed by the architecture is the contract-steward review for `contracts/`, migrations and generated clients, which belongs to whoever currently owns the contract/platform workstream.


## Remaining decisions


- Exact flagship (Palam–Dwarka corridor) and Anand Vihar action and untreated reference road polygons.
- Gate 1 confirmation of the flagship zone from the per-zone anchor-overlap table (Palam–Dwarka proposed; flip back to Anand Vihar if its verified-anchor coverage is stronger).
- Which current/live feeds the team can legally and technically access during the demo.
- Industrial facility registry and reuse terms for Delhi.
- Satellite product(s), historical availability and snapshot ingestion method for the demo build.
- Distance/freshness gates for the “Near you” street observation.
- Minimum samples/sources for district, cell and road colouring.
- Production PM2.5/PM10 effect thresholds, response window and interval method for observed evaluation; the synthetic demo policy is already frozen.
- Whether optional CO2/HCHO/TVOC/PM0.3 have a defensible source/model in this build; otherwise omit their values.
- Repeat-pass and temporal-diversity gates for declaring a stable road hotspot.
- Exact CPCB algorithm/version and third pollutant source if a regulatory-style overall AQI is required.
- Measured scale threshold that would trigger a BigQuery analytical replica.
- Which reviewed batch use case, if any, justifies enabling BigQuery `AI.GENERATE` during the demo; it must not calculate AQI or intervention effects.



