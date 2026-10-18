# Aerify AI — Google-Native Municipal Environmental Platform

> **"Don’t just measure pollution. Scientifically verify whether the clean air action worked."**

Aerify AI is a production-grade, Google-native municipal air quality and clean air action verification platform. It fuses live 500m grid telemetry, 30-day historical data, and multi-allergen forecasts from Google Maps Platform Environmental APIs with Google Cloud SQL (PostGIS) and Google Cloud Vertex AI (Gemini 2.5 Flash-Lite) to monitor urban pollution hotspots, dispatch field interventions, and mathematically verify clean air impacts.

---

## 🌟 Core Pillars & Capabilities (Revision 0.14)

### 1. Dual-Path Production Authentication & Citizen Civic Protection
* **Citizens:** Authenticate with personal Google accounts via Firebase to unlock a personalized **"Actions in Visited Places"** ledger.
  * Cross-references the citizen's visited hotspots against municipal clean air operations conducted within the last **30 days (1 month)**.
  * Displays pre/post AQI reductions, current AQI, pollen risk, and chemical concentrations.
  * Strictly hides locations where no action was taken or where actions are older than 30 days.
* **Municipal Officers:** Authenticate using official Department Email & Password (`@mcd.delhi.gov.in`, `@mcgm.gov.in`) verified directly against the Cloud SQL `app_users` table to access operational dispatch and checkpoint scheduling.
* **Zero Dev Bypasses:** Completely purges 1-click role switchers, demo account buttons, and dev toggles.

### 2. National Multi-State Expansion
* **Automatic Geolocation Detection:** Detects user state (Delhi, Karnataka, Maharashtra, Uttar Pradesh, etc.) and districts via browser GPS and Google Geocoding API.
* **State Selector Dropdown & Reset:** Located directly above the interactive Google Vector Map, allowing citizens and officers to freely inspect clean air operations across different states (e.g., inspecting Delhi from Mumbai), with a `[Reset to My Location]` button.
* **Persistent Hyper-Local "Near You" Card:** Continuously displays exact citizen locality, street-level AQI, pollen allergy risk, and chemical concentrations regardless of which state is being viewed on the map.

### 3. District Detail View — Pure Google Telemetry
* **Rolling 4-Hour & 24-Hour Averages:** Derived directly from Google Air Quality API historical hourly telemetry (`history:lookup`) for the district centroid.
* **Official Monitoring Station Graceful Fallback:** Displays verified CPCB/DPCC monitoring stations where physically present; for rural or unmonitored districts, displays a transparent notice:  
  > *"No continuous government monitoring stations registered in {District Name}, {State Name}. Displaying continuous 500m satellite assimilation and dispersion telemetry."*
* **Interactive Weekly & Monthly Line Graph:** Replaces crude bar charts with an interactive **Point-Based SVG Line Graph** showing smooth curve interpolation, circular data nodes, and interactive hover tooltips:
  * **`[Weekly (7 Days)]`**: Daily average AQI trend over the last 7 days.
  * **`[Monthly (30 Days)]`**: Daily average AQI trend over the last 30 days.
* **Hotspots & Wards:** Displays recognized municipal wards and pollution hotspots with live 500m conditions, completely replacing synthetic bus corridor cells.

### 4. Govt Actions & Verified Impact Registry
* **Authoritative Policy Directives:** Displays legally binding statutory orders (CAQM GRAP-IV, Odd-Even Scheme, Firecracker Bans, Green War Room AI Command Center, BMC Dust Mitigation Mandates) scoped dynamically by state.
* **Two-Tier Verification Pipeline:** Sourced from Cloud SQL `policy_directives`, entered by authenticated environmental officers or ingested from official Press Information Bureau (PIB), CAQM, and State PCB circulars verified by Gemini 2.5 Flash-Lite. Prohibits unvetted raw news scraping.
* **State Dropdown & Multi-Select Area Filter:** Synchronized state filter with a multi-select area dropdown (only displaying areas with recorded action data), applied tag bar with `(X)` remove buttons, and `[Clear All]`.
* **Pruned Sensor Audit:** Removed legacy sensor audit tabs to focus 100% on environmental telemetry.

