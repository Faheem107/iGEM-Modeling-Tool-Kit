"""
Build a seasonal dust EMISSION climatology for the Gulf.

The two dust layers already on the map answer the wrong half of the question
between them. Ginoux says where dust leaves the ground but only for March to
May, so it cannot move with the season. CAMS moves with the season but is
concentration, which is where dust already is, a day of transport downwind of
wherever it was raised.

MERRA-2 carries dust emission flux natively, month by month, so it answers both
at once. DUEM001 to DUEM005 are the five dust size bins in kg m-2 s-1.

Needs a free NASA Earthdata Login. Put it in ~/.netrc and chmod 600 that file:

    machine urs.earthdata.nasa.gov login YOUR_USERNAME password YOUR_PASSWORD

You also have to authorise "NASA GESDISC DATA ARCHIVE" once, under
Applications on urs.earthdata.nasa.gov, or every request 401s.

Nothing is committed but the output. No credential is read from anywhere but
~/.netrc and none is printed.

Refuses to write unless the field matches four published or physical facts: a
summer peak (Khalaf & Al-Ajmi 1993), a real seasonal range, a Tigris and
Euphrates plain that out-emits the lower Gulf (Hennen 2017), and near-zero
emission over open water, which is what separates an emission field from the
concentration field we already have.

Run:
    python3 scripts/fetch_merra2_dust_emission.py
"""

import json
import netrc
import pathlib
import statistics
import sys
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "merra2_dust_emission.json"
CACHE = REPO / ".merra2_cache.json"

URS = "urs.earthdata.nasa.gov"
HOST = "https://goldsmr4.gesdisc.eosdis.nasa.gov"

# DUST_EXPOSURE_DATA_SOURCES.md section 1.6 leaves the exact collection name as
# an open item. Rather than hard-coding one and silently producing nonsense if
# it is wrong, the script probes each candidate and prints the one it resolved.
CANDIDATE_COLLECTIONS = [
    ("M2TMNXADG", "5.12.4", "tavgM_2d_adg_Nx"),
    ("M2TMNXAER", "5.12.4", "tavgM_2d_aer_Nx"),
]

# Five dust size bins. Emission is the sum: a single bin is not the flux.
EMISSION_VARS = ["DUEM001", "DUEM002", "DUEM003", "DUEM004", "DUEM005"]

# The exposure map's extent, from src/components/exposure/mapExtent.ts. Kept
# identical to the CAMS grid so both layers land on the same rects.
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 44.0, 60.0, 16.0, 33.0
STEP = 1.0

YEARS = range(2020, 2025)

# MERRA-2's native grid. 0.5 deg lat, 0.625 deg lon, origin at the south pole
# and the antimeridian.
NLAT, NLON = 361, 576
DLAT, DLON = 0.5, 0.625

PAUSE_S = 2

# Open water inside the extent, for the emission-versus-concentration check.
# Mid-Gulf and Gulf of Oman, both well clear of any coast at 0.5 degrees.
WATER_POINTS = [(26.5, 51.5), (24.5, 57.5)]


def opener():
    """A urllib opener that can get through Earthdata Login's redirect dance."""
    try:
        auth = netrc.netrc().authenticators(URS)
    except (FileNotFoundError, netrc.NetrcParseError) as exc:
        raise SystemExit(
            f"Could not read ~/.netrc ({exc}). See the header of this file for the "
            "one line it needs."
        )
    if not auth:
        raise SystemExit(f"~/.netrc has no entry for {URS}. See the header of this file.")
    login, _, password = auth

    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, f"https://{URS}", login, password)
    return urllib.request.build_opener(
        urllib.request.HTTPBasicAuthHandler(mgr),
        urllib.request.HTTPCookieProcessor(CookieJar()),
    )


def granule(collection, version, stem, year, month, stream):
    return (
        f"{HOST}/opendap/MERRA2_MONTHLY/{collection}.{version}/{year}/"
        f"MERRA2_{stream}.{stem}.{year}{month:02d}.nc4"
    )


def get(op, url, tries=4):
    for attempt in range(tries):
        try:
            with op.open(url, timeout=180) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                raise SystemExit(
                    f"Earthdata rejected the request ({exc.code}). Check the ~/.netrc "
                    "entry, and that NASA GESDISC DATA ARCHIVE is authorised under "
                    f"Applications at https://{URS}."
                )
            if exc.code == 404:
                return None
            if attempt == tries - 1:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == tries - 1:
                raise
        time.sleep(20 * (attempt + 1))
    return None


def resolve_collection(op):
    """Find a collection that exists AND carries every emission variable."""
    for collection, version, stem in CANDIDATE_COLLECTIONS:
        for stream in ("400", "401"):
            url = granule(collection, version, stem, 2020, 1, stream)
            dds = get(op, url + ".dds")
            if not dds:
                continue
            missing = [v for v in EMISSION_VARS if v not in dds]
            if missing:
                print(f"  {collection} exists but does not carry {', '.join(missing)}")
                break
            print(f"  resolved collection {collection}.{version} ({stem})")
            return collection, version, stem
    raise SystemExit(
        "None of the candidate collections carried "
        f"{', '.join(EMISSION_VARS)}. The names in CANDIDATE_COLLECTIONS are the open "
        "item flagged in DUST_EXPOSURE_DATA_SOURCES.md section 1.6; check the current "
        "short name at https://disc.gsfc.nasa.gov and put it at the top of the list."
    )


