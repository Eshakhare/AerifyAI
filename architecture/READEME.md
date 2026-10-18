# Aerify AI architecture handoff (Revision 0.14)


**Architecture Version:** `0.14` | **Schema Version:** `0.9` — Updated **18 October 2026** (incorporates National Multi-State Expansion with dynamic geolocation & state selector dropdown, District Detail View transformation to pure Google Telemetry with weekly/monthly point line charts, Govt Actions multi-select area filter, Action Center compact list view with configurable 15s–3d measurement intervals, and complete purge of bus datasets).


Aerify AI operates on a **Google-Native Environmental Evidence Model**: live 500m conditions and 30-day hourly historical telemetry from the Google Air Quality API (`currentConditions:lookup` & `history:lookup`), pollen forecasts from the Google Pollen API (`forecast:lookup`), meteorological data from the Google Weather API, and reverse-geocoding via the Google Geocoding API. The platform integrates ESA Copernicus Sentinel-5P (TROPOMI spectrometer) satellite trace gas columns and CAMS atmospheric dispersion assimilated directly into Google's 500m continuous surface grid. All records preserve strict provenance, timestamps, spatial support, and measurement units.

The system completely retires synthetic bus fleets, video cameras, and mock corridor generators. Physical CPCB/DPCC continuous ambient air quality monitoring stations (CAAQMS) provide ground-truth station anchors where present; for districts without physical stations, the platform provides a clear, transparent notice while displaying 500m satellite-assimilated telemetry.

The platform provides a **National Multi-State Geographic Hierarchy**:
1. **Dynamic Geolocation & State Selector**: Auto-detects the user's state (Delhi, Karnataka, Maharashtra, Uttar Pradesh, etc.) and districts via browser GPS and Google Geocoding, with a State Dropdown and `[Reset to My Location]` button directly above the interactive Google Vector Map.
2. **Persistent Hyper-Local "Near You" Card**: Detects exact citizen locality, street-level AQI, pollen risk, and chemical concentrations.
3. **District Detail Pure Google Telemetry**: Computes rolling 4-hour and 24-hour averages from Google AQI API `history:lookup`, accompanied by an interactive **Weekly (7 Days) / Monthly (30 Days) Point-Based SVG Line Graph** showing daily average trends.

Municipal interventions (e.g. anti-smog guns, mechanical road sweepers, water cannons) are deployed across recognized municipal hotspots. Actions record creation, start, completion, and Mark Done timestamps. Officers can configure **4 custom post-action measurement intervals** (ranging from **15 seconds** for instant testing up to **3 days** / 72 hours). At each maturing checkpoint, the system automatically queries Google Environmental APIs to evaluate Difference-in-Differences (DiD) causal impact against contemporaneous untreated control hotspots.

Dual-Path Production Authentication enforces zero dev-mode bypasses:
- **Citizens** authenticate via Firebase Google Login to access their personalized **"Actions in Visited Places"** ledger, tracking municipal clean air operations conducted at their visited hotspots within the last 30 days (1 month).
- **Municipal Officers** authenticate via official department credentials (`@mcd.delhi.gov.in`, `@mcgm.gov.in`) verified against the Cloud SQL `app_users` table to unlock operational command and checkpoint scheduling.

Policy Directives (e.g., GRAP-IV, Odd-Even Scheme, Firecracker Bans, Green War Room AI Command Center, BMC Dust Mitigation Mandates) are managed as **authoritative statutory records in Cloud SQL**, scoped dynamically by state, and validated via a two-tier pipeline: authenticated administrative entry plus automated PIB/CAQM gazette parsing with Vertex AI Gemini 2.5 Flash-Lite.

Google Cloud SQL for PostgreSQL with PostGIS is the sole operational database (connected via `google-cloud-sql-connector` with IAM authentication, requiring zero static database passwords). All user-facing interfaces strictly exclude internal vendor jargon.


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
| **0.12** | - **Google-Native Environmental Architecture**: Integrated Google Maps Platform Environmental APIs (Google Air Quality API `currentConditions:lookup` & `history:lookup`, Google Pollen API, Weather context).<br>- Replaced synthetic bus simulations with Google Air Quality API 30-day hourly historical telemetry and 500m grid resolution across Delhi.<br>- Grounded regional satellite context in ESA Copernicus Sentinel-5P (TROPOMI spectrometer) trace gas and CAMS assimilation via Google Air Quality API.<br>- Re-anchored municipal actions to 500m Hotspot Zones and Municipal Wards, aligning directly with Delhi's 13 CPCB Winter Action Plan hotspots.<br>- Enabled Difference-in-Differences (DiD) causal impact evaluation using real Google 30-day historical curves for treated hotspots vs. untreated control areas across +3h, +6h, +12h, +24h checkpoints.<br>- Officially pruned and retired fleet cameras from the active architecture to focus 100% on environmental telemetry and action verification. |
| **0.13** | - Production authentication overhaul: user roles resolved strictly from Cloud SQL `app_users`, unlisted emails default to `PUBLIC` citizen.<br>- Added Google account profile chip with avatar and one-click Sign Out in top header.<br>- Citizen "Actions in Visited Places" ledger with user-scoped persistence and strict 30-day (1-month) filter rule.<br>- Added card skeleton loaders in Near You and Environmental Context Drawer.<br>- Plain-English vocabulary cleanup: renamed "Your Street", "Nearest Station", "Whole City", and purged technical vendor jargon. |
| **0.14** | - **National Multi-State Expansion**: Dynamic GPS state detection (Delhi, UP, Maharashtra, MP, etc.) and state selector dropdown above map with `[Reset to My Location]`.<br>- **District Detail Pure Google Telemetry**: Rolling 4h/24h averages computed from Google AQI API `history:lookup`, graceful notice for districts without continuous physical CPCB stations, and weekly/monthly point-based SVG line graph replacing 24-hour bus bar columns.<br>- **Govt Actions Page Redesign**: Purged Detailed Sensor Audit tab, decoupled policy directives from sensor readings, added state selector dropdown, and multi-select area filter with tag bar & empty states.<br>- **Municipal Action Center Redesign**: Chronological sorting (pending execution on top, measuring impact below), compact line-item list with right-side details panel, and configurable 4-checkpoint measurement intervals (15 seconds to 3 days).<br>- Planned formal database deprecation and dropping of `mobile_sensor_telemetry` table. |
