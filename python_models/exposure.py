"""
Where the sand comes from, and what reaches a site
==================================================
Reproduces the two figures on the /exposure page of the Dunelock toolkit, and
the findings behind them.

What the model does, in one paragraph. Wind lifts loose material off the ground
at a sand hotspot. Only the fine part of it stays in the air long enough to
travel, and how much fine material comes off depends mostly on how much clay is
in the ground: clay-rich flood plain gives off far more dust than clean dune
sand does. That dust spreads sideways as it goes and settles the whole way, so a
site a long way downwind gets a thin share of what left. Our treatment raises
the wind speed the ground can take before it starts moving at all, so running
the same chain twice, once for bare ground and once for treated ground, gives
the difference the product makes.

Two things worth knowing before reading any number out of this.

  1. Sand does not move below a threshold wind, and above it the amount climbs
     as roughly the cube of the wind. So a month that is calm for 28 days and
     fierce for 2 moves nearly all of its sand on those 2 days. Putting the
     month's AVERAGE wind into the equation gives an answer that is wrong by a
     large factor. Figure 1 is that correction, and it is the reason the whole
     model integrates over a fitted wind distribution instead.
  2. The amounts here are a floor. The wind record averages each hour over a
     grid cell about 100 km across, so it misses gusts, and the share of each
     hotspot that is loose enough to blow away is our own assumption. Read the
     split between hotspots and the size of the difference, not the kilograms.

Port of:
  src/lib/physics/hotspotTransport.ts   hotspot to site, the mass chain
  src/lib/physics/windStats.ts          the wind-integrated sand flux
  src/lib/physics/aeolian.ts            the bare and treated thresholds
  src/lib/physics/dustTransport.ts      settling velocity, sandblasting

Sources
-------
Sandblasting efficiency vs clay : Chappell et al. (2024), GRL, 10.1029/2023GL106540, Eq 3
Settling velocity               : Ferguson & Church (2004), J Sediment Res 74, 933
Grain size                      : Benaafi et al. (2016), Arab J Geosci, Table 1
Mapped hotspots                 : Ginoux et al. (2012), Rev Geophys 50, RG3005
Wind                            : ERA5 2022-2024 via the Open-Meteo archive
Target sites                    : OpenStreetMap contributors, ODbL

Run:  python exposure.py

The first run downloads four data files (about 900 kB) from the public repo and
caches them in ./data next to this script. Nothing else is needed.
"""

import json
import math
import pathlib
import urllib.request

import numpy as np
import matplotlib.pyplot as plt

ORANGE, TEAL, ROSE, MAROON, ASH = "#D6884A", "#8FB3AC", "#C28A7C", "#6E1E18", "#8A7E75"
plt.rcParams.update({
    "figure.figsize": (7.2, 4.3), "font.size": 11, "figure.dpi": 130,
    "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": ASH,
    "axes.grid": True, "grid.color": "#E7D8C4", "grid.linewidth": 0.8,
    "axes.titleweight": "bold", "figure.facecolor": "#FBF7F0", "axes.facecolor": "#FBF7F0",
})

# ---------------------------------------------------------------------------
# constants.ts: PHYS and AEOLIAN_CALIB. USTAR_RATIO belongs to a 10 m wind,
# which is what ERA5 reports. A 2 m or 50 m wind source would silently break it.
# ---------------------------------------------------------------------------
RHO_AIR, RHO_SAND, G = 1.225, 2650.0, 9.80665
MU_AIR = 1.81e-5                        # dynamic viscosity of air [Pa s]
NU_AIR = MU_AIR / RHO_AIR               # kinematic, as dustTransport.ts derives it
A_THR, SALT_C, USTAR_RATIO = 0.11, 1.8, 0.03

# hotspotTransport.ts
PLUME_SECTOR_RAD = math.radians(22.5)   # the plume spreads over one wind sector
TRAVELLING_GRAIN_M = 10e-6              # the coarse end of what stays airborne
MIXING_HEIGHT_M = 1000.0                # depth of air the plume mixes through
MIN_KM = 15.0                           # closer than this it is hopping, not a plume
ERODIBLE_FRACTION = 0.05                # assumed, and it scales every mass here
SITE_AREA_M2 = 1e6                      # ground the site counts as its own
ROSE_SECTORS = 16