def index_window():
    i0 = int(round((LAT_MIN + 90.0) / DLAT))
    i1 = int(round((LAT_MAX + 90.0) / DLAT))
    j0 = int((LON_MIN + 180.0) / DLON)
    j1 = int((LON_MAX + 180.0) / DLON) + 1
    return i0, min(i1, NLAT - 1), j0, min(j1, NLON - 1)


def parse_ascii(text, nrows, ncols):
    """
    Pull one variable's [1][nrows][ncols] block out of an OPeNDAP .ascii body.

    The body is the DDS, then a line naming the variable, then one row per
    latitude as `index, v, v, v...`. Anything else in the file is coordinate
    arrays, which we do not need because the index window fixes the geometry.
    """
    rows = []
    for line in text.splitlines():
        if "," not in line:
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != ncols + 1:
            continue
        try:
            vals = [float(p) for p in parts[1:]]
        except ValueError:
            continue
        rows.append(vals)
        if len(rows) == nrows:
            break
    if len(rows) != nrows:
        return None
    return rows


def fetch_month(op, collection, version, stem, year, month, win):
    i0, i1, j0, j1 = win
    sel = f"[0][{i0}:{i1}][{j0}:{j1}]"
    total = None
    for var in EMISSION_VARS:
        body = None
        for stream in ("400", "401"):
            url = granule(collection, version, stem, year, month, stream)
            body = get(op, f"{url}.ascii?{var}{sel}")
            if body:
                break
        if not body:
            return None
        rows = parse_ascii(body, i1 - i0 + 1, j1 - j0 + 1)
        if rows is None:
            return None
        if total is None:
            total = rows
        else:
            total = [[a + b for a, b in zip(ra, rb)] for ra, rb in zip(total, rows)]
        time.sleep(0.4)
    return total