### 5. Municipal Action Center & Configurable Checkpoints
* **Chronological Sorting & Categorized Split:**
  * **Section A (Pending Completion):** Dispatched field operations awaiting completion with direct `[Mark as Done]` buttons.
  * **Section B (Measuring Impact):** Actions marked done whose scheduled measurement intervals are actively recording data.
* **Compact Line-Item View & Details Drawer:** Streamlined rows showing Hotspot Name, Action Type, Stage Badge, and Date/Time, opening the full checkpoint timeline in a **Right-Side Details Drawer**.
* **Configurable 4-Checkpoint Measurement Intervals:** Officers can configure 4 custom post-action measurement intervals with flexible units (`Seconds`, `Minutes`, `Hours`, `Days`) bounded between **15 seconds** (for instant hackathon testing) and **3 days** (72 hours). Google APIs automatically poll when checkpoints mature.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Environmental Telemetry** | Google Air Quality API (`airquality.googleapis.com`), Google Pollen API (`pollen.googleapis.com`), Google Weather API (`weather.googleapis.com`) |
| **Mapping & Geolocation** | Google Maps JavaScript SDK (`@vis.gl/react-google-maps`), Google Geocoding API (`geocoding-backend.googleapis.com`) |
| **Satellite Assimilation** | ESA Copernicus Sentinel-5P (TROPOMI) & CAMS atmospheric dispersion assimilated into Google 500m grid |
| **Generative AI** | Google Cloud Vertex AI (`gemini-2.5-flash-lite`) for executive briefings, industrial corridor analysis, and gazette verification |
| **Operational Database** | Google Cloud SQL for PostgreSQL 16 with PostGIS extension (IAM authenticated via `google-cloud-sql-connector`) |
| **Authentication** | Firebase Authentication (Google OAuth for citizens) + Cloud SQL `app_users` for municipal officers |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic 2.0 |

---

## 🚀 Quick Start Guide

### 1. Prerequisites & API Configuration
Enable the following APIs in your Google Cloud Project:
- `airquality.googleapis.com` (Air Quality API)
- `pollen.googleapis.com` (Pollen API)
- `weather.googleapis.com` (Weather API)
- `maps.googleapis.com` (Maps JavaScript API)
- `geocoding-backend.googleapis.com` (Geocoding API)
- `aiplatform.googleapis.com` (Vertex AI API)
- `sqladmin.googleapis.com` (Cloud SQL Admin API)

### 2. Environment Setup
Configure the following environment variables (strict key separation enforced):
- `VITE_GOOGLE_MAPS_API_KEY`: Strictly for loading the Google Maps JavaScript SDK in the frontend.
- `GOOGLE_API_KEY`: The unified environmental key for Air Quality, Pollen, Weather, and Geocoding APIs.
- Cloud SQL Connection: Uses IAM authentication (`google-cloud-sql-connector`), requiring **zero static database passwords** (no `DATABASE_URL`).

### 3. Running the Frontend
```bash
cd ui-bundle
npm install
npm run build
npm run dev
```

### 4. Running Schema & Contract Validation
```bash
python architecture/contracts/tools/validate_contracts.py
```

---

## 📖 Architecture & Changelog Documents
- [`CHANGES.md`](file:///d:/olderEdrive/EshaProjects/AerifyAI/CHANGES.md): Complete chronological record of revisions 0.8 through 0.14.
- [`architecture/READEME.md`](file:///d:/olderEdrive/EshaProjects/AerifyAI/architecture/READEME.md): Architecture handoff summary and reading order.
- [`architecture/docs/architecture.md`](file:///d:/olderEdrive/EshaProjects/AerifyAI/architecture/docs/architecture.md): Full technical specification, logical system, and data pipelines.
- [`architecture/docs/data-and-schema-decisions.md`](file:///d:/olderEdrive/EshaProjects/AerifyAI/architecture/docs/data-and-schema-decisions.md): Locked decisions D1 through D45.
