"""Validate Aerify contract artifacts.

Run from the repository root:

    python architecture/contracts/tools/validate_contracts.py

Checks (all must pass; exit code 1 otherwise):
  1. every fixture validates against its matching `$defs` entry;
  2. data/legends/legend-bands.v1.json validates against `Legend` and bands are contiguous;
  3. data/scenarios/scenario-catalog.v1.json matches the accepted 12-case profile;
  4. every ZoneVersion/RouteVersion `geometry_hash` equals the canonical geometry hash
     (sha256 of the compact JSON of `geometry.data`, keys in the order `type`, `coordinates`);
  5. every artifact that declares a schema_version matches the schema's;
  6. negative cases the schema must reject (policy guards).

Requires: jsonschema>=4.
"""
import copy
import hashlib
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]  # .../architecture
SCHEMA_PATH = ROOT / "contracts" / "domain.schema.json"
FIX = ROOT / "contracts" / "fixtures"

# fixture file -> ($defs name, is_array)
FIXTURES = {
    "observation.synthetic.json": ("Measurement", False),
    "camera-event.synthetic.json": ("CameraEvent", False),
    "public-intervention.synthetic.json": ("PublicInterventionResponse", False),
    "action-overlap.synthetic.json": ("ActionOverlapAssessment", False),
    "location-context.synthetic.json": ("LocationContext", False),
    "scenario-run.synthetic.json": ("ScenarioRun", False),
    "scenario-projection.confounded.synthetic.json": ("ScenarioProjection", False),
    "zone-catalog.synthetic.json": ("ZoneSummary", True),
    "zone-version.palam-dwarka.placeholder.json": ("ZoneVersion", False),
    "session.officer.synthetic.json": ("SessionInfo", False),
}

errors = []


def fail(msg):
    errors.append(msg)
    print("FAIL:", msg)


schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
SCHEMA_VERSION = schema["schema_version"]


def validator_for(name):
    wrapper = {"$schema": schema["$schema"], "$ref": f"#/$defs/{name}", "$defs": schema["$defs"]}
    return Draft202012Validator(wrapper)


