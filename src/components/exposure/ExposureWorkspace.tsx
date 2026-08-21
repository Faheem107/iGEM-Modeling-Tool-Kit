"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { Fold, ModuleActions, Slider, StatCard } from "@/src/components/simulation/_shared";
import BusinessCaseBookmark from "@/src/components/BusinessCaseBookmark";
import ExposureMap, { type SourceFeature, type TargetSite } from "./ExposureMap";
import MapLegend from "./MapLegend";
import WindRose from "./WindRose";
import {
  nearFieldCaptureFraction, sandblastEfficiency, bearingDeg, alignment,
} from "@/src/lib/physics/dustTransport";
import {
  meanSaltationFlux, driftPotential, driftFromSectors, cardinal, ROSE_SECTORS,
  GULF_IMPACT_THRESHOLD_MS,
} from "@/src/lib/physics/windStats";
import { thresholdUntreated, thresholdTreated } from "@/src/lib/physics/aeolian";
import { transmittanceLossPercent } from "@/src/lib/physics/damage";
import { useHighlight } from "@/src/lib/motion/pointer";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import {
  climatologyField, toWindField, nearestCell,
  type Climatology, type WindField, type WindFieldResponse,
} from "@/src/lib/windField";

type Mode = "seasonal" | "live";

/**
 * Grain diameter for the Rub al Khali, Benaafi et al. Table 1, 1.460 phi.
 * Used until public/data/uae_parameters.json loads, which carries the measured
 * value and its provenance rather than a number typed into a component.
 */
const GRAIN_D_FALLBACK_M = 2 ** -1.46 / 1000;

/**
 * The four windows, each with the calendar months it covers. `mid` is the month
 * whose mean vector field the map animates; the Weibull fit and the rose are
 * averaged over all three, since a season is what the reader picked.
 */
const SEASONS = [
  { id: "DJF", label: "Dec to Feb", months: [12, 1, 2], mid: 1 },
  { id: "MAM", label: "Mar to May", months: [3, 4, 5], mid: 4 },
  { id: "JJA", label: "Jun to Aug", months: [6, 7, 8], mid: 7 },
  { id: "SON", label: "Sep to Nov", months: [9, 10, 11], mid: 10 },
] as const;

function Grade({ grade }: { grade: "measured" | "literature" | "unsourced" }) {
  const tone =
    grade === "measured" ? "text-dune-teal border-dune-teal/40"
    : grade === "literature" ? "text-dune-orange border-dune-orange/40"
    : "text-dune-rose border-dune-rose/40";
  return (
    <span className={`caption rounded-[4px] border px-2 py-1 ${tone}`}>{grade}</span>
  );
}

