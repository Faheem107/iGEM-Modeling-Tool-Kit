"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { attributeSources, windRunPerSector } from "@/src/lib/physics/attribution";
import {
  annualGenerationMwh, capacityFactor, DEFAULT_DEPOSITION_VELOCITY_MS,
  depositionFromConcentration, energyLossMwh, pvCellFor, revenueLossUsd,
  seasonCapacityFactor, type Mounting, type PvClimatology,
} from "@/src/lib/physics/pv";
import { camsFor, camsSpreadFor, type CamsClimatology } from "@/src/lib/camsDust";
import { sourceColor } from "./ExposureMap";
import { Fold, ModuleActions, Note, Slider, StatCard } from "@/src/components/simulation/_shared";
import BusinessCaseBookmark from "@/src/components/BusinessCaseBookmark";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import Grade from "./Grade";
import WindValidation, { useWindValidation } from "./WindValidation";
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
import {
  AED_PER_USD, tariffUsdPerKwh, transmittanceLossPercent, type PriceBasis,
} from "@/src/lib/physics/damage";
import { useHighlight } from "@/src/lib/motion/pointer";
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
/** Money rounded and separated, so it reads as an amount rather than a number.
 *  Dirhams alongside dollars: the tariffs are quoted in USD, readers are not. */
const usd0 = (v: number) =>
  "$" + Math.round(v).toLocaleString("en-US");

const aed0 = (v: number) =>
  "AED " + Math.round(v * AED_PER_USD).toLocaleString("en-US");