def geometry_hash(geometry_transport):
    data = geometry_transport["data"]
    ordered = {"type": data["type"], "coordinates": data["coordinates"]}
    return "sha256:" + hashlib.sha256(json.dumps(ordered, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def walk(obj):
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from walk(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v)


def check_hashes(doc, label):
    for node in walk(doc):
        if "geometry_hash" in node and isinstance(node.get("geometry"), dict) and "data" in node["geometry"]:
            expected = geometry_hash(node["geometry"])
            if node["geometry_hash"] != expected:
                fail(f"{label}: geometry_hash for {node.get('id')} is {node['geometry_hash']}, expected {expected}")


def check_versions(doc, label):
    for node in walk(doc):
        if "schema_version" in node and node["schema_version"] != SCHEMA_VERSION:
            fail(f"{label}: schema_version {node['schema_version']} != {SCHEMA_VERSION}")


# 1 + 4 + 5 ---------------------------------------------------------------
for fname, (defname, is_array) in FIXTURES.items():
    path = FIX / fname
    if not path.exists():
        fail(f"missing fixture {fname}")
        continue
    doc = json.loads(path.read_text(encoding="utf-8"))
    v = validator_for(defname)
    items = doc if is_array else [doc]
    for i, item in enumerate(items):
        for e in v.iter_errors(item):
            fail(f"{fname}[{i}] {list(e.absolute_path)}: {e.message[:200]}")
    check_hashes(doc, fname)
    check_versions(doc, fname)

# 2 legends -----------------------------------------------------------------
legend_doc = json.loads((ROOT / "data" / "legends" / "legend-bands.v1.json").read_text(encoding="utf-8"))
check_versions(legend_doc, "legend-bands.v1.json")
lv = validator_for("Legend")
for lg in legend_doc["legends"]:
    for e in lv.iter_errors(lg):
        fail(f"legend {lg.get('id')} {list(e.absolute_path)}: {e.message[:200]}")
    bands = lg["bands"]
    if bands[0]["lower_bound"] != 0 or bands[-1]["upper_bound"] is not None:
        fail(f"legend {lg['id']}: must start at 0 and end open-ended")
    for a, b in zip(bands, bands[1:]):
        if a["upper_bound"] != b["lower_bound"]:
            fail(f"legend {lg['id']}: gap/overlap between {a['id']} and {b['id']}")
    if [b["severity_rank"] for b in bands] != list(range(len(bands))):
        fail(f"legend {lg['id']}: severity_rank must be 0..n-1 in order")

# 3 scenario catalog ---------------------------------------------------------
cat = json.loads((ROOT / "data" / "scenarios" / "scenario-catalog.v1.json").read_text(encoding="utf-8"))
check_versions(cat, "scenario-catalog.v1.json")
cases = cat["cases"]
intent_group = {
    "SUSTAINED_RESPONSE": "sustained", "TEMPORARY_RESPONSE": "temporary", "NO_RESPONSE": "no_effect",
    "RAIN_CONFOUNDER": "confounded_or_inconclusive", "WIND_CONFOUNDER": "confounded_or_inconclusive",
    "ACTION_OVERLAP": "confounded_or_inconclusive",
}
mix = {}
for c in cases:
    mix[intent_group[c["design_intent"]]] = mix.get(intent_group[c["design_intent"]], 0) + 1
if len(cases) != 12:
    fail(f"catalog has {len(cases)} cases, expected 12")
if mix != cat["profile"]["mix"]:
    fail(f"catalog mix {mix} != declared {cat['profile']['mix']}")
if sum(1 for c in cases if c["design_intent"] == "ACTION_OVERLAP") != 1:
    fail("catalog must contain exactly one ACTION_OVERLAP case")
for key in ("case_id", "scenario_id", "zone_slug", "scenario_day"):
    vals = [c[key] for c in cases]
    if len(set(vals)) != len(vals):
        fail(f"catalog {key} values must be unique")
if [c["case_id"] for c in cases] != [f"S{n:02d}" for n in range(1, 13)]:
    fail("case_ids must be S01..S12 in order")
if any(c["scenario_day"] != 2 * n for n, c in enumerate(cases, 1)):
    fail("scenario_day must equal 2*n")
if [c["case_id"] for c in cases if c["flagship_slot"]] != [cat["profile"]["flagship_slot_case_id"]]:
    fail("exactly the flagship slot case must carry flagship_slot=true")

# zone catalog fixture must mirror the scenario catalog
zc = json.loads((FIX / "zone-catalog.synthetic.json").read_text(encoding="utf-8"))
if [z.get("scenario_case_id") for z in zc] != [c["case_id"] for c in cases]:
    fail("zone-catalog fixture scenario_case_id order must mirror the scenario catalog")

# 6 negative cases --------------------------------------------------------------
def must_reject(defname, doc, why):
    if not list(validator_for(defname).iter_errors(doc)):
        fail(f"negative case accepted (should be rejected): {why}")


obs = json.loads((FIX / "observation.synthetic.json").read_text(encoding="utf-8"))
loc = json.loads((FIX / "location-context.synthetic.json").read_text(encoding="utf-8"))
proj = json.loads((FIX / "scenario-projection.confounded.synthetic.json").read_text(encoding="utf-8"))
zone0 = zc[0]

w = copy.deepcopy(loc["weather"][0]); w["context"] = None
must_reject("Measurement", w, "modeled_context measurement without context descriptor")
w = copy.deepcopy(loc["weather"][0]); w["evidence_state"] = "DIRECTLY_OBSERVED"
must_reject("Measurement", w, "modeled_context claiming DIRECTLY_OBSERVED")
w = copy.deepcopy(loc["weather"][0]); w["spatial_support"]["nominal_resolution_m"] = None
must_reject("Measurement", w, "grid_cell without nominal resolution")
s = copy.deepcopy(loc["satellite"][0]); s["unit"] = "ug/m3"
must_reject("Measurement", s, "column-density retrieval in ug/m3")
s = copy.deepcopy(loc["satellite"][0]); s["context"]["footprint"] = None
must_reject("Measurement", s, "satellite retrieval without footprint")
o = copy.deepcopy(obs); o["evidence_state"] = "DIRECTLY_OBSERVED"
must_reject("Measurement", o, "synthetic_scenario claiming DIRECTLY_OBSERVED")

p = copy.deepcopy(proj); p["status"] = "simulated_improvement"
must_reject("ScenarioProjection", p, "improvement status with a TRIGGERED confounder")
p = copy.deepcopy(proj); p["confounders"] = []
must_reject("ScenarioProjection", p, "confounded status with no TRIGGERED finding")
p = copy.deepcopy(proj); p["confounders"][0]["outcome"] = "inconclusive"
must_reject("ScenarioProjection", p, "RAIN trigger with outcome other than confounded")
p = copy.deepcopy(proj); p["confounders"] = ["rain"]
must_reject("ScenarioProjection", p, "free-text confounder string")

z = copy.deepcopy(zone0); z["observation_grade_wording_allowed"] = True
must_reject("ZoneSummary", z, "observation-grade wording for a zone that is not ANCHORED")

m = {"id": "x", "level": "district", "name": "n", "metric": "PM2_5_MASS", "value": 50, "unit": "ug/m3", "category": "MODERATE",
     "window_start": "2026-10-08T09:00:00Z", "window_end": "2026-10-08T10:00:00Z",
     "coverage": {"state": "current", "sample_count": 10, "source_count": 2, "last_observation_at": "2026-10-08T09:59:00Z"},
     "evidence_state": "DIRECTLY_OBSERVED", "method_version": "m1", "provenance_mix": ["observed"]}
must_reject("MapAggregate", m, "category without legend_id")
m2 = dict(m, legend_id="cpcb_pm25_conc_v1")
if list(validator_for("MapAggregate").iter_errors(m2)):
    fail("valid MapAggregate with legend_id was rejected")
m3 = dict(m2, value=None)
must_reject("MapAggregate", m3, "null value with a category")
must_reject("MapAggregate", dict(m2, category="TERRIBLE"), "category outside BandId")

must_reject("SessionInfo", {"schema_version": SCHEMA_VERSION, "clock": loc["clock"], "role": "PUBLIC",
                            "capabilities": ["CREATE_DRAFT"], "auth_mode": "FIREBASE"}, "PUBLIC with officer capability")
must_reject("SessionInfo", {"schema_version": SCHEMA_VERSION, "clock": loc["clock"], "role": "OFFICER",
                            "capabilities": ["SUBMIT_CORRECTION"], "auth_mode": "FIREBASE"}, "OFFICER with supervisor-only capability")

if errors:
    print(f"\n{len(errors)} problem(s)")
    sys.exit(1)
print(f"OK: schema {SCHEMA_VERSION}; {len(FIXTURES)} fixtures, {len(legend_doc['legends'])} legends, {len(cases)} catalog cases validated")
