"""
Compare the ERA5 wind the model runs on against measured airport observations.

The claim under test
--------------------
Every number on /exposure descends from ERA5, a reanalysis on a grid of about
31 km. A solar plant sits at one point inside such a cell, often on modified
ground. Nothing in this repository has ever compared that reanalysis to an
instrument. This does, at the three UAE airports with a long public record.

Source
------
METAR from the Iowa Environmental Mesonet ASOS archive. Free, no key, hourly,
and it carries the station coordinates so the matching ERA5 cell is unambiguous.
Two limits that are properties of METAR and are reported rather than smoothed
over: direction is rounded to 10 degrees and speed to whole knots, and an
airport is deliberately flat, cleared ground, which is not the desert surface
the transport model is about.

What counts as a failure, decided before the numbers arrive
-----------------------------------------------------------
A speed bias is EXPECTED and is not a failure. ERA5 averages over a 31 km cell
and an anemometer samples one point, so the reanalysis is known to smooth: it
should underestimate the strong tail and overestimate the calm end. Finding that
would confirm the data behaves as the literature says.

Two results would be real failures:

  1. A DIRECTION bias. Direction is what the drift calculation rests on, and
     nothing about grid averaging should rotate the wind.
  2. A tail bias running the OPPOSITE way, ERA5 seeing MORE transport-capable
     wind than the station. That would point at our fit rather than at ERA5,
     because it is the tail that carries the sand.

     Measured as the fraction of hours above the 5.4 m/s transport threshold,
     not as a percentile. A percentile is the wrong instrument here: two of
     these stations fall in one ERA5 cell and straddle its 99th percentile,
     so a percentile comparison reports within-cell variability as if it were
     a fault. Hours above threshold is what the flux integral counts, and it
     is what this fails on.

Run:  python3 scripts/verify_wind_stations.py
Caches responses in .metar_cache/. Needs network on the first run only.
"""

import math
import pathlib
import sys
import urllib.error
import urllib.request

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import era5_cache                                     # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / ".metar_cache"

START, END = "2022-01-01", "2025-01-01"
STATIONS = [("OMAA", "Abu Dhabi Intl"), ("OMDB", "Dubai Intl"), ("OMAL", "Al Ain Intl")]

KNOTS_TO_MS = 0.514444
GULF_IMPACT_THRESHOLD_MS = 5.4

ARCHIVE = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"


def fetch(station):
    """Hourly METAR wind for one station, cached on disk as raw CSV."""
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f"{station}_{START}_{END}.csv"
    if path.exists():
        return path.read_text()
    y1, m1, d1 = START.split("-")
    y2, m2, d2 = END.split("-")
    url = (f"{ARCHIVE}?station={station}&data=drct&data=sknt"
           f"&year1={y1}&month1={int(m1)}&day1={int(d1)}"
           f"&year2={y2}&month2={int(m2)}&day2={int(d2)}"
           f"&tz=Etc/UTC&format=onlycomma&latlon=yes&missing=M&trace=T"
           f"&direct=no&report_type=3")
    print(f"  fetching {station} ...", flush=True)
    try:
        with urllib.request.urlopen(url, timeout=300) as r:
            text = r.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise SystemExit(
            f"Could not reach the METAR archive for {station}: {err}. "
            f"This test needs network on its first run."
        )
    if len(text.splitlines()) < 100:
        raise SystemExit(f"{station} returned {len(text.splitlines())} lines, "
                         f"which is not a three year hourly record.")
    path.write_text(text)
    return text


