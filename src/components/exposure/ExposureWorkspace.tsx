"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { CodePlotsToggle, Fold, Note, Slider, SourcesToggle, StatCard } from "@/src/components/simulation/_shared";
import WindValidation, { useWindValidation } from "./WindValidation";
import ExposureMap, { sourceColor, type SourceFeature, type TargetSite } from "./ExposureMap";
import MapLegend from "./MapLegend";
import {
  buildHotspots, singleDirectionRun, transportToSite,
  type HotspotPatch, type TransportResult,
} from "@/src/lib/physics/hotspotTransport";
import { meanSaltationFlux, cardinal, ROSE_SECTORS } from "@/src/lib/physics/windStats";
import { thresholdUntreated, thresholdTreated } from "@/src/lib/physics/aeolian";
import {
  climatologyField, toWindField, nearestCell, sampleField, toDirectionFrom,
  type Climatology, type WindField, type WindFieldResponse,
} from "@/src/lib/windField";
import { useHighlight } from "@/src/lib/motion/pointer";
import { GlossaryText } from "@/src/components/GlossaryTerm";

type Mode = "seasonal" | "live";

/**
 * Grain diameter for the Rub al Khali, Benaafi et al. Table 1, 1.460 phi. Used
 * until public/data/uae_parameters.json loads, which carries the measured value
 * with its provenance rather than a number typed into a component.
 */
const GRAIN_D_FALLBACK_M = 2 ** -1.46 / 1000;

/** u* is 3 percent of the 10 m wind over desert sand. AEOLIAN_CALIB.uStarRatio. */
const U_STAR_RATIO = 0.03;

/** Share of a hotspot's ground loose enough for wind to lift it. Assumed. */
const ERODIBLE_FRACTION = 0.05;

/** Ground a site counts as its own. We have a point per site, not an outline. */
const SITE_AREA_M2 = 1e6;

/** Days in each calendar month, for the length of a season. */
const MONTH_DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const SEASONS = [
  { id: "DJF", label: "Dec to Feb", months: [12, 1, 2] },
  { id: "MAM", label: "Mar to May", months: [3, 4, 5] },
  { id: "JJA", label: "Jun to Aug", months: [6, 7, 8] },
  { id: "SON", label: "Sep to Nov", months: [9, 10, 11] },
] as const;

/** Mass that reads as an amount rather than as a number. */
const mass = (kg: number) => {
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(1)} kt`;
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(1)} t`;
  if (kg >= 1) return kg.toFixed(1);
  return kg.toFixed(3);
};
const massUnit = (kg: number) => (kg >= 1e6 ? "" : kg >= 1e3 ? "" : "kg");

