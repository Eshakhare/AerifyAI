"""
Aerify AI - Google-Native Environmental Backend Client
Connects directly to Google Maps Platform Environmental APIs:
1. Google Air Quality API (currentConditions:lookup & history:lookup)
2. Google Pollen API (forecast:lookup)
3. Google Weather API (currentConditions:lookup with Open-Meteo fallback)
4. Google Geocoding API (reverse geocoding)

Key Usage Rule:
Strictly uses os.getenv("GOOGLE_API_KEY") for Google Environmental Services.
"""

from __future__ import annotations

import logging
import os
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import httpx

from service.open_meteo_client import (
    compute_indian_aqi,
    fetch_live_atmospheric_snapshot,
    get_cpcb_aqi_category,
)

logger = logging.getLogger("aerify.google_env")

# 13 Official Delhi Hotspots anchored to high-precision geographic coordinates
DELHI_13_HOTSPOTS: dict[str, dict[str, Any]] = {
    "anand_vihar": {
        "id": "hotspot_anand_vihar",
        "name": "Anand Vihar",
        "district": "East Delhi",
        "district_id": "dist_east",
        "lat": 28.6469,
        "lng": 77.3160,
        "primary_source": "Interstate Bus Terminal & Railway Freight",
    },
    "wazirpur": {
        "id": "hotspot_wazirpur",
        "name": "Wazirpur",
        "district": "North West Delhi",
        "district_id": "dist_north_west",
        "lat": 28.6990,
        "lng": 77.1650,
        "primary_source": "Metal Finishing & Industrial Pickling Units",
    },
    "jahangirpuri": {
        "id": "hotspot_jahangirpuri",
        "name": "Jahangirpuri",
        "district": "North West Delhi",
        "district_id": "dist_north_west",
        "lat": 28.7250,
        "lng": 77.1650,
        "primary_source": "Outer Ring Road Arterial & Local Scrap Clusters",
    },
    "vivek_vihar": {
        "id": "hotspot_vivek_vihar",
        "name": "Vivek Vihar",
        "district": "Shahdara",
        "district_id": "dist_shahdara",
        "lat": 28.6720,
        "lng": 77.3150,
        "primary_source": "Trans-Yamuna Commercial Freight Transit",
    },
    "mundka": {
        "id": "hotspot_mundka",
        "name": "Mundka",
        "district": "West Delhi",
        "district_id": "dist_west",
        "lat": 28.6830,
        "lng": 77.0300,
        "primary_source": "Industrial Plastic Moulding & Unpaved Corridors",
    },
    "narela": {
        "id": "hotspot_narela",
        "name": "Narela",
        "district": "North Delhi",
        "district_id": "dist_north",
        "lat": 28.8530,
        "lng": 77.0930,
        "primary_source": "Narela Industrial Complex & Agricultural Perimeter",
    },
    "bawana": {
        "id": "hotspot_bawana",
        "name": "Bawana",
        "district": "North Delhi",
        "district_id": "dist_north",
        "lat": 28.7990,
        "lng": 77.0320,
        "primary_source": "DSIDC Industrial Sector & Biomass/Waste Combustion",
    },
    "rohini": {
        "id": "hotspot_rohini",
        "name": "Rohini",
        "district": "North West Delhi",
        "district_id": "dist_north_west",
        "lat": 28.7150,
        "lng": 77.1180,
        "primary_source": "Urban Thoroughfares & Sector Arterial Dust",
    },
    "rk_puram": {
        "id": "hotspot_rk_puram",
        "name": "RK Puram",
        "district": "New Delhi",
        "district_id": "dist_new_delhi",
        "lat": 28.5660,
        "lng": 77.1750,
        "primary_source": "Ring Road Vehicular Ingress & Construction Activity",
    },
    "okhla": {
        "id": "hotspot_okhla",
        "name": "Okhla Phase-II",
        "district": "South East Delhi",
        "district_id": "dist_south_east",
        "lat": 28.5300,
        "lng": 77.2720,
        "primary_source": "Industrial Manufacturing & Commercial Freight Hub",
    },
    "punjabi_bagh": {
        "id": "hotspot_punjabi_bagh",
        "name": "Punjabi Bagh",
        "district": "West Delhi",
        "district_id": "dist_west",
        "lat": 28.6670,
        "lng": 77.1280,
        "primary_source": "Rohtak Road & Ring Road Junction Congestion",
    },
    "mayapuri": {
        "id": "hotspot_mayapuri",
        "name": "Mayapuri",
        "district": "West Delhi",
        "district_id": "dist_west",
        "lat": 28.6280,
        "lng": 77.1120,
        "primary_source": "Automobile Scrap & Metal Smelting Workshops",
    },
    "dwarka_palam": {
        "id": "hotspot_dwarka_palam",
        "name": "Dwarka / Palam",
        "district": "South West Delhi",
        "district_id": "dist_south_west",
        "lat": 28.5820,
        "lng": 77.0620,
        "primary_source": "Elevated Expressway & Airport Perimeter Transit",
    },
}


