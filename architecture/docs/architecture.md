# Aerify AI: shared architecture (Google-Native Environmental Architecture)


**Revision:** 0.14 — National Multi-State Expansion, Pure Google Telemetry with Weekly/Monthly Point Line Graphs, Govt Actions State & Area Multi-Filter, and Municipal Action Center Compact View with Configurable 15s–3d Checkpoint Intervals; decisions locked 18 October 2026.


**Revision history:** 0.6-draft locked execution decisions; 0.7-draft added task execution order and route-entity change set; 0.8 added geometry-transport and read-only MCP tool layer; 0.9 closed six UI gaps; 0.10 incorporated Government Clean Air Actions Registry with pre/post comparisons; 0.11 integrated Google Maps Platform, Near You permission query, 3-pillar civic portal, and Cloud SQL action persistence. 0.12 transformed the platform to a Google-Native Environmental Architecture (Google Air Quality API 30-day history & 500m grid, Pollen API, Weather API, CPCB 13 Winter Action Plan hotspots, retiring cameras and synthetic bus generators). 0.13 added production authentication, top header Google account profile chip, and citizen "Actions in Visited Places" with 30-day filter. **0.14 delivers National Multi-State Expansion** (auto-detected state + state selector dropdown + reset button), transforms District Detail View to pure Google Telemetry (rolling 4h/24h from Google AQI API `history:lookup`, graceful notice for districts without continuous physical CPCB stations, weekly/monthly point-based SVG line graph), redesigns the Govt Actions page (purges Detailed Sensor Audit, decouples directives from sensors, adds multi-select area filter with clearable tags), and redesigns the Municipal Action Center (chronological sorting, pending vs. measuring split, compact list view with right-side details drawer, and configurable 4-checkpoint measurement intervals from 15 seconds to 3 days).


## 1. Mission and scope


Aerify AI combines real-time and 30-day historical Google Air Quality API telemetry, Google Pollen API, Copernicus Sentinel-5P satellite assimilation, official CPCB monitoring stations, and industrial geography into an actionable municipal intelligence platform to help officers track Delhi pollution hotspots, deploy interventions, and scientifically verify clean air impacts.


The production architecture uses a **Google-Native Evidence Model**:


- **Google Air Quality API (`currentConditions:lookup` & `history:lookup`)** provides continuous 500m area coverage and up to 30 days of hourly ground-level telemetry for core pollutants: $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{O}_3$, $\text{CO}$, $\text{SO}_2$, and official CPCB AQI.
- **Satellite Assimilation:** Google Air Quality API's underlying models directly assimilate **ESA Copernicus Sentinel-5P (TROPOMI spectrometer)** tropospheric trace gas columns and CAMS atmospheric dispersion into its 500m surface grid.
- **Google Pollen API (`forecast:lookup`)** provides multi-day Tree, Grass, and Weed pollen risk indices to augment particulate data with comprehensive public health and allergy advisories.
- **Difference-in-Differences (DiD) Evaluation:** Municipal interventions (e.g. water suppression at Anand Vihar ISBT, mechanical sweeping at Palam–Dwarka, anti-smog guns at Wazirpur) are evaluated by pulling real hourly Google AQI telemetry before the action, at completion, and across scheduled checkpoints (`+3h`, `+6h`, `+12h`, `+24h`), comparing the treated 500m hotspot against an untreated control hotspot (2–3 km away) to mathematically isolate net municipal impact.
- **Retirement of Fleet Cameras:** Illustrative camera-event pipelines and video processing have been officially retired from the active architecture to focus 100% on environmental telemetry and action verification.
- **Retirement of Synthetic Data Generators:** Replaced by real 30-day historical hourly curves from Google Air Quality API, eliminating mock simulation disclaimers and delivering authentic data across all 11 Delhi districts.
- **Cloud SQL PostgreSQL/PostGIS** serves as the authoritative operational database for municipal action plans, checkpoint states, and geographic district boundaries.
- **Google Cloud Vertex AI (Gemini 2.5 Flash-Lite)** synthesizes multi-pollutant concentrations, meteorological confounders (wind/temperature), and upwind/downwind industrial corridors into executive municipal briefings.


The flagship intervention is **water suppression on the Palam–Dwarka corridor**, with Anand Vihar ISBT retained as one of the other scenario actions. The flagship choice is confirmed at Gate 1 against the per-zone anchor-overlap table: a flagship zone with no verified observed anchors would make the demo's centrepiece fully synthetic. The untreated comparison area is selected after geographic and pre-trend review. The product evaluates PM2.5 and PM10 separately. It can show additional variables, but they do not become intervention evidence unless a valid source actually measured them.


## 2. Evidence rules


### 2.1 Data classes


| Class | Examples | Permitted claims |
| --- | --- | --- |
| `observed` | Bus PM reading, portable PM monitor, CPCB station | The named source measured this value at the recorded time and spatial support. |
| `modeled_context` | Weather API, air-quality model grid, satellite retrieval | The provider estimated or observed conditions for a grid/footprint; never call it a street measurement. |
| `synthetic_scenario` | Reconstructed local history, simulated post-action series, optional demo gases | A reproducible demo value produced by a named generator; never claim it occurred. |
| `derived` | District summary, 2–3 km cell aggregate, hotspot score, Indian AQI calculated from eligible inputs | A calculation from cited inputs and method version. |


Every numerical record carries `origin`, source/dataset ID, source time, ingestion time, spatial support, units, quality flags and method/generator version when applicable.


The API also exposes an evidence state: `DIRECTLY_OBSERVED`, `OBSERVED_NEARBY`, `MODEL_ESTIMATED`, `SYNTHETIC` or `INSUFFICIENT_EVIDENCE`. This describes the basis of the displayed value, not whether an intervention caused it. Intervention-effect status is a separate field.


### 2.2 Time alignment


Historical PM should be joined to **historical** weather and satellite data for the same period whenever those products are available. Current weather or satellite data may be used as a scenario template or model input, but it must not be backdated and presented as the weather or emissions state that existed during a historical bus trip.


For the demo, the generator may create a coherent past scenario from:


1. an observed historical PM2.5/PM10 anchor;
2. historical contextual data when available;
3. source geography and regional seasonal patterns;
4. explicit assumptions for missing variables; and
5. a fixed seed and generator version.


If only current context exists, label the result **Synthetic scenario conditioned on current context**, not reconstructed historical observation.


### 2.3 Pollutant priority


| Variable | Role |
| --- | --- |
| PM2.5 and PM10 | Required core observations, hotspot inputs and water-suppression evaluation variables. |
| PM1 | Display when measured by the bus or local sensor; supplemental context. |
| PM0.3 | Optional particle-count channel only when the device documents its unit and meaning. Do not store it as PM mass concentration. |
| Temperature, relative humidity, precipitation, wind speed/direction | Required context when available; retain model-grid resolution and provider. Humidity is also a low-cost PM sensor quality factor. |
| CO2, HCHO and TVOC | Optional context. Show only as measured, modeled by a suitable source, or synthetic. Do not infer them directly from PM2.5/PM10. |
| NO2, SO2, CO and O3 | Optional public-station or satellite/model context. Use source-specific units and spatial support. |


## 3. Logical system


```mermaid
flowchart TB
  subgraph INGESTION["Google Cloud & Environmental API Ecosystem"]
    GAQ["Google Air Quality API (500m Grid & 30-Day History)"]
    GPL["Google Pollen API (Tree, Grass, Weed Forecasts)"]
    GWE["Google Weather API (Wind, Temp, Humidity)"]
    GGEO["Google Geocoding API (State & District Resolution)"]
    CPCB["Physical CPCB/DPCC CAAQMS Stations"]
    SAT["ESA Sentinel-5P & CAMS Dispersion (Assimilated)"]
  end

  subgraph STORAGE["Operational & Relational Store (Cloud SQL PostGIS)"]
    ACTIONS["actions (Interventions & Checkpoint Timelines)"]
    OBS["context_observations (Empirical Checkpoint Readings)"]
    USERS["app_users (RBAC: CITIZEN, OFFICER, SUPERVISOR)"]
    DIRECTIVES["policy_directives (Authoritative Statutory Orders)"]
  end

  subgraph EVALUATION["Difference-in-Differences (DiD) Engine"]
    DID["DiD Impact Worker (Treated vs Control Evaluation)"]
    SCHED["Configurable Checkpoint Scheduler (15s – 3d)"]
  end

  subgraph AI_LAYER["Vertex AI Intelligence"]
    GEMINI["Gemini 2.5 Flash-Lite (Executive Briefings & Gazette Verification)"]
  end

  subgraph CLIENT["Unified React Frontend (Vite + Tailwind)"]
    DASH["Air Quality Dashboard (Google Maps JS + State Selector + SVG Line Graph)"]
    VISITED["Actions in Visited Places (30-Day Citizen Ledger)"]
    REGISTRY["Govt Actions & Impact (State & Area Multi-Filter Dropdown)"]
    OFFICER["Municipal Action Center (Compact List & Right-Side Details Drawer)"]
  end

  INGESTION --> STORAGE
  STORAGE --> EVALUATION
  EVALUATION --> STORAGE
  STORAGE --> CLIENT
  STORAGE --> AI_LAYER
  AI_LAYER --> CLIENT
```