/** "1 day", "4 days". A computed figure in a sentence still has to read. */
const plural = (v: number, noun: string) => {
  const n = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
  return `${n} ${n === 1 ? noun : noun + "s"}`;
};

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
  const [showDust, setShowDust] = useState(true);

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
  const [pvClim, setPvClim] = useState<PvClimatology | null>(null);
  /** A generator's PPA and a consumer's retail bill are an order of magnitude
   *  apart, so the reader picks rather than inheriting one. See damage.ts. */
  const [priceBasis, setPriceBasis] = useState<PriceBasis>("ppa");
  /** Unsourced, and it multiplies the whole chain, so it stays visible. */
  const [retention, setRetention] = useState(0.3);
  /** Days between washes: the deposit that matters is what builds up between. */
  const [cleanDays] = useState(21);
  const [camsClim, setCamsClim] = useState<CamsClimatology | null>(null);
  const [liveField, setLiveField] = useState<WindField | null>(null);

  const [live, setLive] = useState<{ dust: number | null; wind: number | null; dir: number | null; at: string } | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const hl = useHighlight();

  /** What the verify_* scripts found. Read at runtime like every other dataset,
   *  so a number here cannot drift from the test that produced it. */
  const validation = useWindValidation();

  useEffect(() => {
    // Measured grain size, rather than the constant hard-coded above it.
    fetch("/data/uae_parameters.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const g = d?.grain_size?.["Rub' Al-Khali"]?.d_m;
        if (typeof g === "number" && g > 0) setGrainD(g);
      })
      .catch(() => undefined);   // the fallback above is the same paper's value

    fetch("/data/cams_dust_climatology.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setCamsClim(d))
      .catch(() => undefined);   // the money panel says so if it is missing
    fetch("/data/uae_pv_climatology.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setPvClim(d))
      // The money panel says so if this is missing.
      .catch(() => undefined);
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

  /** Grouped by emirate, in a fixed order so the list does not reshuffle. */
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
   * The fitted climatology for the cell nearest this site, over the three months
   * of the chosen window.
   *
   * Three quantities, aggregated three different ways, because they are three
   * different kinds of thing:
   *
   *   A and k   averaged, and used only to SHOW a season's typical wind. They
   *             are no longer integrated once to get the flux. Doing that
   *             smears a windy month into two calm ones before the cubing that
   *             matters, and verify_wind_holdout.py measured the cost: at the
   *             5.4 m/s threshold, integrating each month and averaging the
   *             fluxes is closer to the hourly truth in 13 of 16 seasons.
   *   months    kept per month, so the flux can be integrated month by month.
   *   rose      summed, because drift potential is an amount of work done over
   *             a period and three months of it add.
   */
  const seasonal = useMemo(() => {
    if (!clim || !site) return null;
    const near = nearestCell(clim, site.lon, site.lat);
    if (!near) return null;
    const cell = clim.cells[near.key];

    let A = 0;
    let k = 0;
    let n = 0;
    const months: { A: number; k: number }[] = [];
    const freq = new Array(ROSE_SECTORS).fill(0);
    const spd = new Array(ROSE_SECTORS).fill(0);
    const q = new Array(ROSE_SECTORS).fill(0);

    for (const m of seasonDef.months) {
      const mm = cell?.months?.[String(m)];
      if (!mm) continue;
      A += mm.A;
      k += mm.k;
      n++;
      months.push({ A: mm.A, k: mm.k });
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
      months,
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
  /**
   * What the map's dust layer reads over this site, so the wash under the
   * marker has a number. July is high because July has storms, not because
   * every July day is dusty, which is what the spread says.
   */
  const siteDust = useMemo(() => {
    if (!site) return null;
    const mean = camsFor(camsClim, site.lat, site.lon, seasonDef.months);
    if (mean == null) return null;
    return { mean, spread: camsSpreadFor(camsClim, site.lat, site.lon, seasonDef.months) };
  }, [camsClim, site, seasonDef]);

  /** Source regions feeding this site this season, as percentages. */
  const shares = useMemo(() => {
    if (!site || !sources.length) return [];
    const run = seasonal ? windRunPerSector(seasonal.freq, seasonal.spd) : null;
    return attributeSources(sources, site.lat, site.lon, run);
  }, [sources, site, seasonal]);

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

  /**
   * The same argument one level up. Averaging A and k across a season and
   * integrating once is a flux of the mean applied to months instead of to
   * hours, and it has the same failure: a windy month averaged with two calm
   * ones loses the tail that carries the sand. So each month is integrated on
   * its own fit and the fluxes are averaged.
   *
   * Only the fitted branch gets this. An overridden slider and a live reading
   * both carry one wind, so there is nothing to average.
   */
  const seasonFlux = (uThreshold: number) => {
    const ms = fitted ? seasonal!.months : [];
    if (ms.length === 0) return meanSaltationFlux({ A: aEff, k: kEff, uThreshold });
    let sum = 0;
    for (const m of ms) sum += meanSaltationFlux({ A: m.A, k: m.k, uThreshold });
    return sum / ms.length;
  };

  const Q0 = seasonFlux(utFree0);
  const Qt = seasonFlux(utFreeT);
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

  /**
   * The money.
   *
   *   regional dust (CAMS, not reduced by treatment)
   *     + local dust from the patch (reduced)
   *     -> deposit over one cleaning interval -> light loss (Elminir 2006)
   *     -> averaged over the cycle -> energy -> money
   *
   * Regional and local are kept apart because pricing only the local part made
   * treatment look like it removed 98% of soiling. Accumulating over a wash
   * cycle rather than a year keeps the deposit inside Elminir's 1-9 g/m2 range;
   * a year gave 63 g/m2, where the curve means nothing.
   */
  const money = useMemo(() => {
    if (!site || market !== "solar") return null;
    const pvCell = pvCellFor(pvClim, site.lat, site.lon);
    if (!pvCell) return null;

    const mounting: Mounting = "fixed";
    const cfYear = capacityFactor(pvCell, mounting);
    const cfSeason = seasonCapacityFactor(pvCell, seasonDef.months, mounting);

    const intervalSeconds = cleanDays * 86400;

    // Live reading if we have one, else the CAMS monthly climatology.
    const regionalUgM3 =
      mode === "live" && live?.dust != null
        ? live.dust
        : camsFor(camsClim, site.lat, site.lon, seasonDef.months);

    const regionalDeposit =
      regionalUgM3 == null
        ? null
        : depositionFromConcentration(regionalUgM3, DEFAULT_DEPOSITION_VELOCITY_MS, intervalSeconds);

    // Local dust raised on the treated patch itself, which IS reduced.
    const localDeposit = (flux: number) => flux * intervalSeconds * 1000 * retention;

    const price = tariffUsdPerKwh(priceBasis, site.name);
    const mw = site.capacityMw ?? null;

    if (regionalDeposit == null || mw == null) {
      return { pvCell, cfYear, cfSeason, price, mw, regionalUgM3, usd: null };
    }

    const peakUntreated = transmittanceLossPercent(regionalDeposit + localDeposit(F0), 24);
    const peakTreated = transmittanceLossPercent(regionalDeposit + localDeposit(Ft), 24);
    // Elminir's curve has a nonzero intercept; subtract it so the average is
    // the loss from accumulation.
    const floor = transmittanceLossPercent(0, 24).value ?? 0;
    const cycleMean = (peak: number) => floor + 0.55 * (peak - floor);

    if (peakUntreated.value == null || peakTreated.value == null) {
      return { pvCell, cfYear, cfSeason, price, mw, regionalUgM3, usd: null };
    }

    const lossUntreated = cycleMean(peakUntreated.value);
    const lossTreated = cycleMean(peakTreated.value);

    const lostUntreated = energyLossMwh(mw, cfYear, lossUntreated);
    const lostTreated = energyLossMwh(mw, cfYear, lossTreated);
    const generation = annualGenerationMwh(mw, cfYear);

    const costUntreated = revenueLossUsd(lostUntreated, price.value);
    const costTreated = revenueLossUsd(lostTreated, price.value);

    return {
      pvCell, cfYear, cfSeason, price, mw, regionalUgM3,
      peakUntreated, lossUntreated, lossTreated,
      regionalDeposit,
      localDepositUntreated: localDeposit(F0),
      usd: {
        costUntreated,
        costTreated,
        saved: costUntreated - costTreated,
        lostUntreated,
        generation,
        shareOfRevenue: generation > 0 ? lostUntreated / generation : 0,
        daysLost: generation > 0 ? (lostUntreated / generation) * 365 : 0,
        // How much of the loss is addressable at all.
        addressableShare:
          costUntreated > 0 ? (costUntreated - costTreated) / costUntreated : 0,
        outOfRange: peakUntreated.outOfRange || peakTreated.outOfRange,
      },
    };
  }, [site, market, pvClim, camsClim, seasonDef, retention, cleanDays, F0, Ft, priceBasis, mode, live]);

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
            camsClim={camsClim}
            dustMonths={seasonDef.months}
            showDust={showDust}
            windField={windField}
            isLightMode={isLightMode}
          />
          {/* The season picker sits with the map because the map is what it
              visibly changes. The wind fold reads the same state. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="caption mr-1">Season</span>
            {SEASONS.map((s) => (
              <button
                key={s.id}
                {...hl}
                onClick={() => setSeason(s.id)}
                aria-pressed={season === s.id}
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
          {mode === "seasonal" && validation && (
            <div>
              <p className="text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
                At about half the sites we tested, switching season moves these numbers
                by less than the model&apos;s own error.
              </p>
              <Note label="How we know that" className="mt-1">
                {`We built the wind on 2022 and 2023, asked it to predict 2024, and measured how wrong it was. That error was larger than the gap between two neighbouring seasons in ${validation.heldOutYear.impact.seasonGapSwamped} of the ${validation.heldOutYear.impact.seasonGapChecked} season pairs we scored. So the season buttons resolve something real at the sites with a strong seasonal swing, and at the flatter sites they are inside the noise. The last section on this page has the rest of it.`}
              </Note>
            </div>
          )}
          <MapLegend
            showSources={showSources}
            onToggleSources={setShowSources}
            showDust={showDust}
            onToggleDust={setShowDust}
            isLightMode={isLightMode}
            seasonLabel={seasonDef.label}
            windLabel={
              mode === "live"
                ? "Wind blowing right now, from the current feed"
                : `Average wind direction across ${seasonDef.label}`
            }
          />
          <Note label="Why two dust layers">
            {"They answer different questions. The pale wash is CAMS, a 1° grid of how much dust is in the air each month, averaged over 2020 to 2024. The coloured areas are Ginoux, a 0.1° grid of where dust is raised from the ground, published for March to May only. Dust raised over the Tigris and Euphrates plain is measured over the Gulf a day later, so a bright wash is not a source."}
          </Note>
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
              lede={`The fitted wind distribution across ${seasonDef.label}, which drives every number on this page. Pick the season with the map.`}
              wide
              right={<Grade grade={seasonal && !override ? "literature" : "unsourced"} />}
            >
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
                  <Note label="How far to trust this">
                    {"The direction is the part to rely on. It agrees with three UAE airport records to within 6.3 degrees across about 75,000 paired hours, and nothing in the model rotates it. The speed does not agree as well. The grid reads low, and it sees between 29 and 78 percent of the hours those airports recorded above the speed that starts sand moving, so the sand figures below are more likely to be under than over."}
                  </Note>
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
              <p className="mb-1 text-[length:var(--text-micro)] text-dune-rose">
                Clamped at 20 percent.
              </p>
            )}
            {blast.capped && (
              <Note label="Why it is clamped" className="mb-4">
                {"Chappell Eq 3 is not valid above 20 percent. SoilGrids also reads about 20 percent over UAE dune fields where the petrography says nearer two, so the input is doubtful at the clamp as well as past it."}
              </Note>
            )}
            <Slider label="Cohesion the crust adds" value={cohesion} onChange={setCohesion} min={0} max={0.01} step={0.0002} unit="N m⁻¹" isLightMode={isLightMode} />
            <p className="caption -mt-1">
              Roughly {(cohesion / 1.5e-5).toFixed(0)} kPa of crust strength
            </p>
            <Note label="Where this number comes from" className="mt-1">
              {"Nowhere yet. This is the one value our own lab has to measure, so it stays a slider, and the conversion to crust strength is provisional too."}
            </Note>
            <Note label="How much it matters" className="mb-4 mt-1">
              {"Two different questions get run together here, so they are worth separating. Nobody has measured this number, which makes it the least sourced input on the page. Of the seven inputs it also moves the amount of sand the least. But because it is unmeasured its plausible range is the widest of any input here, and across that range the cut we report runs from 45 percent to 100 percent. It is not the number that most changes the physics. It is the number that most changes how sure we are allowed to be."}
            </Note>
            <Slider label="Treated patch to asset" value={patchDist} onChange={setPatchDist} min={1} max={200} step={1} unit="m" isLightMode={isLightMode} hint="How far the treated ground sits upwind. The capture fraction falls away fast with distance." />
          </Fold>
        </div>
      </div>

      {/* Outputs, grouped by the question each group answers, with the group's
          name in the rail gutter. Folds rather than a grid of panels: collapsed,
          they read as a list of questions the reader can open, which is the
          point of folding them at all. The rail label is what tells them which
          of those questions they are looking at.

          No indices in the gutter. A number would imply an order the reader has
          to follow, and they do not: somebody who only wants the money can go
          straight to it. */}
      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">Where it comes from</p>
          <div className="space-y-5">
        <Fold
          className="border-t border-border pt-5"
          title={`Where ${site ? site.name + "'s" : "this site's"} dust comes from`}
          lede="Ranked by how much each region contributes to this site, in this season."
          defaultOpen
          wide
          right={<Grade grade="literature" />}
        >
          {shares.length === 0 ? (
            <p className="text-[length:var(--text-micro)] text-muted-foreground">
              Pick a site to see its breakdown.
            </p>
          ) : (
            <div className="space-y-4">
              {siteDust && (
                <StatCard
                  label={`Dust in the air here, ${seasonDef.label}`}
                  value={siteDust.mean.toFixed(0)}
                  unit="µg m⁻³"
                  accent="text-dune-orange"
                  isLightMode={isLightMode}
                  sub={
                    siteDust.spread == null
                      ? undefined
                      : `± ${siteDust.spread.toFixed(0)} between years, 2020 to 2024`
                  }
                  note="A season's mean, not a typical day. The spread is between whole years, so a large one means some years carried storms the others did not, rather than a steady haze."
                  rule={false}
                />
              )}
              <ul className="space-y-3">
                {shares.slice(0, 6).map((sh) => (
                  <li key={sh.region} className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                    <div className="min-w-0">
                      <p className="text-[length:var(--text-micro)] text-foreground">
                        {sh.region}
                      </p>
                      <p className="caption">
                        {sh.distanceKm.toFixed(0)} km away, {cardinal(sh.bearingDeg)} of here
                      </p>
                      {/* The bar is the number drawn, not decoration, so it is
                          a plain rule at the source's own colour rather than a
                          filled pill. */}
                      <span
                        aria-hidden
                        className="mt-1 block h-[3px]"
                        style={{
                          width: `${Math.max(1, sh.percent)}%`,
                          background: sourceColor(sh.sourceType, isLightMode),
                        }}
                      />
                    </div>
                    <span
                      className="tabular-nums text-[length:var(--text-body)] text-dune-orange"
                      style={{ fontVariationSettings: '"wght" 620' }}
                    >
                      {sh.percent.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
              <Note label="What this covers">
                {"Suspended dust only, the fine material that travels. The sand that piles up and abrades comes from the ground within tens of metres, which is the next section."}
              </Note>
            </div>
          )}
        </Fold>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">What reaches the site</p>
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
            <StatCard
              label="Dust reaching the site"
              value={noTransport ? "0" : (F0 * 1e9).toFixed(2)}
              unit="µg m⁻² s⁻¹"
              accent="text-dune-orange"
              isLightMode={isLightMode}
              sub="dust flux raised far upwind, which the crust does not touch"
              rule={false}
            />
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
          <Note label="What would make this wrong" className="mt-4">
            {"The near-field figure is an upper bound. It ignores repeated re-launch, which extends transport, and it ignores turbulence."}
          </Note>
        </Fold>

        <Fold
          className="border-t border-border pt-5"
          title="What the treatment changes"
          lede="The same calculation run twice, once with the untreated threshold and once with the treated one."
          wide
          right={<Grade grade="measured" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Threshold, untreated"
              value={uStarT0.toFixed(3)}
              unit="m/s"
              accent="text-dune-orange"
              isLightMode={isLightMode}
              sub="the friction velocity at which bare sand starts to move"
              rule={false}
            />
            <StatCard
              label="Threshold, treated"
              value={uStarT.toFixed(3)}
              unit="m/s"
              accent="text-dune-teal"
              isLightMode={isLightMode}
              sub="the same, once the crust adds cohesion"
              rule={false}
            />
            <StatCard
              label="Sand flux cut"
              value={noTransport ? "n/a" : (reduction * 100).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              emphasize
              sub={
                noTransport
                  ? "untreated bed already still"
                  : "how much less sand flux hops past the site"
              }
              rule={false}
            />
            <StatCard
              label="Dust flux cut"
              value={noTransport ? "n/a" : (F0 > 0 ? (1 - Ft / F0) * 100 : 0).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              sub="how much less dust flux is lifted off the treated ground"
              rule={false}
            />
          </div>
          <p className="mt-4 max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
            Both thresholds above are calculated from grain size, not measured. At the
            wind they imply, about {utFree0.toFixed(1)} m/s, the year we held back
            predicted sand moving in seasons where the record shows none. Read the cut
            as evidence that treatment works, not as how much.
          </p>
          <Note label="Why treatment moves both" className="mt-2">
            {"Cohesion is the only thing the product changes. It raises the threshold wind, which raises the lower limit of the flux integral, which drops the sand flux and the dust flux at once."}
          </Note>
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
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">What it costs</p>
          <div className="space-y-5">
      <Fold
        className="border-t border-border pt-5"
        title="What it costs, and what treating the ground saves"
        lede="What the dust reaching this site costs it, and how much of that treating the ground upwind can reach."
        defaultOpen
        wide
        right={<Grade grade={market === "solar" ? "literature" : "unsourced"} />}
      >
        {market !== "solar" ? (
          <p className="text-[length:var(--text-micro)] leading-relaxed">
            The sand reaching this kind of site is modelled above. What it costs its owner
            is not published anywhere we could find, so this stays empty rather than
            carrying a number we estimated. Roads are closest: the drift rate is measured,
            about 20 cubic metres per metre of width per year in Kuwait, and only the price
            of clearing a cubic metre is missing.
          </p>
        ) : !money ? (
          <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            <GlossaryText max={2}>
              {"This site has no published nameplate capacity in OpenStreetMap, so there is no size to turn a percentage of lost light into an amount of electricity. Pick one of the plants that does carry a capacity."}
            </GlossaryText>
          </p>
        ) : (
          <div className="space-y-5">
            {/* The comparison first; everything else supports it. */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="caption mb-2">What dust costs this site now</p>
                <p
                  className="tabular-nums text-[length:var(--text-h3)] text-dune-orange"
                  style={{ fontVariationSettings: '"wght" 620' }}
                >
                  {money.usd ? usd0(money.usd.costUntreated) : "n/a"}
                </p>
                <p className="caption mt-1">
                  {money.usd ? `${aed0(money.usd.costUntreated)} a year` : ""}
                </p>
              </div>
              {/* The emphasised half of the comparison is marked the way
                  StatCard marks one, by weight, not by a coloured bar. */}
              <div>
                <p className="caption mb-2">The part treating the ground reaches</p>
                {money.usd && money.usd.saved >= 1000 ? (
                  <>
                    <p
                      className="tabular-nums text-[length:var(--text-h3)] text-dune-teal"
                      style={{ fontVariationSettings: '"wght" 700' }}
                    >
                      {usd0(money.usd.saved)}
                    </p>
                    <p className="caption mt-1">
                      {aed0(money.usd.saved)} a year,{" "}
                      {(money.usd.addressableShare * 100).toFixed(1)}% of the loss
                    </p>
                  </>
                ) : (
                  // A stated absence, not a sentence in the slot where the
                  // figure belongs. The reason is one tap away.
                  <>
                    <p className="text-[length:var(--text-h3)] italic text-muted-foreground">
                      under $1,000
                    </p>
                    <Note label="Why" className="mt-2">
                      {"Almost all of the dust reaching this site was raised hundreds of kilometres away, which treating the ground here does not change."}
                    </Note>
                  </>
                )}
              </div>
            </div>

            {/* The scale of the loss, in units the two figures do not carry.
                No sentence here: the figures above already say the rest. */}
            {money.usd && (
              <div>
                <p className="caption">
                  {(money.usd.shareOfRevenue * 100).toFixed(1)}% of what the plant earns
                  {"  ·  "}
                  {plural(money.usd.daysLost, "day")} of output
                </p>
                <Note label="What these two mean" className="mt-2">
                  {"The first is the share of a year's income the dust takes. The second is the same loss written as time. If the plant ran at full output and then stopped, this is how many days would be missing by the end of the year. Both come from the nameplate capacity and the capacity factor, so a site with neither published shows nothing here."}
                </Note>
              </div>
            )}

            {money.usd && (
              <Note label="Why treatment reaches so little of it">
                {"Dune sand is about 0.13 percent fine material, so stabilising it removes very little of what soils glass. What treatment does address is the sand that piles against rows and access roads and abrades the panels, which the model above sizes and which nobody has published a cost for."}
              </Note>
            )}

            {/* The two inputs that move the answer most. */}
            <div className="space-y-4 pt-2">
              <div>
                <p className="caption mb-2">What a lost kilowatt-hour is worth</p>
                <div className="flex flex-wrap gap-2">
                  {(["ppa", "retail"] as PriceBasis[]).map((b) => (
                    <button
                      key={b}
                      {...hl}
                      onClick={() => setPriceBasis(b)}
                      className={`rounded-[4px] border px-2 py-1 text-[length:var(--text-micro)] plate-interactive ${
                        priceBasis === b
                          ? "border-dune-orange/60 text-dune-orange"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {b === "ppa" ? "The plant sells it" : "The site would have bought it"}
                    </button>
                  ))}
                </div>
                <p className="caption mt-2">
                  <GlossaryText max={2}>
                    {`${money.price.label}, ${money.price.value.toFixed(4)} USD/kWh. ${money.price.source}`}
                  </GlossaryText>
                </p>
                {!money.price.exact && (
                  <p className="mt-1 text-[length:var(--text-micro)] text-dune-rose">
                    Read as a range. This plant has no published price.
                  </p>
                )}
                <Note label="Why this choice changes the answer" className="mt-2">
                  {"A large solar plant signs a contract before it is built, agreeing to sell its electricity at one fixed price for the next 20 or 25 years. That price is the PPA. In Dubai it is around a tenth of what an industrial customer pays on a bill. So the same lost unit of electricity is worth roughly ten times more to a factory that has to buy it than to the plant that would have sold it. Neither price is wrong. They answer different questions, and the page cannot answer both at once, so it asks which one you mean."}
                </Note>
              </div>
              <Slider
                label="Dust that sticks to tilted glass"
                value={retention}
                onChange={setRetention}
                min={0.05}
                max={1}
                step={0.05}
                unit=""
                isLightMode={isLightMode}
                note="We have no published value for this, so it is a dial rather than a measurement. Every figure above scales with it."
              />
            </div>

            {money.usd?.outOfRange && (
              <p className="text-[length:var(--text-micro)] text-dune-rose">
                The deposit is outside the range the light-loss curve was measured over, so
                this figure is extrapolated. Read it as a size, not a number.
              </p>
            )}
          </div>
        )}
      </Fold>
          </div>
        </div>
      </section>

      {/* Last, and not folded away behind the sources toggle. A reader who has
          just been shown a number in dollars should be able to keep scrolling
          and find out how far we have actually checked it. */}
      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">How well it is tested</p>
          <div>
            <WindValidation doc={validation} isLightMode={isLightMode} />
          </div>
        </div>
      </section>

      {/* Mounted here so the bookmark appears only on this module. */}
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