# Clay per substrate class, anchored on Benaafi's petrography rather than on
# SoilGrids, which reads about 20% over UAE dune fields where the rock says 2.
# Eq 3 is exponential in clay, so that difference is a factor of ~250 and it
# decides the whole ranking.
SUBSTRATE_CLAY_PERCENT = {"hydro": 20.0, "anthro": 10.0, "natural": 2.0}

SEASONS = {
    "Dec to Feb": [12, 1, 2],
    "Mar to May": [3, 4, 5],
    "Jun to Aug": [6, 7, 8],
    "Sep to Nov": [9, 10, 11],
}
MONTH_DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

REGIONS = [
    ("Tigris and Euphrates flood plain", 29.5, 34.0, 44.0, 48.5),
    ("Lower Mesopotamia and Kuwait", 28.0, 30.5, 45.5, 49.0),
    ("Iranian Zagros foreland", 28.0, 33.0, 48.0, 54.0),
    ("Eastern Province sand sheets", 24.0, 28.5, 46.0, 51.5),
    ("Gulf coastal sabkha", 23.5, 27.0, 50.0, 53.5),
    ("Rub al Khali", 17.5, 23.5, 45.0, 55.5),
    ("Al Dhafra and the western UAE", 22.5, 25.0, 51.5, 54.5),
    ("Eastern UAE and northern Oman", 22.5, 26.5, 54.5, 58.0),
    ("Southern Iran coast", 25.5, 29.0, 54.0, 60.0),
]

RAW = ("https://raw.githubusercontent.com/Faheem107/"
       "iGEM-Modeling-Tool-Kit/main/public/data/")
FILES = [
    "era5_wind_climatology.json",
    "ginoux_middle_east_mam.geojson",
    "uae_target_sites.json",
    "uae_parameters.json",
]


# ---------------------------------------------------------------------------
# data
# ---------------------------------------------------------------------------
def load_data():
    """Read the four files from ./data, ../public/data, or the public repo."""
    here = pathlib.Path(__file__).resolve().parent
    for folder in (here / "data", here.parent / "public" / "data"):
        if all((folder / f).exists() for f in FILES):
            return {f: json.loads((folder / f).read_text()) for f in FILES}

    cache = here / "data"
    cache.mkdir(exist_ok=True)
    out = {}
    for f in FILES:
        target = cache / f
        if not target.exists():
            print(f"downloading {f}")
            urllib.request.urlretrieve(RAW + f, target)
        out[f] = json.loads(target.read_text())
    return out


# ---------------------------------------------------------------------------
# physics
# ---------------------------------------------------------------------------
def threshold(grain_d_m, cohesion=0.0):
    """Eqs 7 and 8: the wind stress at which grains start to move [m/s]."""
    buoyancy = (RHO_SAND - RHO_AIR) / RHO_AIR * G * grain_d_m
    extra = cohesion / (RHO_AIR * grain_d_m) if cohesion else 0.0
    return A_THR * math.sqrt(max(0.0, buoyancy + extra))


def upper_incomplete_gamma(s, x, terms=600):
    if x <= 0:
        return math.gamma(s)
    if x > 60:
        # Past here the series underflows and the honest answer is zero, which is
        # what windStats.ts and wind_stats.py return. Without this the script
        # invents a sliver of transport in the regime the validation says to
        # distrust most.
        return 0.0
    total, term = 0.0, 1.0 / s
    for n in range(1, terms):
        total += term
        term *= x / (s + n)
        if abs(term) < 1e-17 * abs(total):
            break
    lower = math.exp(-x + s * math.log(x)) * total
    return math.gamma(s) - lower


def mean_saltation_flux(A, k, u_threshold):
    """Average sand flux over a whole Weibull wind distribution [kg/m/s].

    Exact, not an approximation. This is the integral figure 1 is about: the
    flux of the average wind is not the average of the flux.
    """
    if A <= 0 or k <= 0:
        return 0.0
    ut = max(u_threshold, 0.0)
    x = (ut / A) ** k
    val = (A ** 3 * upper_incomplete_gamma(1 + 3 / k, x)
           - ut * ut * A * upper_incomplete_gamma(1 + 1 / k, x))
    return max(0.0, SALT_C * (RHO_AIR / G) * USTAR_RATIO ** 3 * val)