### Component responsibilities


| Responsibility | Component |
| --- | --- |
| 500m Real-Time & 30-Day Historical Ground Telemetry | Google Air Quality API (`currentConditions:lookup` & `history:lookup`) |
| Allergen Forecasts (Tree, Grass, Weed) | Google Pollen API (`forecast:lookup`) |
| Ambient Meteorological Confounders (Wind, Temp, Humidity) | Google Weather API + Open-Meteo Fallback |
| Dynamic National State & District Resolution | Google Geocoding API + Browser HTML5 Geolocation |
| Base Maps, Satellite/Terrain Layers, District GeoJSON | Google Maps JavaScript SDK (`@vis.gl/react-google-maps`) |
| Operational Persistence & Spatial Integrity | Google Cloud SQL for PostgreSQL (PostGIS) via IAM Connector |
| Dual-Path Authentication & RBAC | Firebase Google Auth (Citizens) + `@mcd.delhi.gov.in` Email/Password (Officers) |
| Causal Impact Evaluation across 4 Custom Intervals | Empirical Difference-in-Differences (DiD) Worker (15s to 3d Checkpoints) |
| Authoritative Statutory Policy Orders | Cloud SQL `policy_directives` (Two-Tier Administrative & Gazette Verification) |
| Narrative Briefings & Gazette Extraction | Google Cloud Vertex AI (Gemini 2.5 Flash-Lite with Billing Spend Caps) |
| Responsive 3-Pillar Civic & Officer Interface | React (Vite, TypeScript, Tailwind CSS, Lucide Icons) |


Gemini may explain or rank already computed evidence and extract structured gazette directives. It cannot fabricate measurements, mutate intervention states, or alter mathematical DiD calculations.


### Scope tiers


The demo core is the complete demonstrable product: provenance rules, audit trail, automated gates and every flow below. A capability may sit in **Optional extensions** only if it is an external scale/integration option and the demo core has a deterministic substitute. Nothing in the demo core may be silently dropped.


| Workstream | Demo core | Optional extensions; must not block the demo |
| --- | --- | --- |
| Frontend and public map | District → cell → road map, Near You fallback, provenance/coverage states, zone selection, intervention create/start/complete/media flow, Government Actions & Directives Registry (Odd-Even live status, AI Green War Room, GRAP-IV, pre/post AQI comparisons, verified impact badges, stable unmeasured/confounded notices), checkpoint timeline, scenario/observed wording | Additional visual polish and nonessential optional-gas panels |
| Data and geography | AirDelhi import, immutable raw path, Delhi OSM/OSRM road pipeline, versioned segments, one-minute and 15/30/60-minute aggregates, 30-day/12-action generator, cached weather/satellite/facility context | Live hardware adapter and automated Earth Engine refresh; use documented snapshot adapters for the demo |
| Analysis and workflow | Frozen evaluation plan, reference checks, overlap detection, automatic confounder policy, paired scenarios, completion/+1/+3/+6/+12 checkpoints, virtual clock, deterministic narratives | Optional +24 h checkpoint and statistically adjusted causal model |
| Contract and platform | Schema/OpenAPI/types, complete officer/public/zone APIs, PostGIS migrations/seeds, Firebase sign-in with Cloud SQL `app_users` roles, Cloud Tasks idempotency, CI drift gate, staging deployment | BigQuery analytical/AI mirror |


### Task execution order


The build follows workstreams, not assigned people. Anyone may pick up any task; the order and dependencies below are what the team executes. Tasks within a phase run in parallel unless a dependency says otherwise. Every phase ends with a gate; the next phase's first tasks may start only when the gate passes.


**Phase 1 — Contract and policy freeze**


| # | Task | Workstream | Depends on |
| --- | --- | --- | --- |
| 1.1 | Land `contracts/domain.schema.json`, OpenAPI generation, accepted fixtures and `contracts/tools/validate_contracts.py` | Contract/platform | — |
| 1.2 | Land road policy (`delhi_osm_250m_v1`, matching thresholds) and evaluation policy (`water_suppression_demo_policy_v1`, overlap policy) as versioned documents, together with the scenario catalog (`scenario_catalog_v1`) and legend band sets (`legend_bands_v1`) | Data/geography + analysis | — |
| 1.3 | Stand up CI skeleton with the contract drift gate | Contract/platform | 1.1 |
| 1.4 | Generate deterministic seed fixtures for roads and evaluation cases | Data/geography + analysis | 1.1, 1.2 |
| 1.5 | Verify IIT Delhi archive coverage over candidate zones and compute the per-zone anchor-overlap table (verified anchors × zone) | Data/geography | — |
| 1.6 | Joint route/action-zone plan: one artifact choosing the 6–8 synthetic corridors and the 12 action zones together so every action and reference zone sits on a route, consuming the 1.5 table and confirming the flagship zone | Data/geography + analysis | 1.5 |


**Gate 1:** schema/OpenAPI/fixtures green in CI; policy versions accepted; joint route/zone plan confirmed — every action and reference zone has route coverage, and the flagship zone has verified observed anchors; catalog cases S01–S12 are bound to zones and every `ZoneSummary` carries its computed anchor state.


**Phase 2 — Data foundation**


| # | Task | Workstream | Depends on |
| --- | --- | --- | --- |
| 2.1 | Empty-schema Alembic migration + deterministic seed against `aerify_ci` Cloud SQL/PostGIS | Contract/platform | Gate 1 |
| 2.2 | Load zone/road graph and district/cell geography into PostGIS | Data/geography | Gate 1 |
| 2.3 | Import pinned Geofabrik OSM snapshot, clip Delhi, run self-hosted OSRM matching, build `delhi_osm_250m_v1` | Data/geography | 2.2 |
| 2.4 | Source adapters: IIT Delhi bus, CPCB/DPCC candidate, weather, satellite, facility registry with provenance and snapshot metadata | Data/geography | 2.1 |
| 2.5 | Immutable raw payload storage path | Data/geography | 2.1 |
| 2.6 | Generate static geometry bundles (districts/cells/measured roads) with sha256 + version in the artifact manifest; serve with immutable caching | Data/geography | 2.2 |


**Gate 2:** migrated/seeded database; road graph and matched segments queryable; adapters ingest with full provenance.


**Phase 3 — Engine and analysis core**


| # | Task | Workstream | Depends on |
| --- | --- | --- | --- |
| 3.1 | Deterministic 30-day/12-action scenario generator with paired branches and the overlap case | Data/geography | 2.4, 2.5 |
| 3.2 | One-minute and 15/30/60-minute aggregation service with freshness/coverage gates | Data/geography | 2.3 |
| 3.3 | Evaluation-plan freeze, reference selection, overlap detection, confounder policy, scenario projections | Analysis | Gate 1 |
| 3.4 | Checkpoint evaluation jobs, server ClockService, idempotent task queue | Analysis | 3.3 |
| 3.5 | Hotspot scoring and derived aggregates | Analysis | 3.2 |


**Gate 3:** generator reproduces identical output from the same seed/snapshot; overlap case produces confounded/inconclusive; clock and checkpoints pass backend tests.


**Phase 4 — APIs and frontend**


| # | Task | Workstream | Depends on |
| --- | --- | --- | --- |
| 4.1 | Public/officer/supervisor/zone/session (`/v1/me`)/legend APIs against the generated client | Contract/platform | Gate 3 |
| 4.2 | District/cell/road map, Near You, provenance/coverage/no-data states | Frontend | 4.1 |
| 4.3 | Officer draft/start/complete/media flow and zone catalog | Frontend | 4.1 |
| 4.4 | Context drawer (weather/satellite/sources), scenario pages with lineage, checkpoint timeline, correction notice | Frontend | 4.1, 3.4 |
| 4.5 | MCP Toolbox on Cloud Run: read-only tools over gold views, SELECT-only role, ADK/Gemini wiring | Contract/platform | 2.1 |


**Gate 4:** full integrated flow — map → hotspot → frozen plan → action complete → checkpoints → public synthetic result — runs against the deployed API.


**Phase 5 — Hardening and demo**


| # | Task | Workstream | Depends on |
| --- | --- | --- | --- |
| 5.1 | Delayed checkpoints/catch-up, supervisor correction/recompute | Analysis | Gate 4 |
| 5.2 | Provenance drawers, public intervention timeline, evidence-state wording sweep | Frontend | Gate 4 |
| 5.3 | Staging deployment; full Playwright matrix; security/auth/idempotency/cache/clock verification | Contract/platform | Gate 4 |
| 5.4 | Defect fixing and reproducibility re-check | All | 5.1–5.3 |


**Gate 5 (demo readiness):** clean-seed rehearsal, reproducibility check, demo runbook and release tag; no new features after this point.


Parallelism: Phase 1 tasks 1.1/1.2 run together; Phase 2 runs 2.1/2.2 and 2.4/2.5 concurrently; Phase 3 runs 3.1–3.3 concurrently; Phase 4 runs 4.2–4.4 concurrently once 4.1 lands. Phases 2–4 overlap across workstreams as soon as each stream's own dependency chain clears.


