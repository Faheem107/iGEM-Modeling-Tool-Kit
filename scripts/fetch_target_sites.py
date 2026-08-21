"""
Build the list of UAE assets the exposure module prices against.

Why this was rewritten
----------------------
The previous public/data/uae_target_sites.json was an unreviewed Overpass dump.
It carried 51 entries thinned to 8 km separation, four names in Arabic or
Persian script, several bare OSM tags that are not assets at all ("football
ground", "abandoned quarry", "GSM", "Green house", "Zariba"), and four sites
outside the UAE entirely (Ras Abu Fontas in Qatar, Shaybah 4 GOSP in Saudi
Arabia, Abu Musa Airport, Buraimi Airport in Oman) despite the file's own
provenance block claiming a UAE bounding box filter. Everything the module
computes is computed per site, so the list has to be right first.

What changed
------------
1. Query by UAE admin area rather than a bounding box.
2. Filter again by point-in-polygon against the ARE outline already in
   public/data/gulf_boundaries.geojson. A bounding box over the lower Gulf
   necessarily includes Qatari and Iranian territory; the polygon does not.
3. Resolve an English name: name:en, then int_name, then official_name:en, then
   a deterministic transliteration of the Arabic name. The original is kept in
   nameLocal so nothing is silently discarded.
4. Drop entries whose name is a bare generic noun, and drop disused, abandoned
   and under-construction lifecycle prefixes.
5. No thinning. Every site that passes is kept, because the calculation runs per
   site and a thinned list answers a different question.

The script refuses to write if the result fails its own checks, the same
contract fit_era5_weibull.py holds itself to.

Licence
-------
OpenStreetMap via Overpass, ODbL 1.0. Attribution is required and share-alike
applies to a derived database. Both are recorded in the output provenance and
rendered in the module footer.

Run
---
    python3 scripts/fetch_target_sites.py
"""

import json
import math
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "uae_target_sites.json"
BOUNDARIES = REPO / "public" / "data" / "gulf_boundaries.geojson"
GINOUX = REPO / "public" / "data" / "ginoux_middle_east_mam.geojson"
EMIRATES = REPO / "public" / "data" / "uae_emirates.geojson"

# Natural Earth 1:10m admin 1, which carries all seven emirates. Public domain.
NE_ADMIN1 = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
             "master/geojson/ne_10m_admin_1_states_provinces.geojson")

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# One query per market so each can be tuned without disturbing the others.
# "out center" gives a representative point for ways and relations.
MARKETS = {
    "solar": {
        "label": "Utility solar",
        "note": "Soiling and abrasion on PV glass.",
        "query": """
          nwr(area.ae)["power"="plant"]["plant:source"="solar"];
          nwr(area.ae)["power"="plant"]["plant:source"~"solar"];
        """,
    },
    "aviation": {
        "label": "Airports",
        "note": "Visibility, runway sand, and an observed dust record.",
        "query": """
          nwr(area.ae)["aeroway"="aerodrome"]["name"];
        """,
    },
    "industrial": {
        "label": "Industrial and logistics",
        "note": "Abrasion, ingress and HSE exposure.",
        "query": """
          nwr(area.ae)["landuse"="industrial"]["name"];
          nwr(area.ae)["man_made"="works"]["name"];
          nwr(area.ae)["landuse"="quarry"]["name"];
          nwr(area.ae)["power"="plant"]["name"]["plant:source"!~"solar"];
        """,
    },
    "agriculture": {
        "label": "Agriculture",
        "note": "Deposition on leaves, reduced photosynthesis.",
        "query": """
          nwr(area.ae)["landuse"="farmland"]["name"];
          nwr(area.ae)["landuse"="greenhouse_horticulture"]["name"];
          nwr(area.ae)["landuse"="orchard"]["name"];
        """,
    },
}