def flux_at_wind(u, u_threshold):
    """Bagnold flux at ONE steady wind speed [kg/m/s].

    This is the function you must not hand an average wind, which is what
    figure 1 is about. It is the integrand the closed form above integrates.
    """
    us, ust = u * USTAR_RATIO, u_threshold * USTAR_RATIO
    if us <= ust:
        return 0.0
    return SALT_C * (RHO_AIR / G) * us ** 3 * (1 - (ust / us) ** 2)


def weibull_pdf(u, A, k):
    return (k / A) * (u / A) ** (k - 1) * np.exp(-((u / A) ** k))


def weibull_mean(A, k):
    return A * math.gamma(1 + 1 / k)


def settling_velocity(d):
    """Ferguson & Church (2004), across the Stokes and turbulent regimes."""
    R = (RHO_SAND - RHO_AIR) / RHO_AIR
    return (R * G * d * d) / (18 * NU_AIR + math.sqrt(0.75 * R * G * d ** 3))


def sandblasting_alpha(clay_percent):
    """Chappell Eq 3: how much fine dust hopping grains knock loose [1/m]."""
    return 10 ** (0.134 * min(max(clay_percent, 0.0), 20.0) - 6.0)


def deposition_length_m(wind_ms):
    """How far the plume carries before the fine material has settled out."""
    return max(wind_ms, 0.5) * MIXING_HEIGHT_M / settling_velocity(TRAVELLING_GRAIN_M)


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing_deg(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


# ---------------------------------------------------------------------------
# the chain
# ---------------------------------------------------------------------------
def region_of(lat, lon):
    for name, la, lb, lo, hi in REGIONS:
        if la <= lat <= lb and lo <= lon <= hi:
            return name
    return None


def build_hotspots(geojson):
    """Every mapped hotspot polygon, with a centre, an area and a name."""
    out = []
    for f in geojson["features"]:
        ring = f["geometry"]["coordinates"][0]
        if len(ring) < 3:
            continue
        lon = sum(p[0] for p in ring) / len(ring)
        lat = sum(p[1] for p in ring) / len(ring)
        name = region_of(lat, lon)
        if not name:
            continue
        cross = 0.0
        for i in range(len(ring)):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % len(ring)]
            cross += x1 * y2 - x2 * y1
        m_per_deg = 111_320.0
        area = abs(cross / 2) * m_per_deg * (m_per_deg * math.cos(math.radians(lat)))
        out.append({
            "region": name,
            "substrate": f["properties"]["source_type"],
            "lat": lat, "lon": lon, "area_m2": area,
            "foo": f["properties"]["foo_threshold"],
        })
    return out


class Wind:
    """The fitted wind, and the sand flux it drives, for one season."""

    def __init__(self, clim, months):
        self.clim, self.months = clim, months
        self._cell, self._flux = {}, {}

    def nearest_key(self, lat, lon):
        key = (round(lat, 2), round(lon, 2))
        if key not in self._cell:
            best, bd = None, 1e18
            for j, y in enumerate(self.clim["lat"]):
                for i, x in enumerate(self.clim["lon"]):
                    k = f"{i},{j}"
                    if k not in self.clim["cells"]:
                        continue
                    d = (x - lon) ** 2 + (y - lat) ** 2
                    if d < bd:
                        bd, best = d, k
            self._cell[key] = best
        return self._cell[key]

    def flux(self, lat, lon, u_threshold):
        """Integrate each month on its own fit, then average the fluxes.

        Averaging A and k first and integrating once is the same mistake as
        figure 1, one level up: it smears a windy month into two calm ones
        before the cubing that matters.
        """
        k = (self.nearest_key(lat, lon), round(u_threshold, 4))
        if k not in self._flux:
            cell = self.clim["cells"][k[0]]
            vals = [mean_saltation_flux(cell["months"][str(m)]["A"],
                                        cell["months"][str(m)]["k"], u_threshold)
                    for m in self.months if str(m) in cell["months"]]
            self._flux[k] = sum(vals) / len(vals) if vals else 0.0
        return self._flux[k]

    def speed(self, lat, lon):
        cell = self.clim["cells"][self.nearest_key(lat, lon)]
        vals = [cell["months"][str(m)]["A"] for m in self.months if str(m) in cell["months"]]
        return sum(vals) / len(vals) if vals else 0.0

    def run_per_sector(self, lat, lon):
        """Wind run, how often times how hard, per compass sector."""
        cell = self.clim["cells"][self.nearest_key(lat, lon)]
        rose = cell.get("rose")
        if not rose:
            return None
        run = [0.0] * ROSE_SECTORS
        for m in self.months:
            r = rose.get(str(m))
            if not r:
                continue
            for i in range(ROSE_SECTORS):
                run[i] += r[0][i] * r[1][i]
        return run if sum(run) > 0 else None