### Architecture and contract change management


This document is the shared base that implementation branches from. Two independent version axes keep parallel work from breaking:


| Axis | Where it lives | Bumped when |
| --- | --- | --- |
| Architecture revision (`0.9` in the header) | This document | Any change to scope tiers, phases, policies, API surface, storage or evidence rules |
| `schema_version` (`0.9`) | `contracts/domain.schema.json` and every response's `schema_version` | Any DTO/field/enum change, however small |


Change flow:


1. Anyone may raise a change proposal against this document (PR or tracked issue) stating the motive, the affected sections and whether `schema_version` changes.
2. Accept the proposal by merging with a bumped architecture revision and, when DTOs change, a bumped `schema_version` plus updated fixtures, backend models/OpenAPI, generated TypeScript and both consumers in the same change.
3. Teams revise only what the change touches: a UI or API feature already building on the prior revision keeps working unless the merged change explicitly names its surface; consumers adapt to named changes at their own pace and never break the contract to match a stale local copy.
4. Additive optional fields may ship without a major bump but still require fixture and consumer updates; breaking enum or meaning changes require a schema version bump and a migration note in the revision history.
5. The repository copy of this document is always authoritative over any handoff copy, screenshot or fork.


Precedence within the repo: accepted decisions in `docs/data-and-schema-decisions.md` > JSON Schema/OpenAPI > this architecture document > role prompts and implementation details.


## 4. Data ingestion and fusion


### 4.1 Source adapters (Google-Native Environmental Telemetry)


1. **Google Air Quality API (`airquality.googleapis.com`):** Ingests live 500m conditions (`currentConditions:lookup`) and up to 30 days of hourly historical telemetry (`history:lookup`). Serves primary ground-level criteria pollutants ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{O}_3$, $\text{CO}$, $\text{SO}_2$) and official CPCB AQI.
2. **Google Pollen API (`pollen.googleapis.com`):** Ingests 3-day daily pollen forecasts (`forecast:lookup`) for Tree, Grass, and Weed allergen indices, complete with cross-reactive plant species health recommendations.
3. **Google Weather API (`weather.googleapis.com`):** Ingests ambient meteorological confounders (temperature, relative humidity, precipitation rate, wind speed, wind direction) at coordinate level with Open-Meteo fallback.
4. **Google Geocoding API (`geocoding-backend.googleapis.com`):** Ingests reverse-geocoded spatial metadata, resolving GPS coordinates to locality, municipal ward, district, and state.
5. **CPCB/DPCC Continuous Monitoring Stations (CAAQMS):** Ground-truth stationary point observations. For districts without physical continuous monitoring stations, the platform provides an explicit transparent notice while displaying 500m satellite-assimilated telemetry.
6. **Copernicus Sentinel-5P & CAMS Satellite Assimilation:** Tropospheric trace gas column densities and aerosol optical depth, assimilated directly into Google's continuous 500m surface grid.
7. **Statutory Policy Directives Feed (`policy_directives`):** Authoritative gazette orders (e.g., CAQM GRAP-IV, Odd-Even, Green War Room, BMC dust guidelines) seeded in Cloud SQL and verified via a two-tier pipeline: official administrative officer entry + automated PIB/CAQM gazette parsing with Gemini 2.5 Flash-Lite.
8. **Permanent Retirement of Bus & Camera Simulators:** All legacy DTC bus sensor archives (`mobile_sensor_telemetry`), road matchers (OSRM), and video camera event models have been completely retired and pruned from the production ingestion pipeline.


### 4.2 Spatial hierarchy: National Multi-State Architecture


```mermaid
flowchart TD
  IN["National India Level"] --> ST["State Level (Delhi, Maharashtra, Uttar Pradesh, MP, etc.)"]
  ST --> DT["Administrative Revenue Districts (e.g. 11 Delhi Revenue Districts)"]
  DT --> HW["Municipal Wards & Recognized Hotspots (500m Resolution)"]
  HW --> PT["Point-Level Empirical Interventions & Checkpoint Coordinates"]
```


- **Dynamic Geolocation Resolution**: On initial load, browser GPS and Google Geocoding resolve the user's active state and district.
- **State Selector Dropdown & Reset**: Located above the interactive vector map, allowing citizens and officers to freely inspect clean air operations across different states (e.g. inspecting Delhi from Mumbai), with a `[Reset to My Location]` button.
- **Wards & Hotspots (Replacing Corridor Cells)**: Evaluates recognized municipal wards and pollution hotspots (e.g. Anand Vihar, Wazirpur, Dwarka, Palam, Jahangirpuri) with live 500m Google telemetry, completely replacing synthetic bus corridor cells.
- **District Detail Pure Google Telemetry**:
  - Rolling 4-hour and 24-hour averages derived directly from Google AQI API `history:lookup`.
  - Continuous physical station reporting where CAAQMS stations exist, or graceful no-station notices for rural/unmonitored districts.
  - Interactive **Weekly (7 Days) / Monthly (30 Days) Point-Based SVG Line Graph** showing daily average trends with circular nodes and hover tooltips.


### 4.3 Policy Directives Data Provenance & Statutory Two-Tier Verification


Directives (e.g., GRAP-IV, Odd-Even Scheme, Firecracker Bans, BMC Dust Mitigation Mandates) are legally binding administrative orders, NOT speculative news headlines:
1. **Authoritative Cloud SQL Store (`policy_directives`)**: Directives are stored with official Gazette Order Number, Issuing Department, Effective Date/Time Window, Geographic State Scope, and Legal Penalties (e.g. ₹20,000 fine under the Motor Vehicles Act).
2. **Two-Tier Validation Pipeline**:
   - **Tier 1 (Authenticated Administrative Entry)**: Verified municipal officers (`@mcd.delhi.gov.in`, `@mcgm.gov.in`) log gazette orders directly via the authenticated officer portal.
   - **Tier 2 (Automated Official Gazette & PIB Ingestion via Gemini 2.5)**: Official government circulars from the Press Information Bureau (PIB), CAQM, and State Pollution Control Boards (SPCBs) are analyzed by Vertex AI Gemini 2.5 Flash-Lite to extract and verify statutory order numbers and effective windows before publishing to the live registry with links to the official gazette PDF.
   - **Unvetted News Prohibition**: Raw commercial news scrapers and social media feeds are strictly barred from publishing policy directives to prevent public rumor panics.


### 4.4 Municipal Action Center & Configurable Checkpoints Engine


- **Chronological Sorting & Categorized Split**:
  - **Section A: Active Operations Pending Execution (`PENDING_COMPLETION`)**: Dispatched field actions awaiting completion, displaying prominent `[Mark as Done]` action buttons.
  - **Section B: Post-Action Evaluation Active (`MEASURING_IMPACT`)**: Actions marked done whose scheduled measurement intervals are actively querying Google Environmental APIs.
- **Compact Line-Item View**: Streamlined rows showing Hotspot Name, Action Type, Stage Badge, and Date/Time, opening the full checkpoint timeline in a **Right-Side Details Drawer**.
- **Configurable 4-Checkpoint Measurement Intervals**: Officers configure 4 measurement intervals with flexible units (`Seconds`, `Minutes`, `Hours`, `Days`) bounded between **15 seconds** (for instant hackathon verification) and **3 days** (72 hours). When checkpoints mature, the system polls Google Air Quality and Weather APIs to calculate empirical Difference-in-Differences (DiD) impact.


### 4.5 Hotspot Zones & Google Maps Platform Vector Layers — locked


- **Hotspot Zones Architecture**: Interventions and evaluations are anchored to 500m Hotspot Zones and Municipal Wards (e.g. Anand Vihar, Wazirpur, Dwarka, Palam, Jahangirpuri, Bawana, Mundka) aligned directly with CPCB Winter Action Plan hotspot coordinates.
- **Google Maps Vector Layers**: Powered by `@vis.gl/react-google-maps` using the Google Maps JavaScript SDK, rendering dynamic vector base tiles, satellite/hybrid/terrain switches, and official administrative district GeoJSON polygons.
- **Retirement of Bus Corridors & OSRM Matchers**: All legacy bus corridors, synthetic bus fleet routes, and self-hosted OSRM map-matching services have been completely retired. Alembic migrations formally deprecate and drop the `mobile_sensor_telemetry` table. Operational baselines and causal evaluations derive cleanly from Google Environmental APIs persisted in `actions` and `context_observations`.


### 4.6 Nearby factory/source context


For a road or cell, query:


- nearby industrial facilities/industrial land use within 1 km;
- wider candidates within 3 km;
- wind direction and speed for the relevant regional grid/time; and
- satellite atmospheric indicators over their actual footprint.


Return ranked **possible source context** with distances and data times. Do not state that a factory caused the road-level PM spike without a separate source-attribution study.


Construction activity should come from an authoritative project/permit/source registry when possible. Satellite or imagery may provide coarse land-use/change context, but it does not reliably prove that a construction site was active at the event time.


### 4.8 Geometry transport — locked


Geometry reaches the UI through two transports, chosen per layer by size and reuse; a third is the documented scale path:


