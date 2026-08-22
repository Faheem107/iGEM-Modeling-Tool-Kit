"""
Read the cached ERA5 hourly wind that `fit_era5_weibull.py` downloaded.

Why this exists
---------------
`scripts/fit_era5_weibull.py` writes one JSON per batch of up to 20 grid cells
into `.era5_cache/`, keyed on the first cell of the batch. That is a download
resume cache, not a query interface. Every validation script needs the same
thing from it: "give me the hourly speed and direction for the cell nearest this
point, optionally restricted to some years and months".

Rather than replicate the batching in four places, this module scans the cache
once and indexes each location by the coordinates the payload itself reports.
Open-Meteo returns the grid point it actually served, which is not always the
point that was asked for, so indexing on the response is correct and indexing on
the request would not be.

Nothing here fetches. If a cell is missing from the cache this raises, because a
validation script silently scoring a subset of the grid is worse than one that
stops.

Used by:
    verify_wind_holdout.py, verify_weibull_fit.py,
    verify_wind_sensitivity.py, verify_wind_stations.py
"""

import json
import pathlib

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = ROOT / ".era5_cache"

#: Reference height of the cached wind. Load bearing: AEOLIAN_CALIB.uStarRatio
#: is calibrated for a 10 m wind, so substituting another height breaks the flux
#: model silently. See DUST_EXPOSURE_MODULE_SPEC.md section 3.
REFERENCE_HEIGHT_M = 10.0


class Cell:
    """One grid cell's full hourly record, with the masks the tests need."""

    __slots__ = ("lon", "lat", "time", "speed", "direction", "year", "month")

    def __init__(self, lon, lat, time, speed, direction):
        self.lon = lon
        self.lat = lat
        self.time = time
        self.speed = speed
        self.direction = direction
        # Parsed once. Slicing 26,304 ISO strings per call was the whole cost of
        # the first version of the hold-out script.
        self.year = np.array([int(t[0:4]) for t in time], dtype=np.int16)
        self.month = np.array([int(t[5:7]) for t in time], dtype=np.int8)

    def select(self, years=None, months=None):
        """Hourly (speed, direction) for the given years and calendar months.

        `years` and `months` are containers or None for "all". Rows where either
        channel is missing are dropped, because a speed without its direction is
        useless to the rose and a direction without its speed is useless to
        everything.
        """
        mask = np.isfinite(self.speed) & np.isfinite(self.direction)
        if years is not None:
            mask &= np.isin(self.year, list(years))
        if months is not None:
            mask &= np.isin(self.month, list(months))
        return self.speed[mask], self.direction[mask]

    def speeds(self, years=None, months=None):
        """Hourly speed only, keeping hours whose direction is missing."""
        mask = np.isfinite(self.speed)
        if years is not None:
            mask &= np.isin(self.year, list(years))
        if months is not None:
            mask &= np.isin(self.month, list(months))
        return self.speed[mask]

    def __repr__(self):
        return f"Cell({self.lon}, {self.lat}, n={len(self.time)})"


_INDEX = None


def _load():
    global _INDEX
    if _INDEX is not None:
        return _INDEX
    if not CACHE.is_dir():
        raise SystemExit(
            f"No ERA5 cache at {CACHE}. Run scripts/fit_era5_weibull.py first; "
            "it downloads and caches the hourly record these tests read."
        )
    index = {}
    for path in sorted(CACHE.glob("*.json")):
        payload = json.loads(path.read_text())
        if isinstance(payload, dict):
            payload = [payload]
        for loc in payload:
            hourly = loc.get("hourly") or {}
            time = hourly.get("time")
            speed = hourly.get("wind_speed_10m")
            direction = hourly.get("wind_direction_10m")
            if not time or speed is None or direction is None:
                continue
            lon = round(float(loc["longitude"]), 3)
            lat = round(float(loc["latitude"]), 3)
            index[(lon, lat)] = Cell(
                lon,
                lat,
                time,
                np.array(speed, dtype=float),
                np.array(direction, dtype=float),
            )
    if not index:
        raise SystemExit(f"{CACHE} holds no usable hourly records.")
    _INDEX = index
    return index


def coverage():
    """(cell count, first timestamp, last timestamp) across the cache."""
    index = _load()
    any_cell = next(iter(index.values()))
    return len(index), any_cell.time[0], any_cell.time[-1]


def nearest(lon, lat, max_deg=1.5):
    """The cached cell nearest (lon, lat).

    Raises rather than returning None: every caller treats a missing cell as a
    reason to stop, so failing here keeps that decision in one place.
    """
    index = _load()
    best, best_d2 = None, None
    for (clon, clat), cell in index.items():
        d2 = (clon - lon) ** 2 + (clat - lat) ** 2
        if best_d2 is None or d2 < best_d2:
            best, best_d2 = cell, d2
    if best is None or best_d2 ** 0.5 > max_deg:
        raise SystemExit(
            f"No cached ERA5 cell within {max_deg} degrees of "
            f"({lon}, {lat}). The cache covers {len(index)} cells."
        )
    return best


def all_cells():
    """Every cached cell, in a stable order."""
    index = _load()
    return [index[k] for k in sorted(index)]


if __name__ == "__main__":
    n, first, last = coverage()
    print(f"{n} cells cached, {first} to {last}")
    c = nearest(54.0, 23.6)
    print(f"nearest to Al Dhafra (54.0, 23.6): {c}")
    s, d = c.select(years=[2024], months=[7])
    print(f"  July 2024: {len(s)} hours, mean {s.mean():.2f} m/s, "
          f"max {s.max():.2f} m/s")