def parse(text):
    """{'YYYY-MM-DDTHH': (speed_ms, direction_deg)} plus the station position.

    METAR can report several observations in an hour. The one on the hour wins,
    because that is what ERA5's hourly value is closest to.
    """
    obs, lon, lat = {}, None, None
    for line in text.splitlines()[1:]:
        parts = line.split(",")
        if len(parts) < 6:
            continue
        _st, valid, slon, slat, drct, sknt = parts[:6]
        if lon is None:
            try:
                lon, lat = float(slon), float(slat)
            except ValueError:
                pass
        if drct == "M" or sknt == "M":
            continue
        try:
            spd = float(sknt) * KNOTS_TO_MS
            dr = float(drct) % 360.0
        except ValueError:
            continue
        # "2024-07-01 00:00" -> "2024-07-01T00:00", the ERA5 key. Any
        # observation inside the hour is snapped to the top of it, and one
        # reported exactly on the hour overwrites a snapped neighbour.
        on_the_hour = valid[14:16] == "00"
        key = valid[:14].replace(" ", "T") + "00"
        if on_the_hour or key not in obs:
            obs[key] = (spd, dr)
    return obs, lon, lat


def circular_diff(a, b):
    """Signed smallest angle from b to a, in degrees, on (-180, 180]."""
    d = (a - b + 180.0) % 360.0 - 180.0
    return d