def direction_share(run, bearing_from_site):
    """Share of the season's wind that carries material along one bearing."""
    if not run:
        return 1.0 / ROSE_SECTORS
    width = 360.0 / ROSE_SECTORS
    i = int(round(bearing_from_site / width)) % ROSE_SECTORS
    total = sum(run) or 1.0
    return (run[i] + 0.5 * run[i - 1] + 0.5 * run[(i + 1) % ROSE_SECTORS]) / (2 * total)


def transport_to_site(hotspots, site, wind, season_seconds,
                      cohesion=0.002, treated_area_m2=1e9, grain_d_m=None):
    """Run the whole chain for one site. Returns the shares and the masses."""
    ut_bare = threshold(grain_d_m) / USTAR_RATIO
    ut_treated = threshold(grain_d_m, cohesion) / USTAR_RATIO
    L = deposition_length_m(wind.speed(site["lat"], site["lon"]))
    run = wind.run_per_sector(site["lat"], site["lon"])

    rows = []
    for h in hotspots:
        km = haversine_km(site["lat"], site["lon"], h["lat"], h["lon"])
        if km < MIN_KM:
            continue
        from_site = bearing_deg(site["lat"], site["lon"], h["lat"], h["lon"])
        d = km * 1000.0
        landing = (direction_share(run, from_site) * SITE_AREA_M2
                   * math.exp(-d / L) / (L * PLUME_SECTOR_RAD * d))
        if landing <= 0:
            continue
        base = (sandblasting_alpha(SUBSTRATE_CLAY_PERCENT[h["substrate"]])
                * (h["foo"] / 100.0) * ERODIBLE_FRACTION * season_seconds * h["area_m2"])
        bare = base * wind.flux(h["lat"], h["lon"], ut_bare)
        treated = base * wind.flux(h["lat"], h["lon"], ut_treated)
        rows.append({"h": h, "km": km, "landing": landing,
                     "bare": bare, "treated": treated,
                     "landed": bare * landing})

    # Spend the treatment on whatever delivers most to this site.
    rows.sort(key=lambda r: -r["landed"])
    budget = treated_area_m2
    for r in rows:
        covered = min(budget, r["h"]["area_m2"])
        r["treated_share"] = covered / r["h"]["area_m2"] if r["h"]["area_m2"] else 0.0
        budget -= covered
        if budget <= 0:
            break
    for r in rows:
        r.setdefault("treated_share", 0.0)

    shares, dist_sum = {}, {}
    landed, landed_treated, emitted, area = 0.0, 0.0, 0.0, 0.0
    for r in rows:
        t = r["treated_share"]
        emitted_now = r["bare"] * (1 - t) + r["treated"] * t
        landed += r["landed"]
        landed_treated += emitted_now * r["landing"]
        emitted += r["bare"]
        area += r["h"]["area_m2"]
        region = r["h"]["region"]
        shares[region] = shares.get(region, 0.0) + r["landed"]
        # Weight distance by what actually arrives, not by polygon count: a region
        # is "544 km away" in the sense that most of what it sends came from there.
        dist_sum[region] = dist_sum.get(region, 0.0) + r["km"] * r["landed"]

    return {
        "shares": sorted(((k, v / landed * 100) for k, v in shares.items()),
                         key=lambda kv: -kv[1]) if landed > 0 else [],
        "distance_km": {k: dist_sum[k] / v for k, v in shares.items() if v > 0},
        "landed_kg": landed,
        "landed_treated_kg": landed_treated,
        "difference_pct": (1 - landed_treated / landed) * 100 if landed > 0 else 0.0,
        "landing_fraction": landed / emitted if emitted > 0 else 0.0,
        "hotspot_area_km2": area / 1e6,
        "reach_km": L / 1000.0,
        "ut_bare": ut_bare,
        "ut_treated": ut_treated,
    }