| Layer | Transport | Rules |
| --- | --- | --- |
| Districts, analysis cells, measured road segments | **Static, versioned GeoJSON bundles** | Generated in the same deterministic run that emits the demo CSVs (§5), with SHA-256 and version in the same manifest. Served from Cloud Storage with immutable caching. The road bundle contains only measured segments with eligible observations — unmeasured roads stay "No recent data" and are never drawn as valued. The serving version is exposed through the API so the UI can show "roads shown are from snapshot X". |
| Zones, routes, action polygons | **Embedded GeoJSON** in `ZoneVersion.geometry` / `RouteVersion.geometry` | Small features travel with the evidence so hash verification stays local: the client recomputes the geometry hash against `geometry_hash`. Keep polygons coarse (vertices minimized); the store-of-truth remains PostGIS. |
| Future scale path | Vector tiles (MVT) | Out of demo scope. When a city layer grows beyond what a bundle serves efficiently, add `ST_AsMVT` endpoints; bundle versions remain the identity anchor. |


`geometry_ref` on any DTO is a **server-side provenance pointer** (e.g. the PostGIS row the geometry was loaded from). It is nullable, never dereferenceable by a browser, and public responses strip or ignore it; the UI never fetches geometry through it. Every public geometry consumer reads `geometry` (`GeometryTransport`), which is `geojson`-encoded and hash-verifiable.


District linkage: the zone **entity** (`zones` table row) carries `district_id`, assigned at creation to the district containing the zone polygon's centroid (PostGIS `ST_Centroid`/`ST_Contains`). `GET /v1/public/zones?district_id=` filters on this field. Version rows stay immutable and gain no mutable linkage; a zone straddling district lines belongs to its centroid's district.


### 4.7 Immutable raw and calibration lineage


- Write source payloads to immutable, versioned object storage before normalization.
- Never overwrite a raw observation after calibration. Create a corrected/derived record linked by `raw_record_id`, `calibration_version`, calibration time range and quality flags.
- Reprocessing creates a new aggregate, AQI/sub-index or evaluation version; published versions remain auditable.
- Quarantine invalid units, impossible coordinates/timestamps and duplicates before they reach public aggregates.


### 4.9 Weather and satellite context records — locked


Weather, regional air-quality model and satellite records are ordinary `Measurement` rows that reuse the existing metrics (`TEMPERATURE`, `RELATIVE_HUMIDITY`, `PRECIPITATION_RATE`, `WIND_SPEED`, `WIND_DIRECTION`, `NO2`, `SO2`, `CO`, `O3`, `PM2_5_MASS`, `PM10_MASS`, plus the new `AEROSOL_INDEX`). There is no separate context entity. What was missing was a defined shape for provider, grid resolution and satellite footprint; the schema now carries it:


- Every `origin = modeled_context` measurement must carry `context` (`ContextDescriptor`) and `evidence_state = MODEL_ESTIMATED`; the schema rejects anything else. A `synthetic_scenario` measurement must carry `SYNTHETIC`.
- Provider and source identity stay in `provenance.provider` / `provenance.source_id`. The descriptor adds `product_id`, `product_version`, `measurement_basis`, `temporal_aggregation`, a server-composed `resolution_label` for display, an optional satellite `footprint` (`GeometryTransport`) and the retrieval quality fields `qa_value` and `cloud_fraction`.
- Grid resolution is `spatial_support.nominal_resolution_m`, which is now mandatory whenever `spatial_support.kind` is `grid_cell` or `satellite_footprint`.
- Valid time is `event_time`/`event_time_end` (for a satellite the sensing start/end of the overpass); `processed_at` is ingestion time.


| `context_kind` | `spatial_support.kind` | `measurement_basis` | Unit | `temporal_aggregation` |
| --- | --- | --- | --- | --- |
| `weather_model` | `grid_cell` | `surface_meteorology` | native weather units | `instant`, `hourly_mean`, `hourly_accumulation` or `daily_mean` |
| `air_quality_model` | `grid_cell` | `surface_concentration` | `ug/m3`, `ppb`, … | `hourly_mean` or `daily_mean` |
| `satellite_retrieval` | `satellite_footprint` (footprint polygon required) | `column_density` or `index` | `mol/m2` or `index` | `overpass_snapshot` |


Satellite column densities are never expressed as `ug/m3` and are never blended into PM colours; a low `qa_value` or high `cloud_fraction` sets the `cloud_affected` quality flag. `GET /v1/public/locations/{id}/context` returns the `LocationContext` DTO: `weather`, `satellite` and `air_quality_model` measurement arrays, ranked `nearby_sources` (1 km and 3 km), a resolution notice and the standing no-causation disclaimer.


## 5. Synthetic scenario engine


The generator is a backend module with a published configuration, fixed random seed and immutable version. Its output is stored separately from source observations.


### Generation pipeline


1. Select a real PM2.5/PM10 anchor series and retain its original identity.
2. Create a scenario clock and target action/reference zones.
3. Join time-compatible historical weather/satellite context when available; otherwise use explicitly labelled scenario assumptions.
4. Generate missing local action/reference PM series while preserving plausible relationships: PM10 must not be lower than PM2.5, shared regional trends affect both zones, weather/traffic/source effects are correlated, and missingness/quality flags are reproduced.
5. Add optional PM1, particle-count PM0.3, CO2, HCHO or TVOC only from a documented independent scenario model. Missing optional variables should remain missing when no defensible model is configured.
6. Generate the post-action counterfactual and comparison series for water suppression. Store the assumed effect, uncertainty and confounders as scenario inputs.
7. Validate ranges, units, timestamps, provenance, reproducibility and expected coverage. The computation determines the scenario result; fixtures do not hard-code a desired status.


### Demonstration dataset profile


- Generate 30 scenario days.
- Use hourly background/context for each 2–3 km cell and one-minute mobile observations for 4–6 virtual buses on 6–8 synthetic corridor route versions, about 16 operating hours/day. Six buses produce 172,800 one-minute rows over 30 days. Corridors are chosen jointly with the 12 action zones so every action and reference zone has route coverage.
- Add hourly weather for Delhi districts and optional 15-minute traffic context on selected roads. Weather remains grid/district context, not a road sensor reading.
- Create 12 action instances: three sustained improvements, three temporary improvements, three no-effect outcomes and three inconclusive/confounded outcomes.
- Make one of the three inconclusive/confounded cases an intentional overlapping-action contamination case.
- Ingestion accepts the higher-frequency AirDelhi-style stream, but the demo need not expand it to 3-second rows unless testing throughput.


For every synthetic intervention generate paired `WITHOUT_ACTION` and `WITH_ACTION` timelines with identical background, weather, traffic, route coverage and random disturbances. Only the versioned intervention-response function differs. Water suppression is first; its magnitude, onset and decay are configurable assumptions, never empirical claims.


Synthetic output must expose:


- `scenario_id`, `catalog_version`, `case_id`, `design_intent`, `generator_version` and seed;
- observed anchor IDs;
- context source IDs and spatial resolution;
- assumptions and generated-variable list;
- `valid_time`, `generated_at` and quality flags; and
- a public label whose wording reflects the anchor state: **Synthetic demo — based on historical PM observations and contextual models** when verified observed anchors cover the zone, and **Fully synthetic demonstration — no verified observed anchors in this zone** when none do. The label is computed from the per-zone anchor-overlap table, never hardcoded.


### Scenario catalog — locked


The 12 action cases are fixed in `data/scenarios/scenario-catalog.v1.json` (`scenario_catalog_v1`). The generator does not invent cases. All 12 are evaluated `water_suppression` interventions; the other intervention types stay schema-reserved with no response curve. The catalog is generator input, not output: it fixes design intent, injected confounders and assumed response parameters, while statuses are always computed by the evaluator. Zone binding is confirmed by task 1.6 at Gate 1; the names are candidate Delhi areas whose verified-anchor coverage is not yet known.


| Case | `scenario_id` | Design intent | Candidate zone (pending Gate 1) |
| --- | --- | --- | --- |
| S01 | `water_suppression_sustained_01` | `SUSTAINED_RESPONSE` | Palam–Dwarka corridor (flagship slot) |
| S02 | `water_suppression_sustained_02` | `SUSTAINED_RESPONSE` | Anand Vihar ISBT vicinity |
| S03 | `water_suppression_sustained_03` | `SUSTAINED_RESPONSE` | Rohini Outer Ring Road stretch |
| S04 | `water_suppression_temporary_01` | `TEMPORARY_RESPONSE` | Wazirpur industrial area approach |
| S05 | `water_suppression_temporary_02` | `TEMPORARY_RESPONSE` | Mundka–Nangloi road |
| S06 | `water_suppression_temporary_03` | `TEMPORARY_RESPONSE` | Punjabi Bagh Ring Road stretch |
| S07 | `water_suppression_no_effect_01` | `NO_RESPONSE` | Okhla Phase II approach |
| S08 | `water_suppression_no_effect_02` | `NO_RESPONSE` | Narela–Bawana road |
| S09 | `water_suppression_no_effect_03` | `NO_RESPONSE` | Jahangirpuri GT Karnal Road stretch |
| S10 | `water_suppression_confounded_rain_01` | `RAIN_CONFOUNDER` | ITO–Vikas Marg stretch |
| S11 | `water_suppression_confounded_wind_01` | `WIND_CONFOUNDER` | Vivek Vihar–Patparganj industrial approach |
| S12 | `water_suppression_confounded_overlap_01` | `ACTION_OVERLAP` | Sarai Kale Khan–Ring Road stretch |