def to_our_grid(native, win):
    """
    Average the native 0.5 x 0.625 cells into our 1 degree boxes.

    A mean, not a sum: the value stays a flux per unit area, so a box with more
    native cells in it does not read as more emissive than its neighbour.
    """
    i0, _, j0, _ = win
    buckets = {}
    for r, row in enumerate(native):
        lat = (i0 + r) * DLAT - 90.0
        for c, v in enumerate(row):
            lon = (j0 + c) * DLON - 180.0
            if v > 1e14:  # MERRA-2 fill value
                continue
            key = (int((lat - LAT_MIN) // STEP), int((lon - LON_MIN) // STEP))
            if key[0] < 0 or key[1] < 0:
                continue
            buckets.setdefault(key, []).append(v)
    return {k: sum(v) / len(v) for k, v in buckets.items()}


def cell_near(cells, lat, lon):
    best, bd = None, None
    for key, cell in cells.items():
        clat, clon = (float(v) for v in key.split(","))
        d = (clat - lat) ** 2 + (clon - lon) ** 2
        if bd is None or d < bd:
            best, bd = cell, d
    return best


def main():
    op = opener()
    print("resolving the collection")
    collection, version, stem = resolve_collection(op)

    win = index_window()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    # monthly[(gy, gx)][month-1] = list of yearly values
    acc = {}
    for year in YEARS:
        for month in range(1, 13):
            tag = f"{year}-{month:02d}"
            if tag in cache:
                grid = {tuple(map(int, k.split("|"))): v for k, v in cache[tag].items()}
            else:
                native = fetch_month(op, collection, version, stem, year, month, win)
                if native is None:
                    print(f"  {tag} unavailable, skipped", file=sys.stderr)
                    continue
                grid = to_our_grid(native, win)
                cache[tag] = {f"{k[0]}|{k[1]}": v for k, v in grid.items()}
                CACHE.write_text(json.dumps(cache))
                print(f"  {tag}  {len(grid)} cells")
                time.sleep(PAUSE_S)
            for key, v in grid.items():
                acc.setdefault(key, [[] for _ in range(12)])[month - 1].append(v)

    if not acc:
        raise SystemExit("No months were retrieved. Nothing to check and nothing to write.")

    cells = {}
    for (gy, gx), months in acc.items():
        lat = LAT_MIN + gy * STEP
        lon = LON_MIN + gx * STEP
        if lat > LAT_MAX or lon > LON_MAX:
            continue
        monthly, spread = [], []
        for vals in months:
            if not vals:
                monthly.append(None)
                spread.append(None)
                continue
            monthly.append(round(sum(vals) / len(vals) * 1e9, 4))
            spread.append(round(statistics.stdev(vals) * 1e9, 4) if len(vals) > 1 else None)
        cells[f"{lat},{lon}"] = {"monthly": monthly, "spread": spread}

    # -- Checks. Same discipline as the CAMS builder: nothing is written unless
    # -- the field behaves the way the literature and the physics say it should.
    problems = []
    filled = [c for c in cells.values() if all(v is not None for v in c["monthly"])]
    if len(filled) < 0.9 * len(cells):
        problems.append(f"only {len(filled)} of {len(cells)} cells have all twelve months")

    # 1. A summer maximum, as for concentration.
    peaks = [c["monthly"].index(max(c["monthly"])) + 1 for c in filled if max(c["monthly"]) > 0]
    summer = sum(1 for m in peaks if 5 <= m <= 8)
    if peaks and summer < 0.6 * len(peaks):
        problems.append(
            f"only {summer} of {len(peaks)} emitting cells peak between May and August, "
            "which contradicts the measured Shamal season"
        )

    # 2. A real seasonal range, or there is no season worth drawing.
    ratios = [
        max(c["monthly"]) / max(1e-6, min(v for v in c["monthly"] if v > 0))
        for c in filled
        if max(c["monthly"]) > 0 and any(v > 0 for v in c["monthly"])
    ]
    median_ratio = sorted(ratios)[len(ratios) // 2] if ratios else 0.0
    if median_ratio < 1.8:
        problems.append(f"median summer to winter ratio only {median_ratio:.2f}, too flat")

    # 3. Hennen 2017: the flood plain dominates Middle East emission.
    plain = cell_near(cells, 31.0, 47.0)
    gulf = cell_near(cells, 24.0, 55.0)
    plain_mean = gulf_mean = None
    if plain and gulf:
        plain_mean = sum(v or 0 for v in plain["monthly"]) / 12
        gulf_mean = sum(v or 0 for v in gulf["monthly"]) / 12
        if plain_mean <= gulf_mean:
            problems.append(
                f"the flood plain ({plain_mean:.3f}) does not out-emit the lower Gulf "
                f"({gulf_mean:.3f}), which contradicts Hennen 2017"
            )

    # 4. The check that separates emission from concentration. Dust blows OVER
    #    water constantly; none is raised from it. If open-water cells carry a
    #    real flux we have fetched a concentration field by mistake.
    land_max = max((max(v or 0 for v in c["monthly"]) for c in cells.values()), default=0)
    water = []
    for lat, lon in WATER_POINTS:
        c = cell_near(cells, lat, lon)
        if c:
            water.append(max(v or 0 for v in c["monthly"]))
    if water and land_max > 0 and max(water) > 0.02 * land_max:
        problems.append(
            f"open water emits {max(water):.4f} against a land maximum of {land_max:.4f}. "
            "An emission field should be near zero over the sea; this looks like a "
            "concentration field."
        )

    print(f"  {summer} of {len(peaks)} emitting cells peak in May to August")
    print(f"  median seasonal ratio {median_ratio:.2f}")
    if plain_mean is not None:
        print(f"  flood plain {plain_mean:.4f} vs lower Gulf {gulf_mean:.4f}")
    if water:
        print(f"  open water {max(water):.4f} vs land maximum {land_max:.4f}")

    if problems:
        for p in problems:
            print(f"  FAIL {p}", file=sys.stderr)
        raise SystemExit("Refusing to write an emission field that contradicts the literature.")

    payload = {
        "provenance": {
            "source": f"MERRA-2 {collection}.{version} via NASA GES DISC OPeNDAP, "
                      "Earthdata Login required",
            "variable": "dust emission flux, sum of DUEM001 to DUEM005, reported in "
                        "1e-9 kg m-2 s-1",
            "period": f"{min(YEARS)}-01 to {max(YEARS)}-12",
            "grid": f"{STEP} deg over {LON_MIN} to {LON_MAX} E, {LAT_MIN} to {LAT_MAX} N, "
                    f"averaged from the native {DLAT} x {DLON} deg grid",
            "statistic": "mean by calendar month, with the standard deviation between "
                         "individual years as `spread`",
            "whatThisIs": (
                "Where dust LEAVES THE GROUND, which is the question the Ginoux mask "
                "answers for March to May only and the CAMS layer does not answer at "
                "all. Pair it with cams_dust_climatology.json rather than replacing "
                "that file: one is emission, the other is what arrives."
            ),
            "modelNote": (
                "A reanalysis field. MERRA-2 assimilates satellite aerosol optical "
                "depth, so the dust burden is observation-constrained, but emission is "
                "the model's own diagnostic and no instrument measures it directly."
            ),
            "checks": {
                "cellsPeakingMayToAugust": f"{summer} of {len(peaks)}",
                "medianSeasonalRatio": round(median_ratio, 2),
                "openWaterVsLandMaximum": f"{max(water):.4f} vs {land_max:.4f}" if water else "not run",
                "againstKhalafAlAjmi1993": "measured Kuwaiti drift peaks May to August",
                "againstHennen2017": "Tigris and Euphrates plain dominates Middle East dust",
            },
        },
        "step": STEP,
        "cells": cells,
    }
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    CACHE.unlink(missing_ok=True)
    print(f"\nwrote {OUT.relative_to(REPO)}: {len(cells)} cells, "
          f"{OUT.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
