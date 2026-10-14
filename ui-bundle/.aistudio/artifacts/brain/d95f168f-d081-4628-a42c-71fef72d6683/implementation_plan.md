# Aerify AI — Civic Environmental Platform Refactor (Delhi NCT)

Refactor Aerify AI into a modern, government-grade civic environmental intelligence platform featuring a **full-height Left Navigation Sidebar (w-64)** that extends from top to bottom (visually over/anchoring the Top Header), a streamlined **Top Header Bar** for contextual breadcrumbs and municipal authentication, and a cohesive, polished visual identity with high-contrast civic styling across all screens.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following revisions have been incorporated:
> - **Full-Height Left Navigation Layout**: The Left Navigation sidebar spans the entire vertical height of the application (`h-screen sticky top-0` or fixed on desktop), with the Top Header positioned adjacent to it across the main canvas rather than spanning over the sidebar.
> - **Attractive & Cohesive Aesthetic**: Clean, modern civic palette using crisp off-white canvas (`bg-slate-50/80` or `bg-zinc-50`), polished white cards (`bg-white border border-slate-200/80 shadow-xs`), authoritative deep navy/slate headings (`text-slate-900`), readable neutral body typography (`text-slate-700`), and consistent accent highlights (emerald/sky for air intelligence, amber for simulations, purple for evaluations).
> - **Zero-Flicker Map Hover Card & Direct District Detail**: Interactive 11-district map with container-relative pinned hover cards, clickable "Show Air Report" / "Explore District" buttons, and smooth transition to the District Detail View with an authoritative `← Back to Delhi Map` return bar.
> - **Multi-Factor Officer Authentication**: Officer sign-in modal with Email/Password, Google OAuth, and an instant 1-Click Demo Officer Login button.
> - **Strict Domain Contract Compliance**: Preserves all Schema 0.9 types (`src/contracts/types.ts`), fixture IDs (`int_water_001`, etc.), non-negotiable domain rules (CPCB vs Estimated AQI label gating, evidence states, clock freshness from `effective_now`, satellite mol/m² units), and FixtureApi.

---

## 1. Layout & Visual Architecture

```
┌──────────────────┬──────────────────────────────────────────────────────────────────┐
│  AERIFY AI       │  Top Header: [Breadcrumb: Air Quality Dashboard]  [Officer Sign] │
│  Delhi Clean Air ├──────────────────────────────────────────────────────────────────┤
│  [MCD Demo]      │  MAIN CONTENT VIEWPORT                                           │
│                  │  ┌────────────────────────────────────────────────────────────┐  │
│  NAVIGATION:     │  │  "Near You" Hyper-Local Air Card                           │  │
│  🗺️ Air Quality  │  │  [Detect Location] · Bus Sensor · Station AQI · NCR Glance │  │
│  🧪 Simulations  │  └────────────────────────────────────────────────────────────┘  │
│  📊 Field Audits │                                                                  │
│  🛡️ Officer Hub  │  DELHI NCT REVENUE DISTRICTS & MAP DRILL-DOWN                    │
│                  │  ┌─────────────────────────────┐ ┌─────────────────────────────┐│  │
│  FOOTER:         │  │ 11-District Delhi Map       │ │ District Legend & Summary   ││  │
│  v0.9 · MCD/DPCC │  │ (Categorical bands: GOOD to │ │ Categorical bands, coverage ││  │
│  Dual Clock      │  │  SEVERE, hover card pinned) │ │ counts, last observation    ││  │
│  UTC & IST       │  └─────────────────────────────┘ └─────────────────────────────┘│  │
└──────────────────┴──────────────────────────────────────────────────────────────────┘
```

### Full-Height Sidebar Hierarchy
- **Width**: `w-64` (16rem / 256px) on desktop (`lg:w-64`), collapsible mobile drawer with backdrop blur.
- **Top Section**:
  - Aerify AI mark with clean civic badge (`bg-sky-600 text-white rounded-lg p-2`).
  - Brand Title: "Aerify AI", Subtitle: "Delhi Clean Air Intelligence".
  - Mode Pill: "Delhi Municipal Corporation (MCD) Demo" (`bg-sky-50 text-sky-800 border-sky-200`).
- **Navigation Menu Items**:
  1. 🗺️ **Air Quality Dashboard**: Unified home combining "Near You" hyper-local air monitoring and 11-District Delhi Map.
  2. 🧪 **Action Impact Simulations**: 12 municipal counterfactual cases (S01–S12) with human-friendly descriptions, projected PM reductions, and confounder diagnostics.
  3. 📊 **Verified Field Outcomes**: Pre/post sensor audit associations for completed actions with qualification notices.
  4. 🛡️ **Officer Action Portal**: Role-gated section (visible to OFFICER / SUPERVISOR or when Demo switched) with sub-navigation pills (Action Catalog, Propose & Plan Intervention, Active Checkpoint Tracker, Supervisor Audit & Corrections).
  5. 🛠️ **Dev Component Showcase**: Hidden by default; toggled via user profile dropdown.
- **Footer Section**:
  - Platform revision: "Aerify Platform v0.9".
  - Official partnership: "Govt of NCT of Delhi / Municipal Clean Air Partnership".
  - Authoritative dual clock: Live UTC & IST (Asia/Kolkata) computed from `effective_now`.