- **Flagship slot:** S01 binds to the Gate 1 flagship. If the anchor-overlap table flips the flagship to Anand Vihar ISBT, the two zones swap slots (S01 ↔ S02); case design does not change.
- **Overlap case:** S12 needs an interfering action. It is one non-evaluated auxiliary `road_sweeping` intervention that exists only inside the `ActionOverlapAssessment`; it has no projection or evaluation, so the evaluated count stays 12 and exactly one case contains overlap. Expected S12 outcome is `inconclusive` (usable bins fall below the frozen gate); S10 and S11 are `confounded`.
- **Scheduling:** case *n* runs on scenario day 2*n*, so no two cases share a day and the declared overlap is the only space-time interference.
- **Policy triggers without a demo case** (traffic divergence, low coverage, insufficient bins, failed pre-trend, single wind trigger, reference contamination alone) are covered by task 1.4 evaluation fixtures, not extra demo cases.
- **Run lineage:** each `ScenarioRun` records `catalog_version`, `case_id` and `design_intent`, its action/reference zone-version IDs, the evaluation-plan ID and its `route_version_ids` (at least one). `clock_mode` uses the same `REAL`/`SCENARIO`/`TEST` enum as the API clock.
- Assumed response parameters in the catalog (peak reduction, onset, half-life) are demo assumptions flagged `initial_unvalidated_demo_assumptions`; changing any value creates a new catalog version.


### Demo artifact delivery — locked


The deterministic generator emits one versioned artifact family per scenario, written to immutable Cloud Storage before anything touches the database:


```
gs://<bucket>/aerify-demo/<family_version>/
 observations.csv        one-minute mobile PM (facts only; geometry as WKT)
 context_observations.csv  hourly weather/satellite/model context
 zones.csv / routes.csv  zone and route versions (geometry as WKT)
 geometry/
   districts.geojson     base-map bundle
   analysis_cells.geojson
   measured_roads.geojson  measured segments only
 manifest.json           sha256 + row count per file, generator_version, seed, source versions
```


- Geometry travels as WKT in CSVs and lands in PostGIS `geometry` columns during load; the GeoJSON bundles are generated from the same run and listed in the same manifest (§4.8).
- The Cloud SQL load **is** the deterministic seed (task 2.1): CI replays it from the manifest hashes to prove "same seed → identical artifacts".
- Raw payloads stay immutable; normalization never rewrites a published artifact — a new generator version writes a new `family_version` prefix.


## 6. Action and result model


An officer proposes an intervention and records `action_started_at`, `action_completed_at` and `marked_done_at`. Evaluation is anchored to completion; `marked_done_at` is audit time. Store UTC for computation plus the IANA timezone used for local display. Enforce `started <= completed <= marked_done` unless an audited correction workflow explicitly records why it differs. Media may document the scene, but it is not required and is not analysed to prove execution.


### Zone and workflow contract


- `zones` gives a stable identity; `zone_versions` stores immutable geometry, purpose (`ACTION`, `REFERENCE`, `DISPLAY`), source, effective time and geometry hash. Interventions reference version IDs, never mutable geometry.
- An officer with role `OFFICER` may create and edit a `DRAFT`, select action/reference zone versions, attach restricted media and submit/start the action. Starting is rejected unless an evaluation plan is frozen.
- `POST .../complete` accepts the officer-entered start/completion times and creates server `marked_done_at`, snapshot and due checkpoint jobs atomically.
- Before completion, the creating officer may correct draft/action times. After completion, only `SUPERVISOR` may submit an append-only correction with reason and replacement values.
- A correction creates a new intervention revision, preserves the former revision, supersedes affected snapshots/evaluations and enqueues idempotent recomputation. Published results remain queryable as superseded; the public view defaults to the latest effective revision and exposes a non-identifying correction notice.


### Frozen evaluation plan


Create the evaluation plan during proposal and freeze it at approval, always before `action_started_at`. The immutable plan contains action/reference zone versions, pre/post windows, checkpoints, coverage gates, thresholds, reference-selection evidence, road/matching/segmentation versions, overlap policy, confounder policy and method versions. The evaluator reads only this plan. Any later change requires the supervisor correction/revision path and re-runs every affected result; post-action values must never influence plan selection.


The backend captures the latest eligible action/reference PM and context records at or before `action_completed_at`, including source times and freshness. The full pre/post windows remain separate from this snapshot. If completion is entered late, the scheduler immediately runs all checkpoints whose event-time windows have already closed.


### Action Impact Evaluation Service


Checkpoint schedules are configured per action type. Water suppression defaults to completion, +1 h, +3 h, +6 h and +12 h, with optional +24 h. Each idempotent job recomputes eligible affected roads and containing cells from event time, not processing time, and writes pollutant-specific results. Production uses normal task scheduling; demo mode uses a virtual scenario clock or retroactive completion time; tests use an injected clock and never sleep for hours.


Two result paths must stay distinct:


| Result path | Inputs | Public wording |
| --- | --- | --- |
| `scenario_projection` | Any synthetic pre/post measurement series | **Simulated improvement**, **Simulated no measurable improvement**, **Confounded scenario** or **Insufficient scenario data** |
| `observed_evaluation` | Eligible observed pre/post PM in action and reference areas | **Observed improvement associated with the action**, **No measurable change**, **Confounded** or **Inconclusive** |


A scenario projection is useful for demonstrating the system and planning an intervention. It is not field verification. When actual future after-data exists, the system creates a separate observed evaluation rather than overwriting the scenario result.


For each pollutant P, the observed evaluation may use paired time-bin difference-in-differences:


`effect_P = (action_post_P - action_pre_P) - (reference_post_P - reference_pre_P)`


Store sample counts, independent bins, source count, interval, thresholds, method version, confounders and limitations. PM2.5 and PM10 can have different conclusions. AQI and camera media are excluded from this short-window impact calculation.


Select one or more reference areas using similar pre-action level/trend, road/land-use class, time-of-day coverage and weather exposure, while excluding the treatment radius. Store the selection method/version. If overlap or pre-trend checks fail, return `inconclusive` rather than manufacturing a counterfactual.


### Overlap and confounder policy


For each action, define an influence geometry from its action-zone geometry plus the action-type buffer and an influence interval from `action_started_at` through the final configured checkpoint. Before every evaluation, intersect it with all other non-cancelled action influence geometries/intervals:


- overlap with the treatment area marks affected bins `MULTI_ACTION_CONTAMINATION`;
- overlap with a reference zone marks the reference invalid;
- exclude contaminated bins; if the frozen minimum-bin/coverage gate then fails, return `confounded` or `inconclusive` and never an improvement status.


The demo does **not** fit weather-adjusted causal coefficients. It uses predeclared automatic exclusion/label rules, avoiding an unvalidated model trained on synthetic data. `water_suppression_demo_policy_v1` locks these gates:


| Trigger in action or reference comparison window | Automatic outcome |
| --- | --- |
| Coverage below 75% or fewer than three independent 15-minute bins | `INSUFFICIENT_EVIDENCE` / `inconclusive` |
| Rain rate ≥0.5 mm/h in two or more post-action 15-minute bins | `confounded` |
| Pre/post median wind-speed change ≥2 m/s or circular direction shift ≥45° | `confounded` |
| Action/reference traffic-index change differs by >0.20 on the normalized 0–1 scale | `confounded` |
| Treatment/reference overlap or another action contaminates required bins | `confounded`; `inconclusive` if usable bins fall below the gate |


Below-threshold weather/traffic changes remain disclosed, not statistically adjusted. These are fixed demo-policy values, not universal scientific thresholds. Publishing a real observed-effect association remains disabled until an environmental reviewer approves a production policy version.


### Confounder findings — locked


`confounders` on `ScenarioProjection` and `ObservedEvaluation` is a list of structured `ConfounderFinding` records, not strings. Each carries `code` (`RAIN`, `WIND_SPEED_CHANGE`, `WIND_DIRECTION_SHIFT`, `TRAFFIC_DIVERGENCE`, `ACTION_OVERLAP`, `REFERENCE_CONTAMINATED`, `LOW_COVERAGE`, `INSUFFICIENT_BINS`, `PRETREND_FAILED`), `state` (`DISCLOSED` below threshold, or `TRIGGERED`), the forced `outcome` (`confounded` or `inconclusive`), `applies_to`, `observed_value`, `threshold`, `unit`, `policy_version`, `input_measurement_ids` and a server-composed `display_text`. The UI renders `display_text` and may style by `code` and `state`; it never composes wording or evaluates thresholds. `limitations` remain plain server-supplied strings.