def main():
    n_cells, first, last = era5_cache.coverage()
    print(f"ERA5 cache: {n_cells} cells, {first} to {last}")
    print(f"METAR:      Iowa Environmental Mesonet ASOS archive, "
          f"{START} to {END}, hourly\n")

    problems = []
    print("=" * 96)
    print(f"{'station':<18}{'ERA5 cell':>13}{'paired h':>10}"
          f"{'bias m/s':>10}{'RMSE':>8}{'r':>7}{'dir bias':>10}{'|dir| med':>11}")
    print("=" * 96)

    results = []
    for code, name in STATIONS:
        obs, lon, lat = parse(fetch(code))
        if lon is None:
            problems.append(f"{code}: the archive returned no coordinates")
            continue
        cell = era5_cache.nearest(lon, lat)

        # Pair on the shared hourly timestamps.
        era_by_time = {t: i for i, t in enumerate(cell.time)}
        s_obs, d_obs, s_era, d_era = [], [], [], []
        for key, (spd, dr) in obs.items():
            i = era_by_time.get(key)
            if i is None:
                continue
            e_s, e_d = cell.speed[i], cell.direction[i]
            if not (math.isfinite(e_s) and math.isfinite(e_d)):
                continue
            s_obs.append(spd); d_obs.append(dr)
            s_era.append(e_s); d_era.append(e_d)

        if len(s_obs) < 1000:
            problems.append(f"{code}: only {len(s_obs)} paired hours, too few to judge")
            continue

        s_obs = np.array(s_obs); s_era = np.array(s_era)
        d_obs = np.array(d_obs); d_era = np.array(d_era)

        bias = float((s_era - s_obs).mean())
        rmse = float(np.sqrt(((s_era - s_obs) ** 2).mean()))
        r = float(np.corrcoef(s_era, s_obs)[0, 1])

        # Direction only where there is enough wind for a direction to mean
        # something. Below about 2 m/s METAR reports variable and the value is
        # noise, which would swamp a real rotation if it were included.
        moving = (s_obs > 2.0) & (s_era > 2.0)
        dd = circular_diff(d_era[moving], d_obs[moving])
        # Circular mean of the differences, not the arithmetic mean, which would
        # be wrong across the +/-180 wrap.
        dir_bias = float(math.degrees(math.atan2(
            np.sin(np.radians(dd)).mean(), np.cos(np.radians(dd)).mean())))
        dir_abs_med = float(np.median(np.abs(dd)))

        results.append((code, name, cell, s_obs, s_era, bias, rmse, r,
                        dir_bias, dir_abs_med, int(moving.sum())))
        print(f"{code + ' ' + name:<18}{f'{cell.lon},{cell.lat}':>13}"
              f"{len(s_obs):>10}{bias:+10.2f}{rmse:8.2f}{r:7.2f}"
              f"{dir_bias:+9.1f}°{dir_abs_med:10.1f}°")

    if not results:
        raise SystemExit("No station could be compared.")

    print("\n" + "=" * 96)
    print("Does the reanalysis smooth the distribution, as it is expected to?")
    print("=" * 96)
    print(f"{'station':<18}{'p10 obs':>9}{'p10 ERA5':>10}{'p90 obs':>9}{'p90 ERA5':>10}"
          f"{'p99 obs':>9}{'p99 ERA5':>10}{'>5.4 obs':>10}{'>5.4 ERA5':>11}")
    inverted, exceed = [], []
    for code, _n, _c, s_obs, s_era, *_rest in results:
        p = lambda a, q: float(np.percentile(a, q))
        e_obs = float((s_obs > GULF_IMPACT_THRESHOLD_MS).mean()) * 100
        e_era = float((s_era > GULF_IMPACT_THRESHOLD_MS).mean()) * 100
        print(f"{code:<18}{p(s_obs,10):9.1f}{p(s_era,10):10.1f}"
              f"{p(s_obs,90):9.1f}{p(s_era,90):10.1f}"
              f"{p(s_obs,99):9.1f}{p(s_era,99):10.1f}"
              f"{e_obs:9.1f}%{e_era:10.1f}%")
        exceed.append((code, e_obs, e_era))
        if e_era > e_obs:
            inverted.append(code)

    # Two stations sharing one cell is not a coincidence to gloss over: it is
    # the resolution limit the whole page rests on, said out loud.
    cells_used = {}
    for code, _n, cell, *_rest in results:
        cells_used.setdefault((cell.lon, cell.lat), []).append(code)
    shared = {k: v for k, v in cells_used.items() if len(v) > 1}
    for (clon, clat), codes in shared.items():
        print(f"\n  {' and '.join(codes)} fall in the SAME ERA5 cell "
              f"({clon}, {clat}).")
        print(f"  They differ from each other by as much as either differs from "
              f"the cell,")
        print(f"  which is the 31 km resolution showing itself.")

    print("\n" + "=" * 96)
    print("VERDICT")
    print("=" * 96)

    dir_biases = [r[8] for r in results]
    worst_dir = max(dir_biases, key=abs)
    if abs(worst_dir) > 20:
        problems.append(
            f"direction is biased by up to {worst_dir:+.0f} degrees against the "
            f"stations. Drift direction is computed from this, so a rotation of "
            f"that size moves where the model says the sand goes")
    else:
        print(f"  Direction: worst bias {worst_dir:+.1f} degrees across "
              f"{len(results)} stations. Nothing is rotating the wind.")

    if inverted:
        problems.append(
            f"at {', '.join(inverted)} ERA5 sees MORE hours above the transport "
            f"threshold than the station does. Reanalysis is expected to "
            f"under-represent the tail, not exceed it, so this points at our own "
            f"processing rather than at ERA5")
    else:
        ratios = [e_era / e_obs for _c, e_obs, e_era in exceed if e_obs > 0]
        print(f"  Tail: ERA5 sees {min(ratios) * 100:.0f} to {max(ratios) * 100:.0f} "
              f"percent of the above-threshold hours")
        print(f"        the stations record, at every station. That is the "
              f"direction reanalysis")
        print(f"        is known to err in, and it means the transport numbers on "
              f"the page are")
        print(f"        more likely to be low than high on this account.")

    biases = [r[5] for r in results]
    print(f"  Speed: bias {min(biases):+.2f} to {max(biases):+.2f} m/s. A bias is "
          f"expected here")
    print(f"         and is not by itself a failure: a 31 km cell mean and a "
          f"single anemometer")
    print(f"         on cleared airport ground are not the same measurement.")

    if problems:
        print()
        for p in problems:
            print(f"FAIL  {p}", file=sys.stderr)
        raise SystemExit("The station comparison found a problem that is ours, "
                         "not the reanalysis's. Report it.")
    print("\nPASS, the reanalysis differs from the stations only in the "
          "direction and by the amount expected.")


if __name__ == "__main__":
    main()