# A name that is only a generic noun describes a land use, not an asset a buyer
# could be named. These are matched against the whole lowercased name, so
# "Green house" is dropped and "Al Rawabi Green House" is kept.
GENERIC_NAMES = {
    "football ground", "football field", "football pitch", "green house",
    "greenhouse", "abandoned quarry", "quarry", "farm", "farmhouse",
    "farm houses", "warehouse", "warehouses", "factory", "industrial area",
    "industrial", "power plant", "substation", "airport", "airstrip",
    "airfield", "camel farm", "palm farm", "date farm", "garden", "nursery",
    "plantation", "storage", "yard", "depot", "workshop", "site", "plot",
    "compound", "camp", "labour camp", "gsm", "zariba", "shed", "sheds",
    "water tank", "unnamed", "no name", "n/a", "tbd", "test",
    "solar", "solar farm", "solar plant", "solar park", "photovoltaic",
    "abandoned fields", "fields", "field", "date plantation", "oasis",
    "falaj", "animlas", "animals", "mnazl almzr'ah", "orchard", "palm grove",
    "port", "harbour", "harbor", "terminal", "free zone", "logistics",
}

# Tagged industrial but plainly something else. OSM industrial landuse often
# swallows the POIs inside it, and a school is not a receptor for blowing sand
# in the sense this module prices.
NOT_A_RECEPTOR_RE = re.compile(
    r"\b(school|academy|university|college|mosque|masjid|church|hospital|clinic|"
    r"hotel|resort|residence|residential|villa|apartment|staff|accommodation|"
    r"labour camp|workers? cent(er|re))\b", re.I)

# Names that are a bare number describe a parcel, not an asset.
NUMERIC_NAME_RE = re.compile(r"^[\d\s.,/-]+$")

# A lifecycle word in the name itself, which OSM often carries instead of a
# lifecycle tag prefix.
NAME_LIFECYCLE_RE = re.compile(r"^(abandoned|disused|former|old ruins?|ruined|demolished)\b", re.I)

# Hand-checked English names for assets OSM carries only in Arabic. These are
# translations of well-known place names, each verifiable against the operator
# or the airport code, not transliterations. Transliteration of unvowelled
# Arabic gives strings like "Mtar Abw Zby Aldwly", which is not a usable label.
# Keyed on the exact OSM name string so the mapping is inspectable.
NAME_OVERRIDES = {
    "مطار ابو ظبي الدولي": "Abu Dhabi International Airport",
    "مطار شبيطة": "Shubaytah Airstrip",
    "المنطقة الحرة الفجيرة": "Fujairah Free Zone",
    "المنطقة الصناعية بالحمرا": "Al Hamra Industrial Area",
    "القصيص الصناعية 5": "Al Qusais Industrial Area 5",
    "نیروگاه برق": None,   # Persian for "power plant", a generic label. Drop it.
}

# The Mohammed bin Rashid park is mapped as a parent relation carrying the full
# 2427 MW plus a child way per phase. Keeping both counts the same panels twice,
# and a site named "Phase 5 - Field A" means nothing on its own, so the children
# are collapsed into the parent the way the previous build did.
PHASE_CHILD_RE = re.compile(r"^phase\s*\d", re.I)

# OSM lifecycle prefixes. A disused plant is not a receptor.
LIFECYCLE_BAD = ("disused:", "abandoned:", "construction:", "proposed:", "razed:", "demolished:")

# Deterministic Arabic to Latin, used only when OSM carries no English name.
# This is transliteration, not translation: it never invents a meaning.
ARABIC_MAP = {
    "ا": "a", "أ": "a", "إ": "i", "آ": "aa", "ء": "'",
    "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h",
    "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z",
    "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t",
    "ظ": "z", "ع": "'", "غ": "gh", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h",
    "و": "w", "ي": "y", "ى": "a", "ة": "ah", "ـ": "",
    "پ": "p", "چ": "ch", "ژ": "zh", "ک": "k", "گ": "g",
    "ی": "y", "‌": " ",
}
ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿ]")