- Triggered `RAIN`, `WIND_*` and `TRAFFIC_DIVERGENCE` force `confounded`; triggered `LOW_COVERAGE`, `INSUFFICIENT_BINS` and `PRETREND_FAILED` force `inconclusive`; `ACTION_OVERLAP` and `REFERENCE_CONTAMINATED` force whichever the bin gate dictates.
- Precedence: any triggered `inconclusive` finding makes the status inconclusive; otherwise any triggered `confounded` finding makes it confounded.
- The schema enforces status consistency: an improvement or no-change status cannot coexist with a triggered finding, and a confounded/inconclusive status must contain a triggered finding of the matching outcome.


### Authoritative clock


- Every environment injects one server-side `ClockService`: `REAL` in production/staging, `SCENARIO` in the public demo and `TEST` in automated tests.
- Demo clock state is deployment/scenario scoped and stored server-side (`scenario_id`, wall anchor, scenario anchor, speed, paused state, revision). Clients cannot override time through headers or query parameters.
- API responses include `clock_mode`, `effective_now`, `scenario_id` and `clock_revision`. The UI uses only this server time for freshness and “last updated.”
- Worker jobs store event-time due dates; the scheduler maps them through the same clock. Late completions immediately enqueue all due checkpoints.
- Cache keys include schema version, scenario ID, clock revision and effective time bucket. Changing/rewinding the demo clock increments its revision and invalidates prior cache namespaces.


## 7. AQI and pollutant derivation


- Ingest or generate concentrations; derive AQI/sub-indices from them. Never generate AQI independently.
- Compute pollutant sub-indices only for valid averaging windows and store the standard, algorithm version, averaging window and sufficiency decision.
- A regulatory-style CPCB overall AQI requires the CPCB sufficiency rules, including at least three qualifying pollutants, one of which is PM2.5 or PM10, and the required temporal coverage. The overall index is the maximum qualifying sub-index.
- With only PM2.5 and PM10, expose pollutant concentrations, their sub-indices and optionally `estimated_local_aqi`/`pm_based_air_quality_indicator`; never label it official or regulatory CPCB AQI.
- Official station AQI is displayed as received, with its source and time. It is not treated as a street measurement or used as the primary short-window action-effect outcome.


## 8. Public map and location experience


### City overview


- Display Delhi as a district choropleth or accessible tiled/hex map with PM2.5, PM10 or official AQI selection.
- Each district shows value, category, source type, last update, coverage and observed/modelled/synthetic badge.
- Selecting a district opens its 2–3 km cells; selecting a cell opens named areas and measured road segments.
- Colour by `MapAggregate.category`, which the server computes from a versioned legend (see Legend bands below). Pair every colour with the band's text label for colour-blind accessibility.
- Satellite, weather, official stations, mobile routes and possible-source layers can be toggled independently.


### Legend bands — locked


- `MapAggregate.category` is a `BandId` (`GOOD`, `SATISFACTORY`, `MODERATE`, `POOR`, `VERY_POOR`, `SEVERE`) computed on the server as the band containing `value` (`boundary_rule = upper_inclusive`: lower < value ≤ upper, with the first band including 0). It is null whenever `value` is null.
- **The API returns the legend bands.** `GET /v1/public/legends?metric=` returns `Legend[]`, and every aggregate with a category carries its `legend_id`. Category and legend come from one versioned source, so a legend can never disagree with the colours after a threshold revision. The UI holds a palette keyed by band `id`/`severity_rank` and always shows the band label as text; it hard-codes no thresholds.
- Band sets live in `data/legends/legend-bands.v1.json`: `cpcb_pm25_conc_v1` and `cpcb_pm10_conc_v1` (`kind = concentration_band`, mandatory "not an AQI" notice) and `cpcb_aqi_v1` (`kind = official_aqi`, official station AQI only). PM1 and context metrics have no legend and are not band-coloured.
- Bands are immutable per `id`/`version`; a revision creates a new legend. Values are marked `pending_source_check` until compared with the CPCB document.


### “Near you” card


Use device location only with user permission. Show:


1. the nearest recent eligible road/bus observation, with distance and time;
2. the nearest official monitoring station AQI as a separate row;
3. modelled regional context if no observation is close enough; and
4. nearby-city official AQI cards.


Call a value **street-level** only when it comes from an eligible observation on or near that road within configured distance and freshness limits. Otherwise use wording such as **nearest road observation**, **nearest station** or **regional model estimate**. Fallback wording is parameterized by zone: the same per-zone anchor-overlap table that drives the synthetic label also decides which fallback rows a zone can honestly show, and a zone with no verified observed anchors never receives observation-grade wording.


### Map aggregation safeguards


- District/cell colours include a minimum coverage rule.
- A route reading expires after a configured freshness window.
- Aggregations use robust statistics and keep sample/source counts.
- Users can open provenance details for each value.
- Official Indian AQI is displayed only when received from an official source or calculated from eligible pollutant inputs using a declared Indian AQI method and averaging period.


## 9. Storage


Use three logical layers while keeping the prototype operationally simple:


| Layer | Prototype | Scale path |
| --- | --- | --- |
| Raw/bronze | Versioned Cloud Storage payloads partitioned by source/date/hour | Retain unchanged. |
| Operational/silver | Google Cloud SQL PostgreSQL/PostGIS normalized observations, context, map matching and quality state | Add an asynchronous BigQuery analytical mirror, partitioned by event date, when batch analytics or SQL-native AI are enabled. |
| Derived/gold | Google Cloud SQL PostgreSQL/PostGIS road windows, cells, AQI/sub-indices and evaluations | Materialize selected analytical tables in BigQuery; publish approved outputs back through the API. |
| Transactional | The same PostgreSQL database for actions, workflows, scenario configs and job state | Do not add Firestore unless a separate product need emerges. |


The 30-day six-bus demo is only 172,800 one-minute records, so moving the prototype's source of truth to BigQuery and splitting workflow state into Firestore would add complexity without a demonstrated capacity benefit. PostGIS is already required for frequent road/polygon/radius operations. BigQuery is nevertheless useful as an optional analytical/AI extension: scheduled SQL can create large temporal/geospatial summaries, and `AI.GENERATE`/structured generation can batch-create draft explanations or classify free text beside warehouse data. It is not on the synchronous map/API path and its LLM output is never authoritative evidence.


Suggested tables:


- `datasets`, `source_licenses`, `sensor_devices`
- `routes`, `route_versions`
- `observations`, `context_observations`, `satellite_observations`
- `facilities`, `source_geometries`, `administrative_areas`, `analysis_cells`, `road_network_versions`, `road_segments`, `road_segment_crosswalks`, `observation_road_matches`
- `scenario_definitions`, `scenario_runs`, `scenario_values`, `generation_lineage`
- `hotspots`, `map_aggregates`, `simulations`
- `zones`, `zone_versions`, `zone_anchor_overlap`, `interventions`, `intervention_revisions`, `evaluation_plans`, `action_checkpoint_schedules`, `action_context_snapshots`
- `scenario_results`, `observed_evaluations`, `verification_pollutants`
- `camera_media`, `runtime_clocks`, `evaluation_jobs`, `audit_events`, `app_users`, `legend_band_sets`, `scenario_catalog_entries`


Raw records are immutable. Derived aggregates and scenario outputs reference their complete input set or an immutable input snapshot. PostGIS performs point-in-district, cell and radius queries. BigQuery may be added when real history or scale justifies it.


Partition/index event-time tables by event date/time and source/device; add spatial indexes for geometry. Store `event_time` and `processed_at` separately throughout.


## 10. API changes


| HTTP | Purpose |
| --- | --- |
| `GET /v1/public/cities/delhi/overview?metric=&time=` | District map with coverage and provenance. |
| `GET /v1/public/districts/{id}/cells?metric=&time=` | 2–3 km cell drill-down. |
| `GET /v1/public/cells/{id}/roads?metric=&time=` | Measured roads/areas and freshness. |
| `GET /v1/public/nearby?lat=&lng=&radius_km=` | Nearest observation, station and nearby-city summaries. |
| `GET /v1/public/locations/{id}/context` | `LocationContext`: weather, satellite, regional air-quality model and possible nearby sources (§4.9). |
| `GET /v1/public/scenarios` | The 12 catalog cases as `ScenarioRun[]` (case ID, design intent, label, lineage) for the scenario explorer (§5). |
| `GET /v1/public/scenarios/{id}` | One `ScenarioRun` with its timeline, lineage and projections. |
| `GET /v1/public/legends?metric=` | `Legend[]` band sets that define `MapAggregate.category` (§8). |
| `GET /v1/me` | `SessionInfo`: role, capabilities, auth mode, clock (§11). |
| `GET /v1/public/zones?purpose=&district_id=` | Public zone catalog; filters on the zone entity's `district_id` (§4.8); returns `ZoneSummary[]` (district, anchor state, server-computed display label, `observation_grade_wording_allowed`, geometry status, flagship status, catalog case, route versions). |
| `GET /v1/public/zones/{id}` | Zone metadata and versioned geometry (embedded `geometry`, hash-verifiable; §4.8). |
| `GET /v1/public/geometries?ids=...` | Batch geometry fetch for zones/routes by ID, as `GeometryTransport` (§4.8). |
| `GET /v1/public/interventions?zone_id=&status=&cursor=` | Paginated public intervention list. |
| `GET /v1/public/interventions/{id}` | Officer-reported action and any later observed evaluation. |
| `GET /v1/public/interventions/{id}/evaluations` | Completion and delayed checkpoints with evidence state and reference comparison. |
| `POST /v1/officer/interventions` | Create draft with action/reference zone versions and evaluation-plan draft. |
| `PATCH /v1/officer/interventions/{id}` | Edit draft metadata before start/completion lock. |
| `POST /v1/officer/interventions/{id}/start` | Freeze evaluation plan and record action start. |
| `POST /v1/officer/interventions/{id}/complete` | Record completion, server Mark Done, snapshot and checkpoint jobs atomically. |
| `POST /v1/officer/interventions/{id}/media` | Attach restricted contextual media metadata/object reference. |
| `POST /v1/supervisor/interventions/{id}/corrections` | Append audited correction, supersede affected results and re-run. |
| `POST /v1/internal/ingest/{source}` | Authenticated source ingestion. |
| `POST /v1/internal/scenarios/{id}/generate` | Idempotent deterministic generation; emits the CSV/GeoJSON artifact family and manifest (§5). |


