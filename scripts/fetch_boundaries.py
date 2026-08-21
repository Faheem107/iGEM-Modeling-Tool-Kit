"""
Build the coastline and country outlines the exposure map draws on.

Without them the map is a graticule with polygons floating on it, and a reader
cannot tell the Gulf from the Rub al Khali, or which side of a border a site is
on. The map is hand-rolled inline SVG (no Leaflet, no d3-geo, no tile server),
so this writes plain lon/lat rings that the component projects itself.

Source
------
Natural Earth 1:50m Admin 0 countries, via the natural-earth-vector mirror.
Natural Earth is public domain: "no permission needed", though a credit is
appreciated and is given in the module's Sources window.

What it does
------------
Keeps the countries that intersect the map extent, clips every ring to a padded
box, drops rings too small to see at the rendered size, and rounds coordinates
to 3 decimal places (about 100 m, far finer than a 1600 px wide map needs).
That takes a 3 MB global file down to something small enough to ship.

Run
---
    python scripts/fetch_boundaries.py
"""

import json
import pathlib
import urllib.request

SRC = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
       "master/geojson/ne_50m_admin_0_countries.geojson")

# Matches EXTENT in src/components/exposure/ExposureMap.tsx, with a margin so
# clipped edges land outside the drawn area rather than on it.
LON_MIN, LON_MAX = 44.0, 60.0
LAT_MIN, LAT_MAX = 16.0, 33.0
PAD = 1.5

# Rings smaller than this in degrees squared are specks at the rendered size.
MIN_AREA = 0.0006
PRECISION = 3

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "data" / "gulf_boundaries.geojson"


def clip_ring(ring):
    """Sutherland-Hodgman against the padded box.

    Clipping rather than dropping matters: Saudi Arabia and Iran run well past
    the extent, and an unclipped ring would carry thousands of vertices that
    never appear on screen.
    """
    box = (LON_MIN - PAD, LON_MAX + PAD, LAT_MIN - PAD, LAT_MAX + PAD)
    edges = (
        ("x>", box[0]), ("x<", box[1]),
        ("y>", box[2]), ("y<", box[3]),
    )
    poly = list(ring)
    for kind, val in edges:
        if not poly:
            return []
        inside = ((lambda p: p[0] >= val) if kind == "x>" else
                  (lambda p: p[0] <= val) if kind == "x<" else
                  (lambda p: p[1] >= val) if kind == "y>" else
                  (lambda p: p[1] <= val))

        def cut(a, b):
            if kind in ("x>", "x<"):
                t = (val - a[0]) / (b[0] - a[0])
                return [val, a[1] + t * (b[1] - a[1])]
            t = (val - a[1]) / (b[1] - a[1])
            return [a[0] + t * (b[0] - a[0]), val]

        out = []
        for i, cur in enumerate(poly):
            prev = poly[i - 1]
            ci, pi = inside(cur), inside(prev)
            if ci:
                if not pi:
                    out.append(cut(prev, cur))
                out.append(cur)
            elif pi:
                out.append(cut(prev, cur))
        poly = out
    return poly


def area(ring):
    """Absolute shoelace area in square degrees. Only used to drop specks."""
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def touches(rings):
    b = (LON_MIN - PAD, LON_MAX + PAD, LAT_MIN - PAD, LAT_MAX + PAD)
    for r in rings:
        for x, y in r:
            if b[0] <= x <= b[1] and b[2] <= y <= b[3]:
                return True
    return False


def main():
    print(f"fetching {SRC}")
    with urllib.request.urlopen(SRC, timeout=300) as r:
        world = json.loads(r.read())

    features, kept_pts, total_pts = [], 0, 0
    for f in world["features"]:
        g = f["geometry"]
        polys = (g["coordinates"] if g["type"] == "MultiPolygon"
                 else [g["coordinates"]])
        outer = [p[0] for p in polys]
        total_pts += sum(len(r) for r in outer)
        if not touches(outer):
            continue

        rings = []
        for ring in outer:
            c = clip_ring(ring)
            if len(c) >= 4 and area(c) >= MIN_AREA:
                rings.append([[round(x, PRECISION), round(y, PRECISION)]
                              for x, y in c])
        if not rings:
            continue
        kept_pts += sum(len(r) for r in rings)

        props = f["properties"]
        features.append({
            "type": "Feature",
            "properties": {
                "name": props.get("ADMIN") or props.get("NAME"),
                "iso": props.get("ISO_A3"),
            },
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[r] for r in rings]},
        })

    doc = {
        "type": "FeatureCollection",
        "metadata": {
            "what": "Country outlines and coastline for the exposure map, clipped "
                    "to the Gulf extent.",
            "source": "Natural Earth 1:50m Admin 0 countries",
            "url": SRC,
            "licence": "Public domain. Natural Earth asks for no permission; the "
                       "credit in the module's Sources window is courtesy.",
            "extent": {"lonMin": LON_MIN, "lonMax": LON_MAX,
                       "latMin": LAT_MIN, "latMax": LAT_MAX, "padDeg": PAD},
            "processing": f"Sutherland-Hodgman clip to the padded extent, rings "
                          f"under {MIN_AREA} sq deg dropped, coordinates rounded "
                          f"to {PRECISION} decimal places",
            "built_by": "scripts/fetch_boundaries.py",
        },
        "features": sorted(features, key=lambda f: f["properties"]["name"] or ""),
    }
    OUT.write_text(json.dumps(doc, separators=(",", ":")))
    print(f"{len(features)} countries, {kept_pts} vertices kept of {total_pts} "
          f"in the source")
    for f in doc["features"]:
        n = sum(len(r[0]) for r in f["geometry"]["coordinates"])
        print(f"   {f['properties']['name']:<24} {n:>5} pts")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