def has_arabic(text):
    return bool(ARABIC_RE.search(text or ""))


def is_latin(text):
    """OSM carries a handful of names in scripts other than Arabic (one Cyrillic
    heliport). A label the reader cannot type or search is not usable here."""
    return all(ord(ch) < 0x0250 or ch.isspace() for ch in text)


def transliterate(text):
    out = []
    for ch in text:
        if ch in ARABIC_MAP:
            out.append(ARABIC_MAP[ch])
        elif "ً" <= ch <= "ْ":   # diacritics carry no letter
            continue
        else:
            out.append(ch)
    words = "".join(out).split()
    return " ".join(w.capitalize() for w in words if w)


def overpass(body, attempt_sleep=8):
    """POST to Overpass, walking the mirrors. Overpass answers a timeout with a
    200 and an HTML error page, so the JSON parse is part of the check."""
    query = f'[out:json][timeout:180];area["ISO3166-1"="AE"][admin_level=2]->.ae;({body});out center tags;'
    last = None
    for attempt in range(3):
        for url in ENDPOINTS:
            try:
                req = urllib.request.Request(
                    url, data=query.encode("utf-8"),
                    headers={"User-Agent": "nyuad-igem-2026/exposure (target site build)"},
                )
                with urllib.request.urlopen(req, timeout=300) as fh:
                    raw = fh.read().decode("utf-8")
                return json.loads(raw)["elements"]
            except (urllib.error.URLError, ValueError, KeyError, TimeoutError) as exc:
                last = f"{url}: {exc}"
                print(f"    retry, {last}", file=sys.stderr)
                time.sleep(attempt_sleep * (attempt + 1))
    raise RuntimeError(f"Overpass failed on every mirror. Last error: {last}")


def point_in_ring(lon, lat, ring):
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        if (y1 > lat) != (y2 > lat):
            xint = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
            if lon < xint:
                inside = not inside
    return inside