Responses use one contract and include `schema_version`, `data`, `provenance`, `coverage`, `generated_at` and warnings as applicable. Public queries cannot enumerate private media or raw officer identities.


Mutating endpoints require an idempotency key and optimistic revision. Role checks are enforced by FastAPI, not UI visibility.


## 11. Runtime and security


- React + TypeScript + Vite frontend on Firebase Hosting.
- FastAPI on Cloud Run as the only operational API.
- Private Cloud Run worker invoked by OIDC-authenticated Cloud Tasks.
- Google Cloud SQL for PostgreSQL with the PostGIS extension is the only operational database in development, CI and demo.
- Firebase Auth for sign-in only; the backend verifies ID tokens and reads roles from the Cloud SQL `app_users` table (see Roles and auth).
- Secret Manager for third-party API keys only (weather, satellite and registry providers); ADC/workload identity for every Google Cloud service, **including Gemini on Vertex AI**, so there is no Gemini API key anywhere (see Gemini access).
- Cloud Storage for restricted media.
- Cache public aggregates and contextual API results by source time/resolution to control cost and rate limits.


### Roles and auth — locked


- Roles are `PUBLIC` (anonymous), `OFFICER` and `SUPERVISOR`. `SUPERVISOR` has every `OFFICER` capability plus `SUBMIT_CORRECTION`. A role is never a field on a public DTO and is never asserted by the client.
- Firebase Auth is the sign-in (identity) provider only; it stores no roles and no data. FastAPI verifies the Firebase ID token to obtain the user's stable identity (`uid`), then reads the role from the Cloud SQL `app_users` table (`firebase_uid`, `role`, `active`, pseudonymous `actor_ref`), which is the single source of truth for roles. No Firebase custom claims are used. A verified token with no active `app_users` row is treated as `PUBLIC`.
- `GET /v1/me` returns `SessionInfo`: `role`, `capabilities`, `auth_mode` (`FIREBASE` or `FIXTURE`) and clock metadata. Anonymous callers get `PUBLIC`. Capabilities (`VIEW_PUBLIC`, `VIEW_RESTRICTED_MEDIA`, `CREATE_DRAFT`, `EDIT_DRAFT`, `START_ACTION`, `COMPLETE_ACTION`, `ATTACH_MEDIA`, `SUBMIT_CORRECTION`) exist so the UI can show controls and denial states; FastAPI enforces every check and returns 403 regardless of UI state.
- Service callers (`/v1/internal/*`, Cloud Tasks) authenticate with OIDC service accounts and have no human role.
- The deployed demo uses the same path: seeded Firebase sign-in accounts mapped to seeded `app_users` rows (one officer, one supervisor), never an unauthenticated role header. A role switcher exists only in the UI's `FixtureApi` mode, which serves fixture `SessionInfo` (`auth_mode = FIXTURE`); in `HttpApi` mode it becomes a demo sign-in picker for the seeded accounts, with roles still read from `app_users`.
- Officer identity (`actor_ref`) appears only in `audit_events` and officer/supervisor views; public DTOs never carry it (§10).


### Development, staging and CI


- Do not install or run PostgreSQL/PostGIS locally and do not use Docker Compose for the database. For the hackathon, one small non-HA Cloud SQL instance may contain isolated `aerify_dev`, `aerify_ci` and `aerify_demo` databases with separate least-privilege roles. A real production deployment must use a separate instance/project boundary.
- Prefer a deployed development FastAPI service on Cloud Run. When the backend is run on a developer machine, it connects directly to `aerify_dev` through the Cloud SQL Python Connector with Application Default Credentials; no Cloud SQL Auth Proxy, static database password or unrestricted public-IP allowlist is required.
- Cloud Run API/worker connect through the Cloud SQL integration using a dedicated service account and IAM database authentication. Use private IP where the project network is configured, require encrypted connector traffic and place any bootstrap-only database credential in Secret Manager.
- Set a small SQLAlchemy pool (for example 2–5 connections per instance), no unnecessary minimum Cloud Run instances and a Cloud Run maximum-instance cap consistent with the Cloud SQL connection limit. Retry transient connection failures with bounded backoff; never retry a non-idempotent transaction blindly.
- Staging/demo uses separate Cloud Run API/worker, `aerify_demo` database, storage prefix/bucket, task queue and Firebase configuration. Synthetic seed/reset is allowed only in dev/CI/demo and is denied by role in any future production database.
- Alembic owns all schema migrations. CI authenticates through Workload Identity Federation plus the Cloud SQL connector, creates a unique empty schema in `aerify_ci`, enables no extensions dynamically, migrates/seeds/tests it and drops only that run's schema in an always-run cleanup step. PostGIS is pre-enabled by the controlled bootstrap migration.
- CI required checks: JSON/JSON-Schema fixtures; Alembic upgrade from an empty schema; backend format/type/unit/integration tests; OpenAPI generation; generated TypeScript client with a zero-diff assertion; frontend lint/unit/build; Playwright observed/modeled/synthetic/stale/no-data/officer/correction paths; container build; secret scan.
- Protect the integration branch: required checks and review must pass; changes to `contracts/`, migrations and generated clients require contract-steward review from whoever owns the contract/platform workstream at that time. Generated contract drift fails CI rather than being committed silently.


## 12. AI boundaries


Read-only tools may expose hotspot evidence, map coverage, weather context, satellite context, nearby-source candidates, scenario lineage, computed projections and observed evaluations. The agent may state hypotheses and limitations with source IDs. It cannot:


- convert satellite context into a factory-causation claim;
- convert a video into an AQI measurement;
- infer HCHO/TVOC/CO2 from PM without an approved model;
- turn synthetic values into observed evidence;
- confirm an officer action; or
- publish/change a numerical result.


If Gemini is unavailable, deterministic summaries remain available and the product continues to function.


### Specialized GenAI narrative agents — locked

In accordance with `pricing.md` (*"one generated/cached Gemini narrative per changed hotspot, recommendation or outcome"*), the GenAI layer is specialized into three bounded agents:

1. **Hotspot & Source Attribution Hypothesis Agent (`aerify-hotspot-agent`):** Ingests road-level particulate readings, wind vectors, Sentinel-5P NO2 columns ($mol/m^2$), and registered industrial facilities (1 km / 3 km) via `get_hotspot_evidence`, `get_map_coverage`, and `get_context`. Generates objective spatial narratives. Strictly forbidden from asserting factory causation.
2. **Intervention Planning & Scenario Simulation Agent (`aerify-simulation-agent`):** Explains counterfactual pre/post water-suppression curves ($S01\text{--}S12$) and reference comparability via `get_scenario_lineage` and `get_context`. Strictly forbidden from treating synthetic curves as observed reality.
3. **Field Verification & Confounder Audit Agent (`aerify-audit-agent`):** Explains empirical difference-in-differences outcomes at +0h, +1h, +3h, +6h, +12h checkpoints and supervisor corrections via `get_evaluation_results` and `get_context`. Formats structured `ConfounderFinding` records and enforces status consistency. Strictly forbidden from changing numeric results or overriding policy gates.


### Gemini access — locked


