/**
 * Verbatim contents of python_models/wind-sand.py (also served for download at
 * /public/code/wind-sand.py), embedded as a string so the "Show the Script" panel can display it
 * without a client-side fetch. Keep this in sync if the script changes.
 */

export const WIND_SAND_SCRIPT = `"""
Wind Pattern & Sand Impact Modeling — v0 Prototype
=====================================================

Pulls two public data sources for a test hotspot + target site in the UAE:
  1. Open-Meteo   -> historical wind data -> seasonal ensemble wind rose
  2. SoilGrids    -> sand content (%) at the hotspot, as an erosion-input proxy

Then runs a very simple downwind decay model to estimate what fraction of mobilized sand from the hotspot could reach the target site, as a v0 placeholder for the real transport model.

Requires internet access to open-meteo.com and rest.isric.org.
Run this locally / wherever those domains are reachable.

No API keys required 
"""

import requests
import numpy as np
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# CONFIG — edit these for your own hotspot / target site
# ---------------------------------------------------------------------------

# Example hotspot: Liwa desert area, UAE (known aeolian sand source region)
HOTSPOT = {"name": "Liwa Desert (test hotspot)", "lat": 23.13, "lon": 53.78}

# Example target site: Abu Dhabi city center
TARGET = {"name": "Abu Dhabi City (test target)", "lat": 24.4539, "lon": 54.3773}

# How far back to pull historical wind data for the ensemble average
YEARS_OF_HISTORY = 1

# Erosion fraction assumption (this is your "slider" — % of loose topsoil
# at the hotspot assumed to be mobilized per event). Placeholder value.
EROSION_FRACTION = 0.02  # 2%


# ---------------------------------------------------------------------------
# 1. HISTORICAL WIND ENSEMBLE (Open-Meteo)
# ---------------------------------------------------------------------------

def get_historical_wind(lat, lon, years=1):
    """
    Pulls hourly wind speed + direction at 10m for the last \`years\` year(s)
    from Open-Meteo's free historical archive (ERA5-based, no key required).
    Returns two numpy arrays: speeds (m/s... actually km/h by default), directions (deg).
    """
    end = date.today() - timedelta(days=6)  # archive has a short delay
    start = end - timedelta(days=365 * years)

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": "windspeed_10m,winddirection_10m",
        "windspeed_unit": "ms",
        "timezone": "UTC",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()["hourly"]
    speeds = np.array(data["windspeed_10m"], dtype=float)
    dirs = np.array(data["winddirection_10m"], dtype=float)
    times = np.array(data["time"])
    return times, speeds, dirs


def seasonal_wind_rose(times, speeds, dirs, n_sectors=16):
    """
    Buckets wind direction into compass sectors and computes mean speed
    per sector, per season (very simple 4-season split by month).
    Returns a dict: {season: {sector_deg: (frequency, mean_speed)}}
    """
    months = np.array([int(t[5:7]) for t in times])
    season_map = {
        12: "DJF", 1: "DJF", 2: "DJF",
        3: "MAM", 4: "MAM", 5: "MAM",
        6: "JJA", 7: "JJA", 8: "JJA",
        9: "SON", 10: "SON", 11: "SON",
    }
    seasons = np.array([season_map[m] for m in months])

    sector_width = 360 / n_sectors
    sector_idx = np.floor(((dirs + sector_width / 2) % 360) / sector_width).astype(int)

    result = {}
    for season in ["DJF", "MAM", "JJA", "SON"]:
        mask = seasons == season
        result[season] = {}
        for s in range(n_sectors):
            sector_mask = mask & (sector_idx == s)
            count = sector_mask.sum()
            freq = count / mask.sum() if mask.sum() > 0 else 0
            mean_speed = speeds[sector_mask].mean() if count > 0 else 0
            center_deg = s * sector_width
            result[season][center_deg] = (freq, mean_speed)
    return result


# ---------------------------------------------------------------------------
# 2. SAND / SOIL TEXTURE AT HOTSPOT (SoilGrids)
# ---------------------------------------------------------------------------

def get_sand_content(lat, lon):
    """
    Queries ISRIC SoilGrids REST API for sand content (%) at 0-5cm depth
    for the given coordinate. No API key required.
    """
    url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
    params = {
        "lon": lon,
        "lat": lat,
        "property": "sand",
        "depth": "0-5cm",
        "value": "mean",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    try:
        layer = data["properties"]["layers"][0]
        depth_entry = layer["depths"][0]
        raw_value = depth_entry["values"]["mean"]
        # SoilGrids returns values scaled by 10 (g/kg -> %), per their docs
        sand_pct = raw_value / 10.0
        return sand_pct
    except (KeyError, IndexError):
        return None


# ---------------------------------------------------------------------------
# 3. SIMPLE V0 TRANSPORT / DEPOSITION MODEL
# ---------------------------------------------------------------------------

def bearing_and_distance(lat1, lon1, lat2, lon2):
    """Great-circle bearing (deg) and distance (km) from point 1 to point 2."""
    from math import radians, degrees, sin, cos, atan2, sqrt, asin

    lat1r, lon1r, lat2r, lon2r = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2r - lon1r

    x = sin(dlon) * cos(lat2r)
    y = cos(lat1r) * sin(lat2r) - sin(lat1r) * cos(lat2r) * cos(dlon)
    bearing = (degrees(atan2(x, y)) + 360) % 360

    a = sin((lat2r - lat1r) / 2) ** 2 + cos(lat1r) * cos(lat2r) * sin(dlon / 2) ** 2
    distance_km = 2 * 6371 * asin(sqrt(a))

    return bearing, distance_km


def estimate_deposition_fraction(wind_rose, hotspot, target, erosion_fraction,
                                  decay_length_km=100):
    """
    VERY simple v0 placeholder model:
      - Finds the compass sector pointing from hotspot toward target.
      - Looks up how often wind blows in that direction (frequency) and
        how strong it typically is (mean speed) across all seasons.
      - Applies a naive exponential decay with distance to approximate how
        much sand survives transport to the target site.

    This is NOT a real plume/dispersion model — it's a placeholder to get
    an end-to-end number flowing so the pipeline can be tested and refined
    later with a proper transport model (see the CFD / DMB papers).
    """
    bearing, distance_km = bearing_and_distance(
        hotspot["lat"], hotspot["lon"], target["lat"], target["lon"]
    )

    n_sectors = len(next(iter(wind_rose.values())))
    sector_width = 360 / n_sectors
    target_sector = round(bearing / sector_width) * sector_width % 360

    # Average frequency + speed toward that sector across all seasons
    freqs, speeds = [], []
    for season_data in wind_rose.values():
        closest_sector = min(season_data.keys(), key=lambda s: abs(s - target_sector))
        freq, speed = season_data[closest_sector]
        freqs.append(freq)
        speeds.append(speed)
    avg_freq = np.mean(freqs)
    avg_speed = np.mean(speeds)

    distance_decay = np.exp(-distance_km / decay_length_km)
    deposition_fraction = erosion_fraction * avg_freq * distance_decay

    return {
        "bearing_deg": round(bearing, 1),
        "distance_km": round(distance_km, 1),
        "wind_frequency_toward_target": round(avg_freq, 3),
        "avg_wind_speed_ms": round(avg_speed, 2),
        "estimated_deposition_fraction": round(deposition_fraction, 5),
    }


# ---------------------------------------------------------------------------
# MAIN — run the full v0 pipeline
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"Hotspot: {HOTSPOT['name']} ({HOTSPOT['lat']}, {HOTSPOT['lon']})")
    print(f"Target:  {TARGET['name']} ({TARGET['lat']}, {TARGET['lon']})\\n")

    print("1. Pulling historical wind data (Open-Meteo)...")
    times, speeds, dirs = get_historical_wind(HOTSPOT["lat"], HOTSPOT["lon"], YEARS_OF_HISTORY)
    wind_rose = seasonal_wind_rose(times, speeds, dirs)
    print(f"   -> Pulled {len(times)} hourly records, built seasonal wind rose.\\n")

    print("2. Querying sand content at hotspot (SoilGrids)...")
    sand_pct = get_sand_content(HOTSPOT["lat"], HOTSPOT["lon"])
    print(f"   -> Sand content at 0-5cm depth: {sand_pct}%\\n")

    print("3. Running v0 deposition estimate for the configured target site...")
    result = estimate_deposition_fraction(wind_rose, HOTSPOT, TARGET, EROSION_FRACTION)
    print("   Results:")
    for k, v in result.items():
        print(f"     {k}: {v}")
`;
