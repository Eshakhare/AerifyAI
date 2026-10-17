"""30-Day Bus Mobile Sensor Telemetry & 40 CPCB Station Seeding Engine (Phase 1.1 & 1.2).

Generates a realistic 30-day dataset of mobile environmental observations across 6 active
DTC bus routes spanning all 11 Delhi revenue districts:
- 6 active DTC bus routes * 30 days * 16 operating hours/day (06:00 to 22:00) * 60 minutes = 172,800 records
- Realistic diurnal traffic curves:
  * Morning rush hour spike (07:30 - 10:30)
  * Afternoon boundary-layer dispersion dip (13:00 - 16:00)
  * Evening commute + nocturnal inversion accumulation (18:00 - 22:00)
- Seeds the 40 real Delhi CPCB Continuous Ambient Air Quality Monitoring Stations (CAAQMS)
- Bulk-inserts all 172,800 rows into Cloud SQL `mobile_sensor_telemetry` and creates `idx_telemetry_time_space`.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import insert, text
from sqlalchemy.engine import Engine

from service.models import CpcbStation, MobileSensorTelemetry
from service.open_meteo_client import compute_indian_aqi


# 40 Official CPCB / DPCC / IMD / IITM Stations across the 11 Delhi Revenue Districts
DELHI_40_CPCB_STATIONS: list[dict[str, Any]] = [
    # East Delhi
    {"id": "cpcb_anand_vihar", "name": "Anand Vihar", "agency": "DPCC", "district_id": "dist_east", "lat": 28.6476, "lng": 77.3158, "pm25": 148.0, "pm10": 318.0, "no2": 68.0},
    {"id": "cpcb_patparganj", "name": "Patparganj", "agency": "DPCC", "district_id": "dist_east", "lat": 28.6236, "lng": 77.2872, "pm25": 118.0, "pm10": 238.0, "no2": 46.0},
    # Shahdara
    {"id": "cpcb_vivek_vihar", "name": "Vivek Vihar", "agency": "DPCC", "district_id": "dist_shahdara", "lat": 28.6723, "lng": 77.3153, "pm25": 154.0, "pm10": 326.0, "no2": 58.0},
    {"id": "cpcb_ihbas_dilshad", "name": "IHBAS, Dilshad Garden", "agency": "CPCB", "district_id": "dist_shahdara", "lat": 28.6811, "lng": 77.3025, "pm25": 132.0, "pm10": 274.0, "no2": 51.0},
    # North East Delhi
    {"id": "cpcb_sonia_vihar", "name": "Sonia Vihar", "agency": "DPCC", "district_id": "dist_north_east", "lat": 28.7105, "lng": 77.2495, "pm25": 126.0, "pm10": 262.0, "no2": 44.0},
    {"id": "cpcb_gokulpuri", "name": "Gokulpuri Wazirabad Road", "agency": "DPCC", "district_id": "dist_north_east", "lat": 28.7025, "lng": 77.2782, "pm25": 134.0, "pm10": 278.0, "no2": 49.0},
    # North Delhi
    {"id": "cpcb_wazirpur", "name": "Wazirpur Industrial Area", "agency": "DPCC", "district_id": "dist_north", "lat": 28.6998, "lng": 77.1654, "pm25": 152.0, "pm10": 315.0, "no2": 62.0},
    {"id": "cpcb_burari_crossing", "name": "Burari Crossing", "agency": "IMD", "district_id": "dist_north", "lat": 28.7256, "lng": 77.2012, "pm25": 112.0, "pm10": 234.0, "no2": 39.0},
    {"id": "cpcb_alipur", "name": "Alipur", "agency": "DPCC", "district_id": "dist_north", "lat": 28.8153, "lng": 77.1530, "pm25": 106.0, "pm10": 222.0, "no2": 35.0},
    {"id": "cpcb_du_north_campus", "name": "North Campus, DU", "agency": "IMD", "district_id": "dist_north", "lat": 28.6878, "lng": 77.2096, "pm25": 98.0, "pm10": 198.0, "no2": 41.0},
    # North West Delhi
    {"id": "cpcb_jahangirpuri", "name": "Jahangirpuri", "agency": "DPCC", "district_id": "dist_north_west", "lat": 28.7328, "lng": 77.1706, "pm25": 158.0, "pm10": 332.0, "no2": 61.0},
    {"id": "cpcb_rohini", "name": "Rohini Sector 16", "agency": "DPCC", "district_id": "dist_north_west", "lat": 28.7325, "lng": 77.1199, "pm25": 142.0, "pm10": 292.0, "no2": 52.0},
    {"id": "cpcb_bawana", "name": "Bawana Industrial Area", "agency": "DPCC", "district_id": "dist_north_west", "lat": 28.7762, "lng": 77.0511, "pm25": 162.0, "pm10": 342.0, "no2": 57.0},
    {"id": "cpcb_narela", "name": "Narela", "agency": "DPCC", "district_id": "dist_north_west", "lat": 28.8228, "lng": 77.1019, "pm25": 138.0, "pm10": 288.0, "no2": 45.0},
    {"id": "cpcb_ashok_vihar", "name": "Ashok Vihar", "agency": "DPCC", "district_id": "dist_north_west", "lat": 28.6953, "lng": 77.1817, "pm25": 128.0, "pm10": 258.0, "no2": 48.0},
    {"id": "cpcb_dtu", "name": "DTU, Bawana Road", "agency": "CPCB", "district_id": "dist_north_west", "lat": 28.7501, "lng": 77.1177, "pm25": 124.0, "pm10": 254.0, "no2": 43.0},
    # West Delhi
    {"id": "cpcb_punjabi_bagh", "name": "Punjabi Bagh", "agency": "DPCC", "district_id": "dist_west", "lat": 28.6740, "lng": 77.1310, "pm25": 125.0, "pm10": 256.0, "no2": 53.0},
    {"id": "cpcb_mundka", "name": "Mundka", "agency": "DPCC", "district_id": "dist_west", "lat": 28.6847, "lng": 77.0766, "pm25": 149.0, "pm10": 318.0, "no2": 56.0},
    {"id": "cpcb_shadipur", "name": "Shadipur", "agency": "CPCB", "district_id": "dist_west", "lat": 28.6515, "lng": 77.1473, "pm25": 116.0, "pm10": 239.0, "no2": 49.0},
    {"id": "cpcb_paschim_vihar", "name": "Paschim Vihar", "agency": "DPCC", "district_id": "dist_west", "lat": 28.6685, "lng": 77.0928, "pm25": 114.0, "pm10": 232.0, "no2": 44.0},
    # Central Delhi
    {"id": "cpcb_ito", "name": "ITO Intersection", "agency": "CPCB", "district_id": "dist_central", "lat": 28.6286, "lng": 77.2410, "pm25": 112.0, "pm10": 228.0, "no2": 64.0},
    {"id": "cpcb_pusa_dpcc", "name": "Pusa Road", "agency": "DPCC", "district_id": "dist_central", "lat": 28.6396, "lng": 77.1463, "pm25": 94.0, "pm10": 192.0, "no2": 46.0},
    {"id": "cpcb_chandni_chowk", "name": "Chandni Chowk", "agency": "IITM", "district_id": "dist_central", "lat": 28.6568, "lng": 77.2272, "pm25": 108.0, "pm10": 224.0, "no2": 55.0},
    {"id": "cpcb_civil_lines", "name": "Civil Lines", "agency": "DPCC", "district_id": "dist_central", "lat": 28.6775, "lng": 77.2242, "pm25": 96.0, "pm10": 196.0, "no2": 43.0},
    # New Delhi
    {"id": "cpcb_mandir_marg", "name": "Mandir Marg", "agency": "DPCC", "district_id": "dist_new_delhi", "lat": 28.6364, "lng": 77.2011, "pm25": 76.0, "pm10": 154.0, "no2": 42.0},
    {"id": "cpcb_connaught_place", "name": "Connaught Place (Babakhadaksingh Marg)", "agency": "DPCC", "district_id": "dist_new_delhi", "lat": 28.6315, "lng": 77.2167, "pm25": 82.0, "pm10": 168.0, "no2": 48.0},
    {"id": "cpcb_lodhi_road", "name": "Lodhi Road", "agency": "IMD", "district_id": "dist_new_delhi", "lat": 28.5918, "lng": 77.2273, "pm25": 68.0, "pm10": 138.0, "no2": 36.0},
    {"id": "cpcb_major_dhyan_chand", "name": "Major Dhyan Chand National Stadium", "agency": "DPCC", "district_id": "dist_new_delhi", "lat": 28.6119, "lng": 77.2373, "pm25": 78.0, "pm10": 162.0, "no2": 44.0},
    {"id": "cpcb_pusa_imd", "name": "Pusa IMD", "agency": "IMD", "district_id": "dist_new_delhi", "lat": 28.6396, "lng": 77.1603, "pm25": 74.0, "pm10": 152.0, "no2": 39.0},
    # South West Delhi
    {"id": "cpcb_dwarka_sec8", "name": "Dwarka Sector 8", "agency": "DPCC", "district_id": "dist_south_west", "lat": 28.5710, "lng": 77.0719, "pm25": 108.0, "pm10": 228.0, "no2": 47.0},
    {"id": "cpcb_igi_airport", "name": "IGI Airport (T3)", "agency": "IMD", "district_id": "dist_south_west", "lat": 28.5627, "lng": 77.1180, "pm25": 92.0, "pm10": 194.0, "no2": 51.0},
    {"id": "cpcb_najafgarh", "name": "Najafgarh", "agency": "DPCC", "district_id": "dist_south_west", "lat": 28.5702, "lng": 76.9338, "pm25": 88.0, "pm10": 186.0, "no2": 34.0},
    {"id": "cpcb_nsit_dwarka", "name": "NSIT Dwarka", "agency": "CPCB", "district_id": "dist_south_west", "lat": 28.6091, "lng": 77.0325, "pm25": 98.0, "pm10": 204.0, "no2": 42.0},
    {"id": "cpcb_rk_puram", "name": "R.K. Puram", "agency": "DPCC", "district_id": "dist_south_west", "lat": 28.5633, "lng": 77.1869, "pm25": 95.0, "pm10": 196.0, "no2": 46.0},
    # South Delhi
    {"id": "cpcb_sirifort", "name": "Siri Fort", "agency": "CPCB", "district_id": "dist_south", "lat": 28.5504, "lng": 77.2159, "pm25": 84.0, "pm10": 172.0, "no2": 43.0},
    {"id": "cpcb_aya_nagar", "name": "Aya Nagar", "agency": "IMD", "district_id": "dist_south", "lat": 28.4720, "lng": 77.1099, "pm25": 72.0, "pm10": 148.0, "no2": 32.0},
    {"id": "cpcb_aurobindo_marg", "name": "Sri Aurobindo Marg", "agency": "DPCC", "district_id": "dist_south", "lat": 28.5313, "lng": 77.1902, "pm25": 79.0, "pm10": 164.0, "no2": 39.0},
    # South East Delhi
    {"id": "cpcb_nehru_nagar", "name": "Nehru Nagar", "agency": "DPCC", "district_id": "dist_south_east", "lat": 28.5679, "lng": 77.2505, "pm25": 124.0, "pm10": 254.0, "no2": 54.0},
    {"id": "cpcb_okhla_phase2", "name": "Okhla Phase-2", "agency": "DPCC", "district_id": "dist_south_east", "lat": 28.5308, "lng": 77.2713, "pm25": 132.0, "pm10": 272.0, "no2": 58.0},
    {"id": "cpcb_crri_mathura_rd", "name": "CRRI Mathura Road", "agency": "IMD", "district_id": "dist_south_east", "lat": 28.5512, "lng": 77.2736, "pm25": 116.0, "pm10": 242.0, "no2": 52.0},
]

# 6 Active DTC Bus Routes covering all 11 Delhi Revenue Districts
# Each route defines a multi-stop loop so that buses continuously traverse all 11 districts
DTC_BUS_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "DTC_534_TRANS_YAMUNA_RING",
        "bus_id": "DL1PC_8401",
        "waypoints": [
            {"lat": 28.6476, "lng": 77.3158, "district_id": "dist_east", "base_pm25": 135.0, "base_pm10": 272.0},
            {"lat": 28.6236, "lng": 77.2872, "district_id": "dist_east", "base_pm25": 128.0, "base_pm10": 258.0},
            {"lat": 28.6723, "lng": 77.3153, "district_id": "dist_shahdara", "base_pm25": 158.0, "base_pm10": 328.0},
            {"lat": 28.7105, "lng": 77.2595, "district_id": "dist_north_east", "base_pm25": 124.0, "base_pm10": 254.0},
        ],
    },
    {
        "route_id": "DTC_764_CENTRAL_LUTYENS",
        "bus_id": "DL1PC_8402",
        "waypoints": [
            {"lat": 28.6315, "lng": 77.2167, "district_id": "dist_new_delhi", "base_pm25": 68.0, "base_pm10": 138.0},
            {"lat": 28.5918, "lng": 77.2173, "district_id": "dist_new_delhi", "base_pm25": 62.0, "base_pm10": 126.0},
            {"lat": 28.6286, "lng": 77.2350, "district_id": "dist_central", "base_pm25": 94.0, "base_pm10": 188.0},
            {"lat": 28.6568, "lng": 77.2172, "district_id": "dist_central", "base_pm25": 98.0, "base_pm10": 196.0},
        ],
    },
    {
        "route_id": "DTC_990_NORTH_INDUSTRIAL",
        "bus_id": "DL1PC_8403",
        "waypoints": [
            {"lat": 28.7328, "lng": 77.1506, "district_id": "dist_north_west", "base_pm25": 148.0, "base_pm10": 302.0},
            {"lat": 28.7762, "lng": 77.0611, "district_id": "dist_north_west", "base_pm25": 154.0, "base_pm10": 316.0},
            {"lat": 28.7256, "lng": 77.1912, "district_id": "dist_north", "base_pm25": 108.0, "base_pm10": 222.0},
            {"lat": 28.6998, "lng": 77.1854, "district_id": "dist_north", "base_pm25": 116.0, "base_pm10": 236.0},
        ],
    },
    {
        "route_id": "DTC_850_WEST_ARTERY",
        "bus_id": "DL1PC_8404",
        "waypoints": [
            {"lat": 28.6740, "lng": 77.1310, "district_id": "dist_west", "base_pm25": 118.0, "base_pm10": 244.0},
            {"lat": 28.6685, "lng": 77.0828, "district_id": "dist_west", "base_pm25": 122.0, "base_pm10": 252.0},
            {"lat": 28.5710, "lng": 77.0619, "district_id": "dist_south_west", "base_pm25": 98.0, "base_pm10": 202.0},
            {"lat": 28.5627, "lng": 77.1080, "district_id": "dist_south_west", "base_pm25": 92.0, "base_pm10": 188.0},
        ],
    },
    {
        "route_id": "DTC_425_SOUTH_MATHURA_CORRIDOR",
        "bus_id": "DL1PC_8405",
        "waypoints": [
            {"lat": 28.5504, "lng": 77.2059, "district_id": "dist_south", "base_pm25": 78.0, "base_pm10": 158.0},
            {"lat": 28.5113, "lng": 77.1902, "district_id": "dist_south", "base_pm25": 74.0, "base_pm10": 150.0},
            {"lat": 28.5679, "lng": 77.2505, "district_id": "dist_south_east", "base_pm25": 114.0, "base_pm10": 238.0},
            {"lat": 28.5308, "lng": 77.2713, "district_id": "dist_south_east", "base_pm25": 122.0, "base_pm10": 252.0},
        ],
    },
    {
        "route_id": "DTC_OMS_OUTER_MUDRIKA",
        "bus_id": "DL1PC_8406",
        "waypoints": [
            {"lat": 28.6460, "lng": 77.3140, "district_id": "dist_east", "base_pm25": 140.0, "base_pm10": 286.0},
            {"lat": 28.6950, "lng": 77.2750, "district_id": "dist_north_east", "base_pm25": 128.0, "base_pm10": 264.0},
            {"lat": 28.6780, "lng": 77.3080, "district_id": "dist_shahdara", "base_pm25": 162.0, "base_pm10": 338.0},
            {"lat": 28.6320, "lng": 77.2180, "district_id": "dist_new_delhi", "base_pm25": 66.0, "base_pm10": 134.0},
        ],
    },
]


def _diurnal_multiplier(hour_ist: int, minute: int) -> tuple[float, float, float, float]:
    """Return (pm_multiplier, speed_kmh, temp_c, humidity_pct) for an IST hour & minute."""
    frac_h = hour_ist + (minute / 60.0)
    # Morning traffic rush peak around 08:45 IST, afternoon dispersion dip around 14:30 IST, evening peak around 20:00 IST
    morning_peak = 0.34 * math.exp(-((frac_h - 8.75) ** 2) / 2.2)
    afternoon_dip = -0.22 * math.exp(-((frac_h - 14.5) ** 2) / 3.0)
    evening_inversion = 0.42 * math.exp(-((frac_h - 20.25) ** 2) / 3.2)
    pm_mult = max(0.62, 1.0 + morning_peak + afternoon_dip + evening_inversion)

    # Speed drops during rush hours
    congestion = morning_peak + evening_inversion
    speed_kmh = round(max(11.5, 31.0 - (congestion * 36.0)), 1)

    # Diurnal temperature and relative humidity
    temp_c = round(23.5 + 8.5 * math.sin(((frac_h - 6.0) / 16.0) * math.pi), 1)
    humidity_pct = round(max(32.0, min(84.0, 68.0 - 24.0 * math.sin(((frac_h - 6.0) / 16.0) * math.pi))), 1)
    return pm_mult, speed_kmh, temp_c, humidity_pct


def seed_cpcb_stations(engine: Engine) -> int:
    """Seed the 40 real Delhi CPCB stations into `cpcb_stations`."""
    now = datetime.now(timezone.utc)
    rows = []
    for st in DELHI_40_CPCB_STATIONS:
        aqi, primary, _ = compute_indian_aqi(st["pm25"], st["pm10"])
        rows.append({
            "id": st["id"],
            "name": st["name"],
            "agency": st["agency"],
            "district_id": st["district_id"],
            "latitude": st["lat"],
            "longitude": st["lng"],
            "baseline_pm25": st["pm25"],
            "baseline_pm10": st["pm10"],
            "baseline_no2": st["no2"],
            "aqi": aqi,
            "primary_pollutant": primary,
            "updated_at": now,
        })

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM cpcb_stations"))
        conn.execute(insert(CpcbStation), rows)
    return len(rows)


def ensure_30day_bus_telemetry(engine: Engine, force_regenerate: bool = False) -> int:
    """
    Ensure all 172,800 rows (6 routes * 30 days * 16 hours * 60 mins) exist in `mobile_sensor_telemetry`.
    Uses server-side PostgreSQL `generate_series` with realistic diurnal traffic curves and multi-day
    synoptic waves across all 11 Delhi revenue districts so 172,800 rows are generated in ~3 seconds.
    """
    target_rows = 6 * 30 * 16 * 60  # 172,800
    with engine.connect() as conn:
        existing_count = conn.execute(text("SELECT COUNT(*) FROM mobile_sensor_telemetry")).scalar() or 0
        if existing_count >= target_rows and not force_regenerate:
            return int(existing_count)

    print(f"Generating 30-day bus telemetry dataset ({target_rows:,} rows across 6 DTC routes & 11 Delhi districts)...")

    sql = text(
        """
        TRUNCATE TABLE mobile_sensor_telemetry RESTART IDENTITY;

        WITH route_waypoints (route_idx, route_id, bus_id, wp_idx, district_id, lat, lng, base_pm25, base_pm10) AS (
            VALUES
            (0, 'DTC_534_TRANS_YAMUNA_RING', 'DL1PC_8401', 0, 'dist_east', 28.6476, 77.3158, 135.0, 272.0),
            (0, 'DTC_534_TRANS_YAMUNA_RING', 'DL1PC_8401', 1, 'dist_east', 28.6236, 77.2872, 128.0, 258.0),
            (0, 'DTC_534_TRANS_YAMUNA_RING', 'DL1PC_8401', 2, 'dist_shahdara', 28.6723, 77.3153, 158.0, 328.0),
            (0, 'DTC_534_TRANS_YAMUNA_RING', 'DL1PC_8401', 3, 'dist_north_east', 28.7105, 77.2595, 124.0, 254.0),

            (1, 'DTC_764_CENTRAL_LUTYENS', 'DL1PC_8402', 0, 'dist_new_delhi', 28.6315, 77.2167, 68.0, 138.0),
            (1, 'DTC_764_CENTRAL_LUTYENS', 'DL1PC_8402', 1, 'dist_new_delhi', 28.5918, 77.2173, 62.0, 126.0),
            (1, 'DTC_764_CENTRAL_LUTYENS', 'DL1PC_8402', 2, 'dist_central', 28.6286, 77.2350, 94.0, 188.0),
            (1, 'DTC_764_CENTRAL_LUTYENS', 'DL1PC_8402', 3, 'dist_central', 28.6568, 77.2172, 98.0, 196.0),

            (2, 'DTC_990_NORTH_INDUSTRIAL', 'DL1PC_8403', 0, 'dist_north_west', 28.7328, 77.1506, 148.0, 302.0),
            (2, 'DTC_990_NORTH_INDUSTRIAL', 'DL1PC_8403', 1, 'dist_north_west', 28.7762, 77.0611, 154.0, 316.0),
            (2, 'DTC_990_NORTH_INDUSTRIAL', 'DL1PC_8403', 2, 'dist_north', 28.7256, 77.1912, 108.0, 222.0),
            (2, 'DTC_990_NORTH_INDUSTRIAL', 'DL1PC_8403', 3, 'dist_north', 28.6998, 77.1854, 116.0, 236.0),

            (3, 'DTC_850_WEST_ARTERY', 'DL1PC_8404', 0, 'dist_west', 28.6740, 77.1310, 118.0, 244.0),
            (3, 'DTC_850_WEST_ARTERY', 'DL1PC_8404', 1, 'dist_west', 28.6685, 77.0828, 122.0, 252.0),
            (3, 'DTC_850_WEST_ARTERY', 'DL1PC_8404', 2, 'dist_south_west', 28.5710, 77.0619, 98.0, 202.0),
            (3, 'DTC_850_WEST_ARTERY', 'DL1PC_8404', 3, 'dist_south_west', 28.5627, 77.1080, 92.0, 188.0),

            (4, 'DTC_425_SOUTH_MATHURA_CORRIDOR', 'DL1PC_8405', 0, 'dist_south', 28.5504, 77.2059, 78.0, 158.0),
            (4, 'DTC_425_SOUTH_MATHURA_CORRIDOR', 'DL1PC_8405', 1, 'dist_south', 28.5113, 77.1902, 74.0, 150.0),
            (4, 'DTC_425_SOUTH_MATHURA_CORRIDOR', 'DL1PC_8405', 2, 'dist_south_east', 28.5679, 77.2505, 114.0, 238.0),
            (4, 'DTC_425_SOUTH_MATHURA_CORRIDOR', 'DL1PC_8405', 3, 'dist_south_east', 28.5308, 77.2713, 122.0, 252.0),

            (5, 'DTC_OMS_OUTER_MUDRIKA', 'DL1PC_8406', 0, 'dist_east', 28.6460, 77.3140, 140.0, 286.0),
            (5, 'DTC_OMS_OUTER_MUDRIKA', 'DL1PC_8406', 1, 'dist_north_east', 28.6950, 77.2750, 128.0, 264.0),
            (5, 'DTC_OMS_OUTER_MUDRIKA', 'DL1PC_8406', 2, 'dist_shahdara', 28.6780, 77.3080, 162.0, 338.0),
            (5, 'DTC_OMS_OUTER_MUDRIKA', 'DL1PC_8406', 3, 'dist_new_delhi', 28.6320, 77.2180, 66.0, 134.0)
        ),
        time_grid AS (
            SELECT
                d AS day_idx,
                m AS min_of_op_day,
                (6 + (m / 60)) AS hour_val,
                (m % 60) AS minute_val,
                (DATE_TRUNC('minute', NOW()) - ((29 - d) * INTERVAL '1 day') - ((959 - m) * INTERVAL '1 minute')) AS ts,
                (1.0 + 0.14 * SIN(2.0 * PI() * d / 9.0)) AS synoptic_factor,
                (
                    1.0
                    + 0.34 * EXP(-POWER((6.0 + m / 60.0) - 8.75, 2) / 2.2)
                    - 0.22 * EXP(-POWER((6.0 + m / 60.0) - 14.5, 2) / 3.0)
                    + 0.42 * EXP(-POWER((6.0 + m / 60.0) - 20.25, 2) / 3.2)
                ) AS pm_mult
            FROM generate_series(0, 29) AS d
            CROSS JOIN generate_series(0, 959) AS m
        )
        INSERT INTO mobile_sensor_telemetry (
            timestamp, bus_id, route_id, district_id,
            latitude, longitude, speed_kmh,
            pm1, pm2_5, pm10, humidity, temperature
        )
        SELECT
            tg.ts AS timestamp,
            wp.bus_id,
            wp.route_id,
            wp.district_id,
            ROUND((wp.lat + 0.004 * SIN(tg.minute_val * 0.1047))::numeric, 5)::float AS latitude,
            ROUND((wp.lng + 0.004 * COS(tg.minute_val * 0.1047))::numeric, 5)::float AS longitude,
            ROUND(GREATEST(12.0, 30.0 - (tg.pm_mult - 0.85) * 24.0)::numeric, 1)::float AS speed_kmh,
            ROUND((wp.base_pm25 * tg.synoptic_factor * tg.pm_mult * 0.58)::numeric, 1)::float AS pm1,
            ROUND((wp.base_pm25 * tg.synoptic_factor * tg.pm_mult * (1.0 + 0.05 * COS(tg.minute_val * 0.3 + wp.route_idx)))::numeric, 1)::float AS pm2_5,
            ROUND((wp.base_pm10 * tg.synoptic_factor * tg.pm_mult * (1.0 + 0.05 * COS(tg.minute_val * 0.3 + wp.route_idx)))::numeric, 1)::float AS pm10,
            ROUND((66.0 - 22.0 * SIN(((tg.hour_val - 6.0) / 16.0) * PI()))::numeric, 1)::float AS humidity,
            ROUND((23.5 + 8.5 * SIN(((tg.hour_val - 6.0) / 16.0) * PI()))::numeric, 1)::float AS temperature
        FROM time_grid tg
        INNER JOIN route_waypoints wp
            ON wp.wp_idx = (((tg.minute_val + wp.route_idx * 10) % 60) / 15);

        CREATE INDEX IF NOT EXISTS idx_telemetry_time_space
            ON mobile_sensor_telemetry (timestamp DESC, district_id, latitude, longitude);
        """
    )

    with engine.begin() as conn:
        conn.execute(sql)
        total_inserted = conn.execute(text("SELECT COUNT(*) FROM mobile_sensor_telemetry")).scalar() or 0

    print(f"Successfully inserted {total_inserted:,} rows into mobile_sensor_telemetry.")
    return int(total_inserted)


if __name__ == "__main__":
    from service.database import Base, get_engine

    eng = get_engine()
    Base.metadata.create_all(bind=eng)
    st_count = seed_cpcb_stations(eng)
    bus_count = ensure_30day_bus_telemetry(eng, force_regenerate=True)
    print(f"Seeded {st_count} CPCB stations and {bus_count:,} bus telemetry records.")