# ---------------------------------------------------------------------------
# figures
# ---------------------------------------------------------------------------
def figures():
    data = load_data()
    clim = data["era5_wind_climatology.json"]
    grain_d = data["uae_parameters.json"]["grain_size"]["Rub' Al-Khali"]["d_m"]
    hotspots = build_hotspots(data["ginoux_middle_east_mam.geojson"])
    sites = data["uae_target_sites.json"]["sites"]

    site = next(s for s in sites if s["name"].startswith("Al-Dhafra"))
    months = SEASONS["Mar to May"]
    season_seconds = sum(MONTH_DAYS[m - 1] for m in months) * 86400
    wind = Wind(clim, months)
    figs = []

    # --- 1. why we integrate over the wind instead of using its average ------
    ut = threshold(grain_d) / USTAR_RATIO
    cell = clim["cells"][wind.nearest_key(site["lat"], site["lon"])]
    A = sum(cell["months"][str(m)]["A"] for m in months) / len(months)
    k = sum(cell["months"][str(m)]["k"] for m in months) / len(months)

    u = np.linspace(0.01, 24, 700)
    pdf = weibull_pdf(u, A, k)
    contribution = pdf * np.array([flux_at_wind(x, ut) for x in u])
    u_mean = weibull_mean(A, k)
    q_naive = flux_at_wind(u_mean, ut)
    q_true = mean_saltation_flux(A, k, ut)

    fig1, ax1 = plt.subplots()
    ax1.fill_between(u, pdf / pdf.max(), color=TEAL, alpha=0.35,
                     label="how often the wind blows this hard")
    if contribution.max() > 0:
        ax1.fill_between(u, contribution / contribution.max(), color=ORANGE, alpha=0.55,
                         label="when the sand actually moves")
    ax1.axvline(u_mean, color=MAROON, ls="--", lw=1.6)
    ax1.axvline(ut, color=ASH, ls=":", lw=1.6)
    ax1.annotate(f"average wind\n{u_mean:.1f} m/s", (u_mean, 0.92), color=MAROON,
                 ha="right", fontsize=9, xytext=(-8, 0), textcoords="offset points")
    ax1.annotate(f"sand starts moving\n{ut:.1f} m/s", (ut, 0.55), color=ASH,
                 ha="left", fontsize=9, xytext=(6, 0), textcoords="offset points")
    ax1.set_xlabel("wind speed 10 m above the ground [m/s]")
    ax1.set_ylabel("each curve scaled to its own peak", fontsize=9)
    ax1.set_yticks([])
    ax1.set_title("Sand movement pattern")
    ax1.legend(frameon=False, fontsize=9, loc="upper right")
    verdict = ("Using the average wind would say no sand moves at all"
               if q_naive <= 0 else
               f"Using the average wind understates it {q_true / q_naive:.0f} times over")
    ax1.text(0, -0.22, f"Al Dhafra, March to May. {verdict}.",
             transform=ax1.transAxes, fontsize=9.5, va="top", color=MAROON)
    fig1.tight_layout()
    figs.append((fig1, "exposure-1.png"))

    # --- 2. where it comes from, and how much treating it helps --------------
    result = transport_to_site(hotspots, site, wind, season_seconds,
                               treated_area_m2=1e15, grain_d_m=grain_d)

    fig2, (ax2, ax3) = plt.subplots(1, 2, figsize=(11.4, 4.6))

    top = result["shares"][:6][::-1]
    # Name the distance on the axis: the share alone does not say how far off it starts.
    names = [f"{n.replace(' and ', ' &' + chr(10))}\n{result['distance_km'][n]:.0f} km away"
             for n, _ in top]
    ax2.barh(range(len(top)), [v for _, v in top], color=ORANGE, height=0.62)
    ax2.set_yticks(range(len(top)))
    ax2.set_yticklabels(names, fontsize=8)
    ax2.set_xlabel("share of the sand landing at Al Dhafra, March to May [%]")
    ax2.set_title("Where the sand comes from")
    ax2.grid(axis="y", visible=False)
    for i, (_, v) in enumerate(top):
        ax2.text(v + 0.8, i, f"{v:.0f}%", va="center", fontsize=9, color=MAROON)
    ax2.set_xlim(0, max(v for _, v in top) * 1.18)

    areas = np.logspace(0, 5.2, 26)
    cuts = [transport_to_site(hotspots, site, wind, season_seconds,
                              treated_area_m2=a * 1e6,
                              grain_d_m=grain_d)["difference_pct"] for a in areas]
    ax3.plot(areas, cuts, color=TEAL, lw=2.4)
    ax3.set_xscale("log")
    ax3.set_xticks([1, 10, 100, 1_000, 10_000, 100_000])
    ax3.set_xticklabels(["1", "10", "100", "1,000", "10,000", "100,000"])
    ax3.set_xlabel("hotspot ground treated [km²]")
    ax3.set_ylabel("less sand landing at Al Dhafra [%]")
    ax3.set_title("Effect of treating hotspot ground")
    ax3.axvline(1, color=ASH, ls=":", lw=1.4)
    ax3.annotate("a 1 km² pilot plot", (1, max(cuts) * 0.72), color=ASH, fontsize=9,
                 xytext=(6, 0), textcoords="offset points")
    fig2.tight_layout()
    figs.append((fig2, "exposure-2.png"))

    return figs