def point_in_multipolygon(lon, lat, geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poly in polys:
        if not poly:
            continue
        if point_in_ring(lon, lat, poly[0]):
            if not any(point_in_ring(lon, lat, hole) for hole in poly[1:]):
                return True
    return False


def load_uae_polygon():
    fc = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    for feat in fc["features"]:
        if feat["properties"].get("iso") == "ARE":
            return feat["geometry"]
    raise RuntimeError("No ARE feature in gulf_boundaries.geojson. Run fetch_boundaries.py first.")


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_ginoux_vertices():
    """Every polygon vertex with its source type and FoO band. The module quotes
    the nearest of these as regional context only, never as the origin of the
    saltating sand at the asset, and the caveat below says so."""
    fc = json.loads(GINOUX.read_text(encoding="utf-8"))
    verts = []
    for feat in fc["features"]:
        props = feat["properties"]
        rings = feat["geometry"]["coordinates"]
        if feat["geometry"]["type"] == "Polygon":
            rings = [rings]
        for poly in rings:
            for ring in poly if isinstance(poly[0][0], list) else [poly]:
                for lon, lat in ring:
                    verts.append((lat, lon, props.get("source_type"), props.get("foo_threshold")))
    return verts


def nearest_source(lat, lon, verts):
    best = None
    for vlat, vlon, stype, foo in verts:
        # Cheap planar reject before the trigonometry. 6 degrees is far wider
        # than any nearest neighbour turns out to be.
        if abs(vlat - lat) > 6 or abs(vlon - lon) > 6:
            continue
        d = haversine_km(lat, lon, vlat, vlon)
        if best is None or d < best[0]:
            best = (d, vlat, vlon, stype, foo)
    return best


def resolve_name(tags):
    """English if OSM has it, a hand-checked override next, transliteration
    last. Returns (name, nameLocal, source) so the provenance of each name is
    recoverable, and (None, ...) means drop the entry."""
    raw_name = (tags.get("name") or "").strip()
    if raw_name in NAME_OVERRIDES:
        override = NAME_OVERRIDES[raw_name]
        return override, raw_name, ("override" if override else None)
    for key in ("name:en", "int_name", "official_name:en"):
        val = (tags.get(key) or "").strip()
        if val and not has_arabic(val):
            return val, (tags.get("name") or "").strip() or None, key
    raw = (tags.get("name") or "").strip()
    if raw and not has_arabic(raw):
        return raw, None, "name"
    if raw:
        return transliterate(raw), raw, "transliterated"
    return None, None, None


def load_emirates():
    """Seven emirate polygons, cached to public/data so the build is repeatable
    offline. Natural Earth 1:10m admin 1, public domain.

    This replaces a latitude-band guess used in an earlier draft, which put
    Dubai International Airport in Sharjah. Nothing numeric depends on the
    emirate, it only groups the site picker, but a wrong label in a dropdown is
    still a wrong label."""
    if not EMIRATES.exists():
        with urllib.request.urlopen(NE_ADMIN1, timeout=180) as fh:
            fc = json.loads(fh.read().decode("utf-8"))
        feats = []
        for feat in fc["features"]:
            props = feat["properties"]
            if props.get("adm0_a3") != "ARE":
                continue
            # Natural Earth carries two neutral-zone polygons alongside the
            # seven emirates. Sayh Mudayrah is shared territory, not an emirate,
            # so sites there fall through to the nearest-emirate fallback.
            if props.get("name") == "Neutral Zone":
                continue
            name = (props.get("name_en") or props.get("name") or "").replace("Emirate of ", "")
            if not name:
                continue
            feats.append({
                "type": "Feature",
                "properties": {"name": name},
                "geometry": feat["geometry"],
            })
        EMIRATES.write_text(json.dumps(
            {"type": "FeatureCollection",
             "source": "Natural Earth 1:10m admin 1 states and provinces, public domain",
             "features": feats}, ensure_ascii=False), encoding="utf-8")
    fc = json.loads(EMIRATES.read_text(encoding="utf-8"))
    return [(f["properties"]["name"], f["geometry"]) for f in fc["features"]]


def emirate_of(lat, lon, emirates):
    for name, geom in emirates:
        if point_in_multipolygon(lon, lat, geom):
            return name
    # Offshore islands and reclaimed land sit outside the 1:10m outlines. Fall
    # back to the nearest emirate centroid rather than dropping the site.
    best = None
    for name, geom in emirates:
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            for vlon, vlat in poly[0]:
                d = (vlat - lat) ** 2 + (vlon - lon) ** 2
                if best is None or d < best[0]:
                    best = (d, name)
    return best[1] if best else "Abu Dhabi"


def capacity_mw(tags):
    raw = (tags.get("plant:output:electricity") or tags.get("generator:output:electricity") or "").strip()
    if not raw:
        return None
    m = re.match(r"^([\d.]+)\s*(k|M|G)?W", raw, re.IGNORECASE)
    if not m:
        return None
    val = float(m.group(1))
    scale = {"k": 1e-3, "m": 1.0, "g": 1e3, None: 1e-6}[(m.group(2) or "").lower() or None]
    return round(val * scale, 3)


def collapse_same_asset(sites, rejected):
    """One asset is often mapped twice, as a node for the label and a way or
    relation for the outline. Al Ain International Airport came through as two
    rows. Same name, same market, within 5 km: keep the one that carries more
    information, preferring a relation or way over a node and a stated capacity
    over none."""
    def rank(s):
        kind = s["id"].split("/")[0]
        return ({"relation": 2, "way": 1, "node": 0}[kind], 1 if s.get("capacityMw") else 0)

    kept = []
    for site in sorted(sites, key=rank, reverse=True):
        key = site["name"].strip().lower()
        clash = next(
            (k for k in kept
             if k["name"].strip().lower() == key
             and k["market"] == site["market"]
             and haversine_km(k["lat"], k["lon"], site["lat"], site["lon"]) < 5.0),
            None,
        )
        if clash:
            rejected["same_asset"] += 1
            continue
        kept.append(site)
    return kept


def disambiguate_names(sites):
    """After the same-asset collapse, a repeated name means genuinely different
    facilities. ADNOC maps several plants under the bare operator name, and they
    are tens of kilometres apart, so they are not duplicates. Give each one a
    label a reader can tell apart rather than dropping either."""
    from collections import defaultdict
    groups = defaultdict(list)
    for s in sites:
        groups[(s["name"].strip().lower(), s["market"])].append(s)
    for group in groups.values():
        if len(group) < 2:
            continue
        by_emirate = defaultdict(list)
        for s in group:
            by_emirate[s["emirate"]].append(s)
        for emirate, members in by_emirate.items():
            for i, s in enumerate(members, 1):
                suffix = f" ({emirate})" if len(by_emirate) > 1 else ""
                if len(members) > 1:
                    # Still ambiguous inside one emirate, so fall back to the
                    # coordinate, which at least tells two plants apart on a map.
                    suffix += f" [{s['lat']:.2f}N {s['lon']:.2f}E]"
                s["name"] = s["name"] + suffix
                s["nameDisambiguated"] = True
    return sites


def main():
    uae = load_uae_polygon()
    emirates = load_emirates()
    verts = load_ginoux_vertices()
    print(f"UAE polygon loaded, {len(verts)} Ginoux vertices")

    rejected = {"outside_uae": 0, "generic_name": 0, "no_name": 0, "lifecycle": 0,
                "duplicate": 0, "phase_child": 0, "non_latin_name": 0,
                "not_a_receptor": 0, "same_asset": 0}
    sites = []
    seen = set()

    for market, spec in MARKETS.items():
        print(f"  {market} ...")
        elements = overpass(spec["query"])
        print(f"    {len(elements)} raw elements")
        for el in elements:
            tags = el.get("tags") or {}
            if any(k.startswith(LIFECYCLE_BAD) for k in tags):
                rejected["lifecycle"] += 1
                continue
            centre = el.get("center") or el
            lat, lon = centre.get("lat"), centre.get("lon")
            if lat is None or lon is None:
                continue
            if not point_in_multipolygon(lon, lat, uae):
                rejected["outside_uae"] += 1
                continue
            name, local, name_src = resolve_name(tags)
            if not name:
                rejected["no_name"] += 1
                continue
            if name.strip().lower() in GENERIC_NAMES:
                rejected["generic_name"] += 1
                continue
            if NUMERIC_NAME_RE.match(name) or NAME_LIFECYCLE_RE.match(name):
                rejected["generic_name"] += 1
                continue
            if not is_latin(name):
                rejected["non_latin_name"] += 1
                continue
            if market == "industrial" and NOT_A_RECEPTOR_RE.search(name):
                rejected["not_a_receptor"] += 1
                continue
            if market == "solar" and PHASE_CHILD_RE.match(name):
                rejected["phase_child"] += 1
                continue
            key = f"{el['type']}/{el['id']}"
            if key in seen:
                rejected["duplicate"] += 1
                continue
            seen.add(key)

            near = nearest_source(lat, lon, verts)
            site = {
                "id": key,
                "name": name,
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "market": market,
                "emirate": emirate_of(lat, lon, emirates),
                "nameSource": name_src,
            }
            if local and local != name:
                site["nameLocal"] = local
            mw = capacity_mw(tags)
            if mw:
                site["capacityMw"] = mw
            if near:
                site.update({
                    "nearestSourceKm": round(near[0], 2),
                    "nearestSourceType": near[3],
                    "nearestSourceFoo": near[4],
                    "nearestSourceLat": round(near[1], 4),
                    "nearestSourceLon": round(near[2], 4),
                })
            sites.append(site)

    sites = collapse_same_asset(sites, rejected)
    sites = disambiguate_names(sites)
    sites.sort(key=lambda s: (s["market"], s["emirate"], s["name"]))

    # -- Checks. The script writes nothing unless all of these pass. ----------
    problems = []
    if any(has_arabic(s["name"]) for s in sites):
        problems.append("a resolved name still contains Arabic script")
    if any(not point_in_multipolygon(s["lon"], s["lat"], uae) for s in sites):
        problems.append("a site is outside the UAE polygon")
    if any(s["name"].strip().lower() in GENERIC_NAMES for s in sites):
        problems.append("a generic name survived the reject list")
    names = [(s["name"].strip().lower(), s["market"]) for s in sites]
    if len(names) != len(set(names)):
        problems.append("the same name appears twice in one market, dedupe failed")
    if any(NUMERIC_NAME_RE.match(s["name"]) or NAME_LIFECYCLE_RE.match(s["name"]) for s in sites):
        problems.append("a numeric or lifecycle name survived the reject list")
    if sum(1 for s in sites if s["market"] == "solar" and PHASE_CHILD_RE.match(s["name"])):
        problems.append("an MBR phase child survived, capacity would be double counted")
    EMIRATE_NAMES = {"Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain",
                     "Ras Al Khaimah", "Fujairah"}
    stray = {s["emirate"] for s in sites} - EMIRATE_NAMES
    if stray:
        problems.append(f"sites assigned to something that is not an emirate: {sorted(stray)}")
    if not (300 <= len(sites) <= 900):
        problems.append(f"count {len(sites)} outside the plausible 300 to 900 range, filters are wrong")
    solar = [s for s in sites if s["market"] == "solar"]
    if not any("Mohammed bin Rashid" in s["name"] for s in solar):
        problems.append("the MBR solar park is missing, the query lost the largest asset in the country")
    if problems:
        for p in problems:
            print(f"  FAIL {p}", file=sys.stderr)
        raise SystemExit("Refusing to write. Fix the filters, do not relax the checks.")

    payload = {
        "provenance": {
            "source": "OpenStreetMap via Overpass API",
            "built": time.strftime("%Y-%m-%d"),
            "licence": "ODbL 1.0. Attribution required. Share-alike applies to derived databases.",
            "queries": {k: " ".join(v["query"].split()) for k, v in MARKETS.items()},
            "filters": (
                "Queried by UAE admin area, then filtered again by point-in-polygon against the "
                "ARE outline in gulf_boundaries.geojson. Generic-noun names and disused, abandoned "
                "and under-construction lifecycle tags dropped. No distance thinning: every site "
                "that passes is kept, because the model runs per site."
            ),
            "naming": (
                "English name from name:en, int_name or official_name:en where OSM carries one. "
                "Otherwise a deterministic transliteration of the Arabic name, with the original "
                "kept in nameLocal. nameSource records which route each name took."
            ),
            "rejected": rejected,
            "nearestSource": "great-circle km and coordinates of the nearest Ginoux 2012 MAM polygon vertex",
            "caveat": (
                "Ginoux's grid is 0.1 deg, about 11 km, while saltating sand lands within tens of "
                "metres. nearestSourceKm is REGIONAL CONTEXT for the suspension and drift pathways "
                "only. It is not the source of saltating sand at the asset. See "
                "DUST_EXPOSURE_MODULE_SPEC.md section 2."
            ),
        },
        "markets": [{"id": k, "label": v["label"], "note": v["note"]} for k, v in MARKETS.items()],
        "sites": sites,
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")

    print(f"\nwrote {OUT.relative_to(REPO)}: {len(sites)} sites")
    for market in MARKETS:
        n = sum(1 for s in sites if s["market"] == market)
        print(f"  {market:<12} {n}")
    print(f"  rejected: {rejected}")
    translit = sum(1 for s in sites if s.get("nameSource") == "transliterated")
    print(f"  transliterated names: {translit}")


if __name__ == "__main__":
    main()