- Gemini is called through **Vertex AI** (the Google Gen AI SDK or ADK configured for Vertex) using Application Default Credentials. The FastAPI Cloud Run service account holds `roles/aiplatform.user`; developers use their own ADC. No Gemini API key, AI Studio key or static credential exists in the repository, Secret Manager or CI.
- The pinned model is **Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`)**; the backend rejects any higher-cost model tier unless configuration explicitly overrides it. Note: Google limits `2.5` model access to projects with prior usage; if a new project lacks `2.5` access, fallback to `gemini-3.5-flash-lite` via configuration. Model ID, region and generation settings remain configuration, not hardcoded strings, and the exact model version used is recorded with every stored narrative.
- **Pay-as-you-go cost controls:** enforce a Cloud Billing enforced spend cap budget on Vertex AI, set explicit Vertex AI per-minute/daily request and token quotas in GCP IAM & Admin -> Quotas, and enforce a strict application-level daily call/token ceiling in backend code that fails closed to deterministic summaries when reached.
- Calls are bounded: low-latency explanations use a small validated evidence packet through the read-only MCP tools below; Vertex quota or outage falls back to the deterministic summaries.
- A Google AI Studio prototype may use a temporary AI Studio key during UI design only; it is never carried into the repository or deployment.


### Read-only MCP tool layer — locked


Gemini/ADK reaches evidence through read-only MCP tools over governed SQL views, never raw tables. MCP Toolbox for Databases (googleapis/genai-toolbox) runs on Cloud Run with a Cloud SQL PostgreSQL source; ADK/Gemini consumes its tool surface.


- Governed **gold views** precompute `evidence_state`, coverage, provenance mix and the synthetic badge on every row, so no tool can serve an unmarked synthetic value.
- The MCP database role is `SELECT`-only on views: no base tables, no writes, no DDL. Officer writes (auth, idempotency, corrections) never pass through MCP; they remain FastAPI endpoints with database roles enforcing the boundary.
- Every tool response carries `schema_version`, provenance and the same evidence wording as the public API (§12 AI boundaries above apply to each tool verbatim).
- Tool surface (initial): `get_hotspot_evidence`, `get_map_coverage`, `get_context`, `get_scenario_lineage`, `get_evaluation_results`. Parameters are validated in the toolbox config; responses are size-capped.


### Optional BigQuery AI path


Use BigQuery AI only for asynchronous, reviewable enrichment such as batch draft hotspot narratives, clustering/classifying officer notes, anomaly-triage labels, or embeddings/search across reports. First reduce observations to compact, provenance-rich rows; do not send every sensor row to an LLM. Persist prompt/model/version/status/cost metadata and validate structured output before publishing. Deterministic SQL/Python remains responsible for AQI, concentrations, action effects, evidence states and alert thresholds. Direct Gemini calls from the service remain preferable for low-latency interactive explanations over a small evidence packet.


## 13. Delivery changes from the previous architecture


1. Add weather, satellite and nearby-source registry adapters to demo context ingestion.
2. Add spatial-support and temporal-support metadata to every record.
3. Add a versioned fusion and synthetic generation service with lineage.
4. Split scenario projections from observed intervention evaluations.
5. Add district → 2–3 km cell → measured-road APIs and UI.
6. Add a permission-based “Near you” card and nearby-city official AQI.
7. Expand the contract to optional PM1, particle-count PM0.3, CO2, HCHO and TVOC without making them required evidence.
8. Preserve raw collection cadence while adding one-minute, 15/30/60-minute and road/cell derived layers.
9. Add three action timestamps, event-time checkpoint scheduling and catch-up evaluation.
10. Add evidence-state and AQI-sufficiency contracts.
11. Generate 30-day paired scenario branches and 12 outcome cases with an injectable clock.
12. Add immutable raw object storage and calibration/version lineage; keep PostGIS for the prototype and allow an optional asynchronous BigQuery analytics/AI mirror.
13. Add PostGIS geometries, coverage/freshness rules and no-data states.
14. Move satellite from deferred scope into contextual MVP scope; retain live Earth Engine automation as optional if access or time is limited.
15. Update fixtures and prompts so synthetic data is never labelled verified impact.
16. Add immutable zones/evaluation plans, full officer/supervisor endpoints and re-versioning corrections.
17. Lock the OSM/Geofabrik → self-hosted OSRM map-matching pipeline and versioned segment IDs.
18. Add overlap contamination and automatic, versioned disclosure/exclusion gates.
19. Propagate a server-owned clock through API, UI, workers and caches.
20. Replace the local database topology with direct Google Cloud SQL PostgreSQL/PostGIS access, isolated dev/CI/demo databases, IAM/connector authentication, bounded connection pools and required CI contract-drift gates.
21. Add versioned `routes`/`route_versions` with observed-trace and synthetic-corridor purposes, and plan the 6–8 synthetic corridors jointly with the 12 action zones so every zone has route coverage.
22. Add the per-zone anchor-overlap table, confirm the flagship zone from it at Gate 1, and compute synthetic display wording and Near You fallback wording from the zone's verified anchor state.
23. Define the weather/satellite `ContextDescriptor`, the `LocationContext` DTO and the `AEROSOL_INDEX`/`mol/m2`/`index` additions.
24. Replace confounder strings with structured `ConfounderFinding` records and enforce status consistency in the schema.
25. Fix the 12-case scenario catalog and add `catalog_version`, `case_id`, `design_intent` and zone/plan/route lineage to `ScenarioRun`.
26. Add `Role`, `Capability`, `SessionInfo` and `GET /v1/me`; keep roles off public DTOs.
27. Add server-owned legend bands, `legend_id` on aggregates and `GET /v1/public/legends`.
28. Add `ZoneSummary` with computed anchor state; mark pre-Gate-1 geometry as `PLACEHOLDER` and define the canonical geometry hash.


## 14. Release gates


- JSON Schema validates observed, modeled, synthetic and derived examples.
- Same seed and source snapshot reproduce identical scenario output.
- Historical/current time mismatch is rejected or clearly flagged.
- Optional gases cannot be populated without source or approved generator lineage.
- District/cell/road aggregation honours freshness and minimum coverage.
- “Near you” falls back accurately when no street observation exists.
- Scenario projection and observed evaluation have different DTOs and UI wording.
- Satellite/factory context never produces a causal statement.
- Public UI exposes source, time, spatial resolution and synthetic badge.
- Officer auth, public redaction and task idempotency pass integration checks.
- AQI labels fail closed when pollutant or temporal sufficiency is unmet.
- Late Mark Done executes already-due checkpoint jobs using event time.
- Any BigQuery AI output is batch-only, reviewable and excluded from authoritative calculations.
- An action cannot start without a frozen pre-action evaluation plan and immutable zone versions.
- A completed action correction creates a new revision and superseded/recomputed evaluations.
- Overlap, weather, traffic and coverage fixtures exercise automatic policy outcomes.
- Map matching records network/segmentation/matcher versions and rejects low-confidence points.
- Every action and reference zone in the demo dataset sits on a route version; generator lineage records the route version IDs it used.
- A zone with zero verified observed anchors displays the fully-synthetic label and observation-grade wording is suppressed for it.
- A zone whose anchor state is `UNVERIFIED` (before Gate 1) fails closed to the same fully-synthetic wording; placeholder geometry is never loaded into Cloud SQL.
- A `modeled_context` measurement without a `ContextDescriptor`, or not `MODEL_ESTIMATED`, fails schema validation; a satellite retrieval without a footprint or a column density in `ug/m3` fails validation.
- Confounder findings are structured; a confounded or inconclusive status without a matching triggered finding, or an improvement status with any triggered finding, fails schema validation.
- `MapAggregate.category` is always a band of the legend named by `legend_id`; the UI contains no threshold constants.
- The scenario catalog contains exactly 12 evaluated cases (3/3/3/3) with exactly one overlap case; `python architecture/contracts/tools/validate_contracts.py` passes in CI.
- Role checks are enforced by FastAPI; `GET /v1/me` capabilities never grant more than the verified role.
- API, worker, UI freshness and caches agree on the same server-provided effective time.
- OpenAPI → generated TypeScript produces no CI diff and a unique empty schema in the `aerify_ci` Cloud SQL/PostGIS database migrates/seeds successfully.


## Sources


- IIT Delhi mobile PM dataset: https://www.cse.iitd.ac.in/pollutiondata/delhi/about
- CPCB air-quality portal: https://airquality.cpcb.gov.in/ccr/
- CPCB AQI method: https://airquality.cpcb.gov.in/ccr_docs/How_AQI_Calculated.pdf
- Open-Meteo weather/history: https://open-meteo.com/en/docs/historical-weather-api
- Sentinel-5P products: https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-5p
- Open-Meteo/CAMS air-quality model resolution: https://open-meteo.com/en/docs/air-quality-api
- Low-cost sensor evaluation in India: https://indiset.cstep.in/
- Google Maps heatmap deprecation: https://developers.google.com/maps/deprecations
- AirDelhi paper: https://proceedings.neurips.cc/paper_files/paper/2023/file/ee799aff607fcf39c01df6391e96f92c-Paper-Datasets_and_Benchmarks.pdf
- Tokyo provisional one-minute PM2.5: https://catalog.data.metro.tokyo.lg.jp/dataset/t000009d2000000067
- Japan AEROS/Soramame: https://soramame.env.go.jp/
- Oakland repeated mobile road mapping: https://pubs.acs.org/doi/10.1021/acs.est.7b00891
- Google Air Quality API: https://developers.google.com/maps/documentation/air-quality/overview
- BigQuery generative AI: https://cloud.google.com/bigquery/docs/generative-ai-overview
- OpenStreetMap/Geofabrik India extracts: https://download.geofabrik.de/asia/india.html
- OSRM Match service: https://project-osrm.org/docs/v26.4.0/index.html
- GitHub required status checks: https://docs.github.com/en/pull-requests/reference/status-checks