# ---------------------------------------------------------------------------
# what the page claims, checked
# ---------------------------------------------------------------------------
def _self_test():
    from math import isclose

    data = load_data()
    clim = data["era5_wind_climatology.json"]
    grain_d = data["uae_parameters.json"]["grain_size"]["Rub' Al-Khali"]["d_m"]
    hotspots = build_hotspots(data["ginoux_middle_east_mam.geojson"])
    site = next(s for s in data["uae_target_sites.json"]["sites"]
                if s["name"].startswith("Al-Dhafra"))
    months = SEASONS["Mar to May"]
    wind = Wind(clim, months)
    seconds = sum(MONTH_DAYS[m - 1] for m in months) * 86400

    # 1. The closed-form flux integral must equal a brute-force sum of the same
    #    integrand. Everything downstream rests on this one.
    A, k = 5.2, 2.4
    ut = threshold(grain_d) / USTAR_RATIO
    u = np.linspace(1e-6, 60, 400_000)
    integrand = weibull_pdf(u, A, k) * np.array([flux_at_wind(x, ut) for x in u])
    numeric = float(np.trapezoid(integrand, u) if hasattr(np, "trapezoid")
                    else np.trapz(integrand, u))
    closed = mean_saltation_flux(A, k, ut)
    assert isclose(closed, numeric, rel_tol=2e-4), (closed, numeric)
    print(f"flux integral: closed form {closed:.3e} = brute force {numeric:.3e} kg/m/s")

    # 2. Figure 1's point, asserted rather than left in prose.
    naive = flux_at_wind(weibull_mean(A, k), ut)
    assert closed > naive
    print("using the average wind understates the sand: "
          + ("it predicts none at all" if naive == 0 else f"by {closed / naive:.0f}x"))

    r = transport_to_site(hotspots, site, wind, seconds, treated_area_m2=1e15,
                          grain_d_m=grain_d)

    # 3. Treatment can only ever reduce what arrives.
    assert r["landed_treated_kg"] <= r["landed_kg"]

    # 4. The shares are a split of one thing, so they add to 100.
    assert isclose(sum(v for _, v in r["shares"]), 100.0, abs_tol=1e-6)

    print(f"\n{site['name']}, March to May")
    print(f"  hotspots feeding it   {r['hotspot_area_km2']:,.0f} km²")
    print(f"  lands on the site     {r['landed_kg']:.1f} kg over the season")
    print(f"  that is               {r['landing_fraction'] * 1e6:.2f} kg of every "
          f"million the hotspots lose")
    print(f"  plume reaches about   {r['reach_km']:.0f} km")
    print(f"  bare sand moves above {r['ut_bare']:.1f} m/s, treated {r['ut_treated']:.1f} m/s")
    print("  where it comes from:")
    for name, share in r["shares"][:5]:
        print(f"    {share:5.1f}%  {name}, {r['distance_km'][name]:.0f} km away")

    small = transport_to_site(hotspots, site, wind, seconds, treated_area_m2=1e6,
                              grain_d_m=grain_d)["difference_pct"]
    big = transport_to_site(hotspots, site, wind, seconds, treated_area_m2=1e10,
                            grain_d_m=grain_d)["difference_pct"]
    assert big > small
    print(f"\n  treating 1 km² of hotspot:      {small:.2f}% less sand lands here")
    print(f"  treating 10,000 km² of hotspot: {big:.1f}% less")
    print("\n  The amounts are a floor. The wind record misses gusts and the share of"
          "\n  each hotspot that is loose enough to blow away is our own assumption.")


if __name__ == "__main__":
    _self_test()
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