export default function ExposureWorkspace() {
  const { isLightMode } = useTheme();
  // The index links here twice, once per view, so the link has to land on the
  // view it names.
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "live" ? "live" : "seasonal",
  );

  const [sources, setSources] = useState<SourceFeature[]>([]);
  const [sites, setSites] = useState<TargetSite[]>([]);
  const [markets, setMarkets] = useState<{ id: string; label: string; note: string }[]>([]);
  const [market, setMarket] = useState("solar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(true);
  const [testsOpen, setTestsOpen] = useState(false);

  const [season, setSeason] = useState<(typeof SEASONS)[number]["id"]>("MAM");
  const [grainD, setGrainD] = useState(GRAIN_D_FALLBACK_M);
  const [clim, setClim] = useState<Climatology | null>(null);
  const [liveField, setLiveField] = useState<WindField | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Four assumptions, none of them measured for us. The two that only set the
  // scale of the answer are fixed and stated; the two that decide what the
  // product does stay as dials.
  const [treatedLog10, setTreatedLog10] = useState(3);
  const [cohesion, setCohesion] = useState(0.002);

  const hl = useHighlight();
  const validation = useWindValidation();

  useEffect(() => {
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
      .catch(() => undefined);   // the panel says so if it is missing

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

  // The live grid is site-independent, so it is fetched per mode rather than
  // per site. Our route caches it for an hour; see app/api/wind-field.
  useEffect(() => {
    if (mode !== "live") return;
    const ac = new AbortController();
    setLiveLoading(true);
    setLiveErr(null);
    fetch("/api/wind-field", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((d: WindFieldResponse) => setLiveField(toWindField(d)))
      .catch((e) => { if (e.name !== "AbortError") setLiveErr(e.message); })
      .finally(() => setLiveLoading(false));
    return () => ac.abort();
  }, [mode]);

  const visible = useMemo(
    () => sites.filter((s) => s.market === market),
    [sites, market],
  );

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
  const seasonDef = SEASONS.find((x) => x.id === season) ?? SEASONS[1];

  const hotspots: HotspotPatch[] = useMemo(() => buildHotspots(sources), [sources]);

  /** Wind at the selected site: the fitted season, or the live reading. */
  const siteWind = useMemo(() => {
    if (!site) return null;
    if (mode === "live") {
      if (!liveField) return null;
      const { u, v } = sampleField(liveField, site.lon, site.lat);
      const speed = Math.hypot(u, v);
      const from = toDirectionFrom(u, v);
      return {
        speed,
        from,
        windRun: singleDirectionRun(from),
        at: null as { lat: number; lon: number } | null,
      };
    }
    if (!clim) return null;
    const near = nearestCell(clim, site.lon, site.lat);
    if (!near) return null;
    const cell = clim.cells[near.key];
    let A = 0;
    let n = 0;
    const run = new Array(ROSE_SECTORS).fill(0);
    let hasRose = false;
    for (const m of seasonDef.months) {
      const mm = cell?.months?.[String(m)];
      if (!mm) continue;
      A += mm.A;
      n++;
      const r = cell.rose?.[String(m)];
      if (r) {
        hasRose = true;
        // Wind run, frequency times mean speed. Not the Fryberger drift
        // potential the sand flux uses: that is zero whenever no local hour
        // lifts a grain, and dust already in the air needs no threshold to
        // arrive.
        for (let i = 0; i < ROSE_SECTORS; i++) run[i] += r[0][i] * r[1][i];
      }
    }
    if (!n) return null;
    return {
      speed: A / n,
      from: null as number | null,
      windRun: hasRose ? run : null,
      at: { lat: near.lat, lon: near.lon },
    };
  }, [mode, site, clim, liveField, seasonDef]);

  /**
   * Sand flux at a hotspot for a given threshold wind.
   *
   * Seasonal integrates the flux month by month over that month's own fitted
   * distribution and averages the results. Averaging A and k first and
   * integrating once smears a windy month into two calm ones before the cubing
   * that matters, and the held-out year showed it costs accuracy.
   *
   * Live has one wind, so it is evaluated as a narrow distribution at that
   * speed instead.
   */
  const fluxAt = useMemo(() => {
    const cache = new Map<string, number>();
    return (lat: number, lon: number, ut: number): number => {
      const key = `${lat.toFixed(2)},${lon.toFixed(2)},${ut.toFixed(4)}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;

      let value = 0;
      if (mode === "live") {
        if (liveField) {
          const { u, v } = sampleField(liveField, lon, lat);
          const speed = Math.hypot(u, v);
          value = meanSaltationFlux({ A: Math.max(speed, 0.01), k: 12, uThreshold: ut });
        }
      } else if (clim) {
        const near = nearestCell(clim, lon, lat);
        const cell = near ? clim.cells[near.key] : null;
        if (cell) {
          let sum = 0;
          let n = 0;
          for (const m of seasonDef.months) {
            const mm = cell.months?.[String(m)];
            if (!mm) continue;
            sum += meanSaltationFlux({ A: mm.A, k: mm.k, uThreshold: ut });
            n++;
          }
          value = n ? sum / n : 0;
        }
      }
      cache.set(key, value);
      return value;
    };
  }, [mode, clim, liveField, seasonDef]);

  const uStarT0 = thresholdUntreated(grainD);
  const uStarT = thresholdTreated(grainD, cohesion);
  const utFree0 = uStarT0 / U_STAR_RATIO;
  const utFreeT = uStarT / U_STAR_RATIO;

  const windowSeconds =
    mode === "live"
      ? 3600
      : seasonDef.months.reduce((t, m) => t + MONTH_DAYS[m - 1], 0) * 86400;

  const treatedAreaKm2 = 10 ** treatedLog10;

  const result: TransportResult | null = useMemo(() => {
    if (!site || !siteWind || !hotspots.length) return null;
    return transportToSite({
      hotspots,
      siteLat: site.lat,
      siteLon: site.lon,
      flux: fluxAt,
      windRun: siteWind.windRun,
      transportWind: siteWind.speed,
      windowSeconds,
      erodibleFraction: ERODIBLE_FRACTION,
      siteAreaM2: SITE_AREA_M2,
      utFreeUntreated: utFree0,
      utFreeTreated: utFreeT,
      treatedAreaM2: treatedAreaKm2 * 1e6,
    });
  }, [site, siteWind, hotspots, fluxAt, windowSeconds, utFree0, utFreeT, treatedAreaKm2]);

  const windField = useMemo(() => {
    if (mode === "live") return liveField;
    return clim ? climatologyField(clim, seasonDef.months) : null;
  }, [mode, liveField, clim, seasonDef.months]);

  const per = mode === "live" ? "an hour" : seasonDef.label;
  const noWind = mode === "live" && !liveField;

  return (
    <div className="space-y-6">
      {/* mode switch */}
      <div className="flex flex-wrap items-center gap-2">
        {([["seasonal", "Seasonal average"], ["live", "Live now"]] as const).map(
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
          {mode === "seasonal"
            ? "Averaged over three months"
            : "The wind blowing right now, updated hourly"}
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
            showSources={showSources}
            windField={windField}
            isLightMode={isLightMode}
          />

          {mode === "seasonal" && (
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
          )}

          {mode === "live" && liveLoading && (
            <p className="text-[length:var(--text-micro)] text-muted-foreground">
              Loading the wind feed.
            </p>
          )}
          {mode === "live" && liveErr && (
            <p className="text-[length:var(--text-micro)] text-dune-rose">
              The live wind feed is not answering, so there is nothing to compute
              from.
            </p>
          )}

          <MapLegend
            showSources={showSources}
            onToggleSources={setShowSources}
            isLightMode={isLightMode}
            windLabel={
              mode === "live"
                ? "The wind blowing right now"
                : `The average wind across ${seasonDef.label}`
            }
          />
        </div>

        {/* controls */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border-t border-border pt-5">
            <p className="caption mb-3">Target market</p>
            <div className="space-y-3">
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                aria-label="Target market"
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Site"
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              >
                {grouped.map(([emirate, list]) => (
                  <optgroup key={emirate} label={emirate}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="caption">
                {visible.length} sites
                {mode === "live" && siteWind
                  ? ` · ${siteWind.speed.toFixed(1)} m/s here now, from ${siteWind.from?.toFixed(0)}°`
                  : ""}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="caption mb-3">What we assume</p>
            <div className="space-y-5">
              <Slider
                label="Hotspot ground we treat"
                value={treatedLog10}
                onChange={setTreatedLog10}
                min={0}
                max={4.7}
                step={0.1}
                unit="km²"
                format={(v) => (10 ** v).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                isLightMode={isLightMode}
                hint="We treat the hotspots that send this site the most, worst first."
              />
              <Slider
                label="Strength the crust adds"
                value={cohesion}
                onChange={setCohesion}
                min={0}
                max={0.01}
                step={0.0002}
                unit="N m⁻¹"
                isLightMode={isLightMode}
                hint={`How much cohesion the crust adds. Our lab has not measured it yet, so try a range. Bare sand starts moving at about ${utFree0.toFixed(1)} m/s. Treated, it holds until about ${utFreeT.toFixed(1)} m/s.`}
              />
              <p className="text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                <GlossaryText max={1}>
                  {"Two more are fixed. A twentieth of each hotspot is loose enough to blow away, and a site catches whatever falls on one square kilometre around it."}
                </GlossaryText>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Each answer under its own heading, opened by a click. The rail keeps
          the window the numbers belong to, so the heading does not have to. */}
      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">{mode === "live" ? "right now" : seasonDef.label}</p>
          <Fold
            title="How much sand reaches this site?"
            lede="Wind lifts material at every hotspot and carries it downwind. Only the fine part, the dust in suspension, travels far enough to land here."
            defaultOpen
            wide
          >
            {noWind ? (
              <p className="text-[length:var(--text-micro)] text-dune-rose">
                Data pending. The live wind feed has not answered, so there is
                nothing to compute from.
              </p>
            ) : !result ? (
              <p className="text-[length:var(--text-micro)] text-muted-foreground">
                Pick a site to run the model.
              </p>
            ) : result.landedKg <= 0 ? (
              <p className="max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed">
                <GlossaryText max={2}>
                  {mode === "live"
                    ? `Nothing is arriving. The wind here is ${siteWind?.speed.toFixed(1)} m/s, and it takes about ${utFree0.toFixed(1)} m/s to lift sand off bare ground. Nothing is moving, so there is nothing for the treatment to reduce.`
                    : `Nothing is arriving. Across ${seasonDef.label} the wind at the hotspots upwind of this site stays under the ${utFree0.toFixed(1)} m/s it takes to lift sand off bare ground. Nothing is moving, so there is nothing for the treatment to reduce.`}
                </GlossaryText>
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <StatCard
                    label="Lands here now"
                    value={mass(result.landedKg)}
                    unit={massUnit(result.landedKg)}
                    accent="text-dune-orange"
                    isLightMode={isLightMode}
                    sub={`${result.depositGm2.toFixed(3)} g per square metre, over ${per}`}
                    rule={false}
                  />
                  <StatCard
                    label="Lands here if we treat"
                    value={mass(result.treatedLandedKg)}
                    unit={massUnit(result.treatedLandedKg)}
                    accent="text-dune-teal"
                    isLightMode={isLightMode}
                    sub={`with ${treatedAreaKm2.toLocaleString("en-US", { maximumFractionDigits: 0 })} km² of hotspot treated`}
                    rule={false}
                  />
                  <StatCard
                    label="The difference"
                    value={
                      result.reduction == null ? "n/a" : (result.reduction * 100).toFixed(1)
                    }
                    unit={result.reduction == null ? "" : "%"}
                    accent="text-dune-teal"
                    isLightMode={isLightMode}
                    emphasize
                    sub="less sand arriving"
                    rule={false}
                  />
                </div>

                <p className="max-w-[62ch] text-[length:var(--text-micro)] leading-snug text-muted-foreground">
                  <GlossaryText max={2}>
                    {`The hotspots upwind of this site cover ${Math.round(result.hotspotAreaM2 / 1e6).toLocaleString("en-US")} km² between them. Out of every million kilograms they lose to the wind, ${(result.landingFraction * 1e6).toFixed(2)} kg ends up here.`}
                  </GlossaryText>
                </p>

                <p className="max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
                  <GlossaryText max={2}>
                    {"Trust the split and the difference more than the kilograms. Our wind data averages each hour across a grid cell about 100 km wide, so it misses the gusts that lift most of the sand. The real amount is higher than this."}
                  </GlossaryText>
                </p>

                <Note label="What would make this wrong">
                  {"Dust already in the air blows past whatever we do to the ground under it, and this model does not follow it. We also send the wind straight from a hotspot to the site, when real air bends around the Gulf. And the sand that piles against a fence gets there by saltation, hopping a few metres at a time, so it comes from the ground next to the fence and not from any hotspot on this map."}
                </Note>
              </div>
            )}
          </Fold>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">{mode === "live" ? "right now" : seasonDef.label}</p>
          <Fold
            title="Where does that sand come from?"
            lede="Each hotspot region, ranked by how much of what lands here came from it."
            wide
          >
            {!result || result.shares.length === 0 ? (
              <p className="text-[length:var(--text-micro)] text-muted-foreground">
                {noWind
                  ? "Data pending. The live wind feed has not answered."
                  : result
                    ? "Nothing is arriving, so there is nothing to break down."
                    : "Pick a site to see its breakdown."}
              </p>
            ) : (
              <ul className="space-y-3">
                {result.shares.map((sh) => (
                  <li key={sh.region} className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                    <div className="min-w-0">
                      <p className="text-[length:var(--text-micro)] text-foreground">
                        <GlossaryText max={1}>{sh.region}</GlossaryText>
                      </p>
                      <p className="caption">
                        {sh.distanceKm.toFixed(0)} km away, arrives from the{" "}
                        {cardinal((sh.bearingDeg + 180) % 360)}
                        {sh.treatedShare > 0.001
                          ? `, ${(sh.treatedShare * 100).toFixed(0)}% treated`
                          : ""}
                      </p>
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
            )}
          </Fold>
        </div>
      </section>

      {/* The working, the code and the references. One row, one click each. */}
      <div className="grid grid-cols-1 items-stretch gap-2 border-t border-border pt-6 sm:grid-cols-3">
        <button
          type="button"
          {...hl}
          onClick={() => setTestsOpen(true)}
          className="caption flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-[4px] border border-border px-2 py-4 transition-colors hover:border-dune-orange hover:text-dune-orange"
        >
          <span className="text-center leading-tight">How well is this tested</span>
        </button>
        <CodePlotsToggle moduleId="exposure" isLightMode={isLightMode} />
        <SourcesToggle moduleId="exposure" isLightMode={isLightMode} />
      </div>

      <WindValidation
        doc={validation}
        open={testsOpen}
        onClose={() => setTestsOpen(false)}
        isLightMode={isLightMode}
      />
    </div>
  );
}