export default function ExposureWorkspace() {
  const { isLightMode } = useTheme();
  // The index links here twice, once per view, so the link has to land on the
  // view it names. Without the param both rows opened the same screen.
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "live" ? "live" : "seasonal",
  );
  const [sources, setSources] = useState<SourceFeature[]>([]);
  const [sites, setSites] = useState<TargetSite[]>([]);
  const [markets, setMarkets] = useState<{ id: string; label: string; note: string }[]>([]);
  const [market, setMarket] = useState("solar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [siteQuery, setSiteQuery] = useState("");
  const [showSources, setShowSources] = useState(true);

  // Seasonal wind comes from the fitted ERA5 climatology for the cell nearest
  // the selected site. The sliders are an OVERRIDE, off by default: a slider
  // must never be mistaken for a measurement, so turning it on downgrades the
  // panel's evidence grade. See DUST_EXPOSURE_MODULE_SPEC.md section 7.3.
  const [season, setSeason] = useState<(typeof SEASONS)[number]["id"]>("MAM");
  const [override, setOverride] = useState(false);
  const [windA, setWindA] = useState(7.5);
  const [windK, setWindK] = useState(2.0);
  const [windDir, setWindDir] = useState(315);
  const [clay, setClay] = useState(5);
  const [cohesion, setCohesion] = useState(0.002);
  const [patchDist, setPatchDist] = useState(20);

  const [grainD, setGrainD] = useState(GRAIN_D_FALLBACK_M);
  const [clim, setClim] = useState<Climatology | null>(null);
  const [liveField, setLiveField] = useState<WindField | null>(null);

  const [live, setLive] = useState<{ dust: number | null; wind: number | null; dir: number | null; at: string } | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const hl = useHighlight();

  useEffect(() => {
    // Measured grain size, rather than the constant hard-coded above it.
    fetch("/data/uae_parameters.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const g = d?.grain_size?.["Rub' Al-Khali"]?.d_m;
        if (typeof g === "number" && g > 0) setGrainD(g);
      })
      .catch(() => undefined);   // the fallback above is the same paper's value

    fetch("/data/era5_wind_climatology.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setClim)
      .catch(() => undefined);   // the seasonal panel says so if it is missing

    Promise.all([
      fetch("/data/ginoux_middle_east_mam.geojson").then((r) => r.json()),
      fetch("/data/uae_target_sites.json").then((r) => r.json()),
    ])
      .then(([gj, ts]) => {
        setSources(gj.features ?? []);
        setSites(ts.sites ?? []);
        setMarkets(ts.markets ?? []);
      })
      .catch(() => undefined);
  }, []);

  const visible = useMemo(() => {
    const inMarket = sites.filter((s) => s.market === market);
    const q = siteQuery.trim().toLowerCase();
    if (!q) return inMarket;
    return inMarket.filter(
      (s) => s.name.toLowerCase().includes(q) || s.emirate.toLowerCase().includes(q),
    );
  }, [sites, market, siteQuery]);

  /**
   * The picker holds every site in the market, so it is grouped by emirate.
   * Sorting is by name inside a group; the emirates themselves keep a fixed
   * order rather than an alphabetical one, so the list does not reshuffle
   * between markets.
   */
  const grouped = useMemo(() => {
    const order = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain",
                   "Ras Al Khaimah", "Fujairah"];
    const byEmirate = new Map<string, TargetSite[]>();
    for (const s of visible) {
      const list = byEmirate.get(s.emirate) ?? [];
      list.push(s);
      byEmirate.set(s.emirate, list);
    }
    return order
      .filter((e) => byEmirate.has(e))
      .map((e) => [e, byEmirate.get(e)!.slice().sort((a, b) => a.name.localeCompare(b.name))] as const);
  }, [visible]);

  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const site = visible.find((s) => s.id === selectedId) ?? null;

  // The live wind grid is site-independent, so it is fetched per mode rather
  // than per site. Our route caches it for an hour; see app/api/wind-field.
  useEffect(() => {
    if (mode !== "live") return;
    const ac = new AbortController();
    fetch("/api/wind-field", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: WindFieldResponse) => setLiveField(toWindField(d)))
      .catch(() => undefined);
    return () => ac.abort();
  }, [mode]);

  // Live feed for the selected site.
  useEffect(() => {
    if (mode !== "live" || !site) return;
    const ac = new AbortController();
    setLiveLoading(true);
    setLiveErr(null);
    fetch(`/api/live-dust?lat=${site.lat.toFixed(4)}&lon=${site.lon.toFixed(4)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((d) => {
        const now = Date.now();
        const pt =
          (d.points ?? []).find((p: { time: string }) => new Date(p.time + "Z").getTime() >= now) ??
          (d.points ?? [])[0];
        setLive(pt ? { dust: pt.dust, wind: pt.windSpeed, dir: pt.windDirection, at: pt.time } : null);
      })
      .catch((e) => { if (e.name !== "AbortError") setLiveErr(e.message); })
      .finally(() => setLiveLoading(false));
    return () => ac.abort();
  }, [mode, site]);

  // --- the model -----------------------------------------------------------
  const seasonDef = SEASONS.find((x) => x.id === season) ?? SEASONS[1];

  /**
   * The fitted climatology for the cell nearest this site, averaged over the
   * three months of the chosen window. A and k are averaged directly; the rose
   * sums, because drift potential is an amount of work done over a period and
   * three months of it add.
   */
  const seasonal = useMemo(() => {
    if (!clim || !site) return null;
    const near = nearestCell(clim, site.lon, site.lat);
    if (!near) return null;
    const cell = clim.cells[near.key];

    let A = 0;
    let k = 0;
    let n = 0;
    const freq = new Array(ROSE_SECTORS).fill(0);
    const spd = new Array(ROSE_SECTORS).fill(0);
    const q = new Array(ROSE_SECTORS).fill(0);

    for (const m of seasonDef.months) {
      const mm = cell?.months?.[String(m)];
      if (!mm) continue;
      A += mm.A;
      k += mm.k;
      n++;
      const r = cell.rose?.[String(m)];
      if (r) {
        for (let i = 0; i < ROSE_SECTORS; i++) {
          freq[i] += r[0][i] / seasonDef.months.length;
          spd[i] += r[1][i] / seasonDef.months.length;
          q[i] += r[2][i];
        }
      }
    }
    if (!n) return null;
    return {
      A: A / n,
      k: k / n,
      freq,
      spd,
      q,
      hasRose: q.some((x) => x > 0),
      at: near,
    };
  }, [clim, site, seasonDef]);

  const speed = mode === "live" ? (live?.wind ?? 0) : override || !seasonal ? windA : seasonal.A;
  const dirFrom = mode === "live" ? (live?.dir ?? windDir) : windDir;

  /**
   * Drift comes from two different routines because the two modes carry
   * genuinely different information. Live has ONE observation, so Fryberger's
   * Q is evaluated at that speed. Seasonal has three months of hourly data
   * already summed per sector, so only the vector sum is left to do. Deriving
   * the seasonal Q from a sector mean speed would zero out months that plainly
   * move sand, because Q goes as the cube of the wind.
   */
  const drift = useMemo(() => {
    if (mode === "seasonal" && !override && seasonal?.hasRose) {
      return driftFromSectors(seasonal.q);
    }
    return driftPotential(
      [{ directionFrom: dirFrom, speed, timeFraction: 1 }],
      GULF_IMPACT_THRESHOLD_MS,
    );
  }, [mode, override, seasonal, dirFrom, speed]);

  // What the map animates. Seasonal is a monthly MEAN VECTOR wind, which is a
  // different quantity from the live instantaneous field: where direction
  // varies the mean vector is weaker than any real day's wind. The caption
  // under the map says which is on screen.
  const windField = useMemo(() => {
    if (mode === "live") return liveField;
    return clim ? climatologyField(clim, seasonDef.mid) : null;
  }, [mode, liveField, clim, seasonDef.mid]);

  const uStarT0 = thresholdUntreated(grainD);
  const uStarT = thresholdTreated(grainD, cohesion);
  const R = 0.03; // AEOLIAN_CALIB.uStarRatio at 10 m
  const utFree0 = uStarT0 / R;
  const utFreeT = uStarT / R;

  // The seasonal view integrates the flux over the fitted Weibull, which is the
  // whole point: flux goes as roughly the cube of the wind above a threshold, so
  // the flux of the mean wind is not the mean of the flux. The live view has one
  // instantaneous wind, so it is evaluated as a narrow distribution at that
  // speed instead.
  const fitted = mode === "seasonal" && !override && seasonal;
  const kEff = mode === "live" ? 12 : fitted ? seasonal!.k : windK;
  const aEff = mode === "live" ? Math.max(speed, 0.01) : fitted ? seasonal!.A : windA;
  const Q0 = meanSaltationFlux({ A: aEff, k: kEff, uThreshold: utFree0 });
  const Qt = meanSaltationFlux({ A: aEff, k: kEff, uThreshold: utFreeT });
  const reduction = Q0 > 0 ? 1 - Qt / Q0 : 0;
  // Q0 = 0 means the untreated bed never moves at this wind, so there is nothing
  // to reduce and a percentage would be meaningless. Qt = 0 with Q0 > 0 means the
  // treated bed never moves, which is a real result but should be said in words
  // rather than shown as a bare 100 percent.
  const noTransport = Q0 <= 0;
  const fullyArrested = !noTransport && Qt <= 0;

  const blast = sandblastEfficiency(clay);
  const F0 = 0.87 * Q0 * blast.alpha;
  const Ft = 0.87 * Qt * blast.alpha;

  const capture = nearFieldCaptureFraction(patchDist, Math.max(speed, 0.1));
  const captureTreated = capture * (1 - reduction);

  // Does the drift direction actually carry material from the nearest mapped
  // source toward this site? Bearing runs source -> site, and RDD is the
  // direction sand moves toward, so the two are directly comparable.
  const sourceBearing =
    site?.nearestSourceLat != null && site?.nearestSourceLon != null
      ? bearingDeg(site.nearestSourceLat, site.nearestSourceLon, site.lat, site.lon)
      : null;
  const align =
    sourceBearing != null && Number.isFinite(drift.RDD)
      ? alignment(drift.RDD, sourceBearing)
      : null;

  const dep = transmittanceLossPercent(2.0, 24); // 24 deg, near UAE latitude tilt

  return (
    <div className="space-y-6">
      {/* mode switch */}
      <div className="flex flex-wrap items-center gap-2">
        {([["seasonal", "Seasonal forecast"], ["live", "Live feed"]] as const).map(
          ([id, label]) => (
            <button
              key={id}
              {...hl}
              onClick={() => setMode(id)}
              className={`inline-flex items-center gap-2 rounded-[6px] border px-4 py-2 text-[length:var(--text-micro)] font-semibold plate-interactive ${
                mode === id
                  ? "border-dune-orange/60 bg-dune-orange/10 text-dune-orange"
                  : "border-border text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ),
        )}
        <span className="caption ml-auto">
          {mode === "seasonal" ? "2 to 3 month window" : "CAMS global, updated twice daily"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* map */}
        <div className="lg:col-span-7 space-y-4">
          <ExposureMap
            sources={sources}
            sites={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            driftDeg={drift.RDD}
            showSources={showSources}
            windField={windField}
            isLightMode={isLightMode}
          />
          <MapLegend
            showSources={showSources}
            onToggleSources={setShowSources}
            isLightMode={isLightMode}
            windLabel={
              mode === "live"
                ? "Wind blowing right now, from the current feed"
                : `Average wind direction across ${seasonDef.label}`
            }
          />
          <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            <GlossaryText max={3}>
              {"Source areas are mapped on a 0.1° grid, about 11 km across, by how often dust is seen over them, and only for March to May, which is the only window published for this region. They do not change when you change the season."}
            </GlossaryText>
          </p>
        </div>

        {/* controls */}
        <div className="lg:col-span-5 space-y-5">
          <Fold
            className="border-t border-border pt-5"
            title="Target market"
            lede="Which asset the numbers below are computed for."
            defaultOpen
            wide
          >
            <div className="space-y-4">
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <p className="text-[length:var(--text-micro)] text-muted-foreground">
                {markets.find((m) => m.id === market)?.note}
              </p>
              <input
                type="search"
                value={siteQuery}
                onChange={(e) => setSiteQuery(e.target.value)}
                placeholder={`Filter ${sites.filter((s) => s.market === market).length} sites`}
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              />
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                size={8}
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              >
                {grouped.map(([emirate, list]) => (
                  <optgroup key={emirate} label={emirate}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.capacityMw ? ` (${s.capacityMw} MW)` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {visible.length === 0 && (
                <p className="caption text-dune-rose">No site matches that filter.</p>
              )}
              {site && (
                <p className="caption">
                  {site.emirate}. nearest mapped source {site.nearestSourceKm} km,{" "}
                  {site.nearestSourceType}
                </p>
              )}
              {site?.nameLocal && (
                <p className="caption">
                  mapped in OpenStreetMap as {site.nameLocal}
                </p>
              )}
            </div>
          </Fold>

          {mode === "seasonal" ? (
            <Fold
              className="border-t border-border pt-5"
              title="Seasonal wind"
              lede="The fitted wind distribution that drives every number on this page."
              wide
              right={<Grade grade={seasonal && !override ? "literature" : "unsourced"} />}
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.id}
                    {...hl}
                    onClick={() => setSeason(s.id)}
                    className={`rounded-[4px] border px-2 py-1 text-[length:var(--text-micro)] font-semibold plate-interactive ${
                      season === s.id
                        ? "border-dune-orange/60 text-dune-orange"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {seasonal && !override ? (
                <div className="space-y-4">
                  <WindRose
                    frequency={seasonal.freq}
                    speed={seasonal.spd}
                    drift={drift}
                    isLightMode={isLightMode}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      label="Typical wind"
                      value={seasonal.A.toFixed(1)}
                      unit="m/s"
                      accent="text-dune-teal"
                      isLightMode={isLightMode}
                      sub="the scale of the fitted spread at 10 m" rule={false} />
                    <StatCard
                      label="How gusty"
                      value={seasonal.k.toFixed(2)}
                      accent="text-dune-teal"
                      isLightMode={isLightMode}
                      sub="lower is gustier, and gusts move the sand" rule={false} />
                  </div>
                  <p className="caption">
                    ERA5 2022 to 2024, grid cell {seasonal.at.lat}°N {seasonal.at.lon}°E
                  </p>
                </div>
              ) : (
                <>
                  {!clim && (
                    <p className="mb-4 text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
                      The wind climatology did not load, so these are your own inputs.
                    </p>
                  )}
                  <Slider label="Typical wind, Weibull scale A" value={windA} onChange={setWindA} min={2} max={16} step={0.1} unit="m/s" isLightMode={isLightMode} />
                  <Slider label="How gusty, Weibull shape k" value={windK} onChange={setWindK} min={1.2} max={4} step={0.05} unit="" isLightMode={isLightMode} />
                  <Slider label="Wind direction from" value={windDir} onChange={setWindDir} min={0} max={359} step={1} unit="°" isLightMode={isLightMode} hint="The bearing the wind blows from, the convention every wind rose uses." />
                </>
              )}

              {clim && (
                <label className="caption mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={override}
                    onChange={(e) => setOverride(e.target.checked)}
                  />
                  Set the wind myself instead
                </label>
              )}
            </Fold>
          ) : (
            <Fold
              className="border-t border-border pt-5"
              title="Live conditions"
              lede="The current wind and dust reading for this site."
              defaultOpen
              wide
            >
              {liveLoading && <p className="text-[length:var(--text-micro)] text-muted-foreground">Loading the feed.</p>}
              {liveErr && (
                <p className="text-[length:var(--text-micro)] text-dune-rose">
                  The live feed is unavailable right now. {liveErr}
                </p>
              )}
              {live && !liveLoading && (
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Surface dust" value={live.dust?.toFixed(0) ?? "n/a"} unit="µg/m³" accent="text-dune-orange" isLightMode={isLightMode} rule={false} />
                  <StatCard label="Wind at 10 m" value={live.wind?.toFixed(1) ?? "n/a"} unit="m/s" accent="text-dune-teal" isLightMode={isLightMode} rule={false} />
                  <StatCard label="Direction from" value={live.dir?.toFixed(0) ?? "n/a"} unit="°" accent="text-dune-teal" isLightMode={isLightMode} rule={false} />
                  <StatCard label="Valid" value={live.at?.slice(5, 16).replace("T", " ") ?? "n/a"} accent="text-muted-foreground" isLightMode={isLightMode} rule={false} />
                </div>
              )}
              <p className="caption mt-4">CAMS global via Open-Meteo, 0.4°, 3-hourly</p>
            </Fold>
          )}

          <Fold
            className="border-t border-border pt-5"
            title="Surface and treatment"
            lede="The three inputs you can change: what the ground is made of, what the crust adds, and how far upwind it sits."
            wide
          >
            <Slider label="Soil clay content" value={clay} onChange={setClay} min={0} max={25} step={0.5} unit="%" isLightMode={isLightMode} hint="Clay sets the sandblasting efficiency: how much fine dust the hopping grains knock loose. Dune sand has almost none." />
            {blast.capped && (
              <p className="mb-4 text-[length:var(--text-micro)] text-dune-rose">
                Clamped at 20 percent. Chappell Eq 3 is not valid above that, and SoilGrids
                reads about 20 percent over UAE dune fields where the petrography says nearer
                two. Read the value with that in mind.
              </p>
            )}
            <Slider label="Cohesion the crust adds" value={cohesion} onChange={setCohesion} min={0} max={0.01} step={0.0002} unit="N m⁻¹" isLightMode={isLightMode} />
            <p className="-mt-2 mb-4 text-[length:var(--text-micro)] text-muted-foreground">
              Roughly {(cohesion / 1.5e-5).toFixed(0)} kPa of crust strength. This is the
              one number our own lab work has to supply, so it stays an input until it is
              measured, and the strength it converts to is provisional too.
            </p>
            <Slider label="Treated patch to asset" value={patchDist} onChange={setPatchDist} min={1} max={200} step={1} unit="m" isLightMode={isLightMode} hint="How far the treated ground sits upwind. The capture fraction falls away fast with distance." />
          </Fold>
        </div>
      </div>

      {/* Outputs. One column of folds rather than a grid of panels: collapsed,
          they read as a list of questions the reader can open, which is the
          point of folding them at all. */}
      <div className="space-y-5">
        <Fold
          className="border-t border-border pt-5"
          title="Fraction of sand reaching the site"
          lede="How much of the sand leaving the treated patch actually arrives, before and after treatment."
          defaultOpen
          wide
          right={<Grade grade="literature" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Near field, untreated" value={(capture * 100).toFixed(1)} unit="%" accent="text-dune-orange" isLightMode={isLightMode} sub={`saltation over ${patchDist} m`} rule={false} />
            <StatCard label="Near field, treated" value={(captureTreated * 100).toFixed(1)} unit="%" accent="text-dune-teal" isLightMode={isLightMode} emphasize rule={false} />
            <StatCard label="Suspension flux F" value={noTransport ? "0" : (F0 * 1e9).toFixed(2)} unit="µg m⁻² s⁻¹" accent="text-dune-orange" isLightMode={isLightMode} sub="regional, reaches the site" rule={false} />
            <StatCard
              label="Drift alignment"
              value={align == null ? "n/a" : (align * 100).toFixed(0)}
              unit={align == null ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              sub={
                align == null
                  ? "no wind above threshold"
                  : `source bearing ${sourceBearing?.toFixed(0)}°, drift ${drift.RDD.toFixed(0)}°`
              } rule={false} />
          </div>
          <p className="mt-4 text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            <GlossaryText max={2}>
              {"The near-field figure is an upper bound. It ignores repeated re-launch, which extends transport, and it ignores turbulence."}
            </GlossaryText>
          </p>
        </Fold>

        <Fold
          className="border-t border-border pt-5"
          title="What the treatment changes"
          lede="The same calculation run twice, once with the untreated threshold and once with the treated one."
          wide
          right={<Grade grade="measured" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Threshold, untreated" value={uStarT0.toFixed(3)} unit="m/s" accent="text-dune-orange" isLightMode={isLightMode} rule={false} />
            <StatCard label="Threshold, treated" value={uStarT.toFixed(3)} unit="m/s" accent="text-dune-teal" isLightMode={isLightMode} rule={false} />
            <StatCard
              label="Saltation flux cut"
              value={noTransport ? "n/a" : (reduction * 100).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              emphasize
              sub={noTransport ? "untreated bed already still" : undefined} rule={false} />
            <StatCard
              label="Suspension flux cut"
              value={noTransport ? "n/a" : (F0 > 0 ? (1 - Ft / F0) * 100 : 0).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
            />
          </div>
          <p className="mt-4 text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            <GlossaryText max={3}>
              {"Cohesion is the only thing the product changes. It raises the threshold wind, which raises the lower limit of the flux integral, which drops both the sand and the suspension flux at once."}
            </GlossaryText>
          </p>
          {noTransport && (
            <p className="mt-2 text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
              At this wind the untreated bed does not move either, so there is no transport
              to reduce. Raise the wind above about {(utFree0).toFixed(1)} m/s to see an effect.
            </p>
          )}
          {fullyArrested && (
            <p className="mt-2 text-[length:var(--text-micro)] leading-relaxed text-dune-teal">
              The treated bed does not move at all at this wind. That is a real result of the
              threshold shift, not a rounded figure, but it holds only up to about{" "}
              {(utFreeT).toFixed(1)} m/s. Above that the crust starts transporting again.
            </p>
          )}
        </Fold>
      </div>

      <Fold
        className="border-t border-border pt-5"
        title="Cost impact"
        lede="What the arriving sand costs, and how much of that treating the ground would avoid."
        wide
        right={<Grade grade={market === "solar" ? "literature" : "unsourced"} />}
      >
        {market === "solar" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Transmittance loss" value={dep.value?.toFixed(1) ?? "n/a"} unit="%" accent="text-dune-orange" isLightMode={isLightMode} sub="at 2 g/m², 24° tilt" rule={false} />
              <StatCard label="Site capacity" value={site?.capacityMw?.toFixed(0) ?? "n/a"} unit="MW" accent="text-muted-foreground" isLightMode={isLightMode} rule={false} />
              <StatCard label="DEWA industrial" value="0.126" unit="USD/kWh" accent="text-muted-foreground" isLightMode={isLightMode} sub="retail, not PPA" rule={false} />
              <StatCard label="Capacity factor" value={null} accent="text-dune-rose" isLightMode={isLightMode} sub="how much of its rated power the site actually averages" rule={false} />
            </div>
            <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
              Annual revenue loss needs a capacity factor and the price the site actually
              earns. The DEWA figure is the retail consumption tariff. A generator earns its
              PPA price, which in the UAE has been far lower, so the two must not be swapped.
              Both are left as inputs rather than assumed.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <p className="text-[length:var(--text-micro)] leading-relaxed">
              How much sand reaches this kind of site is modelled above. Converting that
              mass into a cost is where we stop, because we could not find a published
              figure for what the sand costs its owner. Roads are the closest: the drift
              rate is measured, about 20 cubic metres per metre of width per year in
              Kuwait, and only the price of clearing a cubic metre is missing. So this
              panel stays empty rather than carrying a number we estimated.
            </p>
          </div>
        )}
      </Fold>

      {/* The commercial case is no longer inline. A page of prose in the
          middle of a page of numbers served neither: the prose interrupted the
          model and the model made the prose look like a footnote. It is now a
          bookmark on the edge of the page opening a dialog, mounted here so it
          only appears on this module. */}
      <BusinessCaseBookmark />

      {/* Sources and the runnable code, the same toolbar every other model
          carries. There is no narrated explainer for this one yet, so no video
          toggle is offered rather than opening an empty window. */}
      <ModuleActions
        moduleId="exposure"
        isLightMode={isLightMode}
        include={["math", "sources", "code"]}
      />
    </div>
  );
}