---

## 2. Top Header & Authentication

- **Position**: Spans the top of the content area to the right of the full-height sidebar.
- **Left**: Dynamic breadcrumbs (`Air Quality Dashboard`, `Air Quality Dashboard / South Delhi`, `Officer Action Portal / Propose Intervention`).
- **Right**:
  - *Public Citizen State*: Prominent "Municipal Officer Sign In" button with shield icon.
  - *Authenticated State*: User avatar, name ("Rajesh Kumar"), department ("MCD Central Zone"), role pill ("Municipal Officer"), and profile dropdown menu.
  - *Profile Dropdown*:
    1. Active User & Department details.
    2. Interactive Role Switcher (Public Citizen, Municipal Officer, Environmental Supervisor).
    3. Dev Mode UI Showcase toggle.
    4. Sign Out button (returns to Public Citizen).
- **Officer Auth Modal**:
  - Clean dialog featuring Email/Password inputs, Google Workspace OAuth, and a 1-Click "Demo Officer Login" button for instant evaluation.

---

## 3. Unified Air Quality Dashboard & Map Drill-down

- **Top Section**: "Near You" Hyper-Local Air Card
  - Browser GPS location detection button.
  - 4 distinct tiers: Nearest Street/Bus Observation, Nearest CPCB Station AQI, Regional Model Fallback (CAMS), and NCR City glance cards (Noida, Gurugram, Ghaziabad, Faridabad).
- **Bottom Section**: Delhi NCT 11-District Map & District Detail Transition
  - Interactive SVG/MapLibre map of Delhi's 11 revenue districts colored strictly by server-computed `MapAggregate.category`.
  - Zero-flicker hover card with fixed non-flickering positioning and clickable "Show Air Report" and "Explore District" buttons.
  - Clicking any district transitions directly into the full-screen **District Detail View**:
    - Sticky return bar with `← Back to Delhi Map` button, District Title, and "Show Air Report" button (slides open the Environmental Context Drawer).
    - Grid of 2–3 km analysis cells and measured road corridors with PM2.5/PM10 levels and `EvidenceState` badges.

---

## 4. Action Impact Simulations & Verified Outcomes

- **Action Impact Simulations (S01–S12)**:
  - Hero banner explaining predictive counterfactual AI simulations before field deployment.
  - 12 catalog cases (Palam–Dwarka S01, Anand Vihar S02, rain-confounded S10, multi-action road sweeping overlap S12) with projected particulate drops and confounder tags.
- **Verified Field Outcomes**:
  - Pre/post sensor audit associations for completed actions with strict domain qualified wording ("observed improvement association").

---

## 5. Technical Architecture & File Changes

```
src/
├── App.tsx                     (Full-height sidebar layout + adjacent header and main content + Auth Modal)
├── components/
│   ├── shell/
│   │   ├── Sidebar.tsx         (Full-height Left Navigation Sidebar with branding, tabs, clock, footer)
│   │   ├── Header.tsx          (Top Header with breadcrumbs, auth trigger, and user profile dropdown)
│   │   └── OfficerAuthModal.tsx(Municipal login modal with 1-Click Demo login)
│   ├── map/
│   │   ├── MapLibreMap.tsx     (Zero-flicker map with hover bridge, container-clamped tooltip & pin support)
│   │   ├── MapTooltip.tsx      (Interactive hover card with high contrast and clickable actions)
│   │   ├── NearYouCard.tsx     (4-tier hyper-local air monitoring card)
│   │   └── DistrictDetailView.tsx(Full view of selected district, cells, roads, and report action)
│   ├── drawer/
│   │   └── EnvironmentalContextDrawer.tsx (Refactored high-contrast light theme context drawer)
│   └── shared/
│       ├── EvidenceBadge.tsx   (Color + icon + text accessible badges)
│       ├── Disclaimer.tsx      (Refactored high-contrast alert disclaimers)
│       └── ClockWidget.tsx     (Authoritative UTC & IST dual clock)
└── views/
    ├── MapView.tsx             (Unified Dashboard: NearYouCard + Delhi Map + District Detail transition)
    ├── ScenariosView.tsx       (Action Impact Simulations S01–S12)
    ├── ObservedEvaluationsView.tsx (Verified Field Outcomes pre/post sensor audit)
    ├── OfficerActionsView.tsx  (Role-gated Officer Action Portal with 4 sub-views)
    └── DevComponentsView.tsx   (Developer component showcase)
```

---

## 6. Verification Plan

1. **Compilation Check**: Run `compile_applet` to confirm zero TypeScript or layout build errors.
2. **Full-Height Sidebar Layout**: Verify the Left Navigation sidebar extends the full screen height on desktop, anchoring the layout with the Top Header positioned neatly to its right.
3. **Map Zero-Flicker & Drill-down**: Verify hovering over South / South West districts shows the AQI card stably without jitter, mouse can move onto the card to click buttons, and clicking transitions into the District Detail View.
4. **Officer Authentication & Role Gating**: Verify the 1-Click Demo login instantly promotes to Officer, reveals the Officer Action Portal, and allows switching roles or toggling Dev Mode.
5. **Legibility & Civic Aesthetic**: Verify crisp typography, high contrast, clean cards, and polished visual harmony across all screens.
