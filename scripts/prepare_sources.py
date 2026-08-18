"""
Ginoux 2012 dust source polygons: KML to simplified GeoJSON for the web map.

Input : references/rog1742-sup-0002-sfts01/Middle_East_MAM.kml  (3.7 MB, 4084 polygons)
Output: public/data/ginoux_middle_east_mam.geojson

What the polygons mean, from the supplement readme:
  frequency of occurrence (FoO), the percentage of days in the season on which
  MODIS Deep Blue dust optical depth at 550 nm exceeds 0.2, on a 0.1 degree grid,
  restricted to cells whose Deep Blue surface reflectivity at 550 nm exceeds 0.15.
Each polygon is tagged natural / anthropogenic / hydrologic by threshold rules on
land use and ephemeral water body fraction. FoO is a frequency of ACTIVATION, not
an emitted mass. Do not convert it to mass without saying so.

The Middle East file covers MAM only. Ginoux published one season per region.

Simplification uses Douglas-Peucker and the tolerance is recorded in the output so
the geometry is reproducible.

Run: python3 scripts/prepare_sources.py
"""

import json
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "references", "rog1742-sup-0002-sfts01", "Middle_East_MAM.kml")
OUT = os.path.join(REPO, "public", "data", "ginoux_middle_east_mam.geojson")

TOLERANCE_DEG = 0.02   # about 2 km at this latitude, well below the 0.1 deg grid
MIN_VERTICES = 4
GULF_BBOX = (44.0, 16.0, 60.0, 33.0)   # lon_min, lat_min, lon_max, lat_max


def perpendicular_distance(pt, a, b):
    (x, y), (x1, y1), (x2, y2) = pt, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    px, py = x1 + t * dx, y1 + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5


def douglas_peucker(points, tol):
    if len(points) < 3:
        return points
    dmax, index = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], points[0], points[-1])
        if d > dmax:
            dmax, index = d, i
    if dmax > tol:
        left = douglas_peucker(points[: index + 1], tol)
        right = douglas_peucker(points[index:], tol)
        return left[:-1] + right
    return [points[0], points[-1]]


def main():
    with open(SRC, encoding="utf-8", errors="replace") as fh:
        kml = fh.read()

    features = []
    kept_v = dropped_v = 0
    for pm in re.findall(r"<Placemark>(.*?)</Placemark>", kml, re.S):
        m = re.search(r"<styleUrl>#([a-z]+)_dust_(\d+)</styleUrl>", pm)
        if not m:
            continue
        source_type, foo = m.group(1), int(m.group(2))
        for coord_block in re.findall(r"<coordinates>(.*?)</coordinates>", pm, re.S):
            ring = []
            for tok in coord_block.split():
                parts = tok.split(",")
                if len(parts) >= 2:
                    try:
                        ring.append((float(parts[0]), float(parts[1])))
                    except ValueError:
                        pass
            if len(ring) < MIN_VERTICES:
                continue
            lons = [p[0] for p in ring]
            lats = [p[1] for p in ring]
            if (max(lons) < GULF_BBOX[0] or min(lons) > GULF_BBOX[2]
                    or max(lats) < GULF_BBOX[1] or min(lats) > GULF_BBOX[3]):
                continue
            dropped_v += len(ring)
            simple = douglas_peucker(ring, TOLERANCE_DEG)
            if len(simple) < MIN_VERTICES:
                continue
            if simple[0] != simple[-1]:
                simple.append(simple[0])
            kept_v += len(simple)
            features.append({
                "type": "Feature",
                "properties": {"source_type": source_type, "foo_threshold": foo},
                "geometry": {"type": "Polygon",
                             "coordinates": [[[round(x, 4), round(y, 4)] for x, y in simple]]},
            })

    fc = {
        "type": "FeatureCollection",
        "metadata": {
            "source": ("Ginoux et al. 2012, Rev. Geophys. 50, RG3005, doi 10.1029/2012RG000388, "
                       "auxiliary material Middle_East_MAM.kml"),
            "quantity": ("frequency of occurrence, percentage of days in the season with MODIS "
                         "Deep Blue dust optical depth at 550 nm above 0.2, 0.1 degree grid"),
            "season": "MAM only. Ginoux published one season per region; there is no other for the Middle East.",
            "caveat": ("FoO is a frequency of activation, not an emitted mass. The 0.15 surface "
                       "reflectivity mask makes the product blind to sources on dark surfaces."),
            "simplification": f"Douglas-Peucker, tolerance {TOLERANCE_DEG} degrees",
            "bbox_filter": list(GULF_BBOX),
        },
        "features": features,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(fc, fh, separators=(",", ":"))

    size_mb = os.path.getsize(OUT) / 1e6
    print(f"polygons kept : {len(features)}")
    print(f"vertices      : {dropped_v} -> {kept_v}  ({100*kept_v/max(dropped_v,1):.1f}% retained)")
    print(f"tolerance     : {TOLERANCE_DEG} deg")
    print(f"output        : {os.path.relpath(OUT, REPO)}  ({size_mb:.2f} MB)")
    from collections import Counter
    c = Counter((f["properties"]["source_type"], f["properties"]["foo_threshold"]) for f in features)
    for k in sorted(c):
        print(f"   {k[0]:<8} FoO>{k[1]:>3}%  {c[k]:>5}")


if __name__ == "__main__":
    main()