def get_google_api_key() -> str:
    """Retrieve Google Environmental API key strictly from GOOGLE_API_KEY environment variable."""
    return (os.getenv("GOOGLE_API_KEY") or "").strip()


def fetch_live_google_air_quality(lat: float, lng: float) -> dict[str, Any]:
    """
    Fetch Live 500m Surface Grid Air Quality from Google Air Quality API:
    POST https://airquality.googleapis.com/v1/currentConditions:lookup?key=GOOGLE_API_KEY
    Falls back cleanly to Open-Meteo European CAMS atmospheric model if unavailable.
    """
    api_key = get_google_api_key()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if api_key:
        try:
            url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={urllib.parse.quote(api_key)}"
            payload = {
                "location": {"latitude": lat, "longitude": lng},
                "extraComputations": [
                    "POLLUTANT_CONCENTRATION",
                    "LOCAL_AQI",
                    "POLLUTANT_ADDITIONAL_INFO",
                ],
                "languageCode": "en",
            }
            with httpx.Client(timeout=6.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    indexes = data.get("indexes", [])
                    cpcb_idx = next((i for i in indexes if i.get("code") == "ind_cpcb" or i.get("code") == "cpcb"), None)
                    upi_idx = next((i for i in indexes if i.get("code") == "uaqi"), None)
                    active_idx = cpcb_idx or upi_idx or (indexes[0] if indexes else {})

                    raw_aqi = active_idx.get("aqi")
                    cpcb_cat = active_idx.get("category", "")

                    pollutants_map = {
                        "pm25": 92.0,
                        "pm10": 184.0,
                        "no2": 42.0,
                        "o3": 56.0,
                        "co": 1.4,
                        "so2": 14.5,
                    }

                    for p in data.get("pollutants", []):
                        code = (p.get("code") or "").lower()
                        conc = p.get("concentration", {}).get("value")
                        if conc is not None:
                            if "pm25" in code or code == "pm2.5":
                                pollutants_map["pm25"] = float(conc)
                            elif "pm10" in code:
                                pollutants_map["pm10"] = float(conc)
                            elif "no2" in code:
                                pollutants_map["no2"] = float(conc)
                            elif "o3" in code or "ozone" in code:
                                pollutants_map["o3"] = float(conc)
                            elif "co" in code:
                                pollutants_map["co"] = float(conc)
                            elif "so2" in code:
                                pollutants_map["so2"] = float(conc)

                    final_aqi = int(raw_aqi) if raw_aqi is not None else compute_indian_aqi(pollutants_map["pm25"], pollutants_map["pm10"])

                    return {
                        "aqi": final_aqi,
                        "cpcb_category": cpcb_cat or get_cpcb_aqi_category(final_aqi),
                        "dominant_pollutant": (data.get("dominantPollutant") or "pm25").upper(),
                        "pollutants": pollutants_map,
                        "date_time": data.get("dateTime", now_iso),
                        "is_live_api": True,
                    }
        except Exception as e:
            logger.warning(f"Google Air Quality API live fetch fallback triggered: {e}")

    # Fallback to Open-Meteo European CAMS atmospheric model
    try:
        snap = fetch_live_atmospheric_snapshot(lat, lng)
        return {
            "aqi": snap.get("indian_aqi", 235),
            "cpcb_category": snap.get("cpcb_category", "Poor"),
            "dominant_pollutant": "PM2.5",
            "pollutants": {
                "pm25": snap.get("pm2_5", 92.0),
                "pm10": snap.get("pm10", 184.0),
                "no2": snap.get("no2", 42.0),
                "o3": snap.get("o3", 56.0),
                "co": 1.4,
                "so2": 14.5,
            },
            "date_time": now_iso,
            "is_live_api": False,
        }
    except Exception as ex:
        logger.error(f"Atmospheric fallback failed: {ex}")
        return {
            "aqi": 240,
            "cpcb_category": "Poor",
            "dominant_pollutant": "PM2.5",
            "pollutants": {
                "pm25": 94.0,
                "pm10": 188.0,
                "no2": 44.0,
                "o3": 58.0,
                "co": 1.5,
                "so2": 15.0,
            },
            "date_time": now_iso,
            "is_live_api": False,
        }


def fetch_live_google_weather(lat: float, lng: float) -> dict[str, Any]:
    """
    Fetch Live Weather Conditions with Google Weather API or Open-Meteo fallback.
    """
    api_key = get_google_api_key()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if api_key:
        try:
            url = f"https://weather.googleapis.com/v1/currentConditions:lookup?key={urllib.parse.quote(api_key)}"
            with httpx.Client(timeout=5.0) as client:
                res = client.post(url, json={"location": {"latitude": lat, "longitude": lng}})
                if res.status_code == 200:
                    d = res.json()
                    temp = d.get("temperature", {}).get("degrees", 28.0)
                    hum = d.get("relativeHumidity", 52)
                    wind = d.get("wind", {})
                    speed_kmh = wind.get("speed", {}).get("value", 8.5)
                    deg = wind.get("direction", {}).get("degrees", 295.0)
                    dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
                    compass = dirs[round((deg % 360) / 22.5) % 16]
                    return {
                        "temperature_c": round(float(temp), 1),
                        "humidity_pct": int(hum),
                        "wind_speed_kmh": round(float(speed_kmh), 1),
                        "wind_speed_ms": round(float(speed_kmh) / 3.6, 2),
                        "wind_direction_deg": round(float(deg), 1),
                        "wind_compass": compass,
                        "precipitation_mm": float(d.get("precipitation", {}).get("qpf", {}).get("value", 0.0)),
                        "is_live_api": True,
                    }
        except Exception as e:
            logger.warning(f"Google Weather API fallback: {e}")

    # Fallback to Open-Meteo
    snap = fetch_live_atmospheric_snapshot(lat, lng)
    return {
        "temperature_c": snap.get("temperature_c", 28.0),
        "humidity_pct": snap.get("humidity_pct", 52.0),
        "wind_speed_kmh": snap.get("wind_speed_kmh", 8.5),
        "wind_speed_ms": round(snap.get("wind_speed_kmh", 8.5) / 3.6, 2),
        "wind_direction_deg": snap.get("wind_direction_deg", 295.0),
        "wind_compass": snap.get("wind_compass", "WNW"),
        "precipitation_mm": snap.get("precipitation_mm", 0.0),
        "is_live_api": False,
    }


def fetch_google_pollen(lat: float, lng: float) -> dict[str, Any]:
    """
    Fetch 3-day Tree, Grass, and Weed allergy risk forecast from Google Pollen API:
    GET https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=...&key=GOOGLE_API_KEY
    """
    api_key = get_google_api_key()
    if api_key:
        try:
            url = f"https://pollen.googleapis.com/v1/forecast:lookup?location.latitude={lat}&location.longitude={lng}&days=3&key={urllib.parse.quote(api_key)}"
            with httpx.Client(timeout=5.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    daily_info = data.get("dailyInfo", [])
                    days_out = []
                    for d in daily_info:
                        date_str = f"{d.get('date', {}).get('year')}-{d.get('date', {}).get('month', 1):02d}-{d.get('date', {}).get('day', 1):02d}"
                        pollen_types = d.get("pollenTypeInfo", [])
                        risks = []
                        for pt in pollen_types:
                            idx = pt.get("indexInfo", {})
                            risks.append({
                                "code": pt.get("code"),
                                "displayName": pt.get("displayName"),
                                "indexValue": idx.get("value", 0),
                                "category": idx.get("category", "Low"),
                                "description": idx.get("indexDescription", ""),
                            })
                        days_out.append({"date": date_str, "risks": risks})
                    return {"days": days_out, "is_live_api": True}
        except Exception as e:
            logger.warning(f"Google Pollen API fallback: {e}")

    # Deterministic seasonal baseline for Delhi autumn/winter
    now = datetime.now()
    return {
        "days": [
            {
                "date": now.strftime("%Y-%m-%d"),
                "risks": [
                    {"code": "TREE", "displayName": "Tree Pollen", "indexValue": 1, "category": "Low", "description": "Minimal tree pollen active in Delhi urban corridor."},
                    {"code": "GRASS", "displayName": "Grass Pollen", "indexValue": 2, "category": "Moderate", "description": "Moderate grass allergen risk near Yamuna riverbed and green belts."},
                    {"code": "WEED", "displayName": "Weed Pollen", "indexValue": 2, "category": "Moderate", "description": "Parthenium and seasonal weed pollen present."},
                ],
            }
        ],
        "is_live_api": False,
    }
