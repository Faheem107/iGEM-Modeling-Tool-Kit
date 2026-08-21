"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wind, Radio, Layers, AlertTriangle } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { Panel, Slider, StatCard } from "@/src/components/simulation/_shared";
import ExposureMap, { type SourceFeature, type TargetSite } from "./ExposureMap";
import {
  nearFieldCaptureFraction, sandblastEfficiency, haversineKm, bearingDeg, alignment,
} from "@/src/lib/physics/dustTransport";
import { meanSaltationFlux, driftPotential, GULF_IMPACT_THRESHOLD_MS } from "@/src/lib/physics/windStats";
import { thresholdUntreated, thresholdTreated } from "@/src/lib/physics/aeolian";
import { transmittanceLossPercent } from "@/src/lib/physics/damage";
import { useHighlight, useStick } from "@/src/lib/motion/pointer";

type Mode = "seasonal" | "live";

/** Grain diameter for the Rub al Khali, Benaafi et al. Table 1, 1.460 phi. */
const GRAIN_D_M = 2 ** -1.46 / 1000;

const SEASONS = [
  { id: "DJF", label: "Dec to Feb" },
  { id: "MAM", label: "Mar to May" },
  { id: "JJA", label: "Jun to Aug" },
  { id: "SON", label: "Sep to Nov" },
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
  const [showSources, setShowSources] = useState(true);

  // Seasonal wind. NOT a climatology yet: the ERA5 fit is not built, so these are
  // explicit user inputs and the UI says so. Do not present them as data.
  const [season, setSeason] = useState<(typeof SEASONS)[number]["id"]>("MAM");
  const [windA, setWindA] = useState(7.5);
  const [windK, setWindK] = useState(2.0);
  const [windDir, setWindDir] = useState(315);
  const [clay, setClay] = useState(5);
  const [cohesion, setCohesion] = useState(0.002);
  const [patchDist, setPatchDist] = useState(20);

  const [live, setLive] = useState<{ dust: number | null; wind: number | null; dir: number | null; at: string } | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const hl = useHighlight();
  const stick = useStick();

  useEffect(() => {
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

  const visible = useMemo(() => sites.filter((s) => s.market === market), [sites, market]);

  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const site = visible.find((s) => s.id === selectedId) ?? null;

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
  const speed = mode === "live" ? (live?.wind ?? 0) : windA;
  const dirFrom = mode === "live" ? (live?.dir ?? windDir) : windDir;

  const drift = useMemo(
    () => driftPotential([{ directionFrom: dirFrom, speed, timeFraction: 1 }], GULF_IMPACT_THRESHOLD_MS),
    [dirFrom, speed],
  );

  const uStarT0 = thresholdUntreated(GRAIN_D_M);
  const uStarT = thresholdTreated(GRAIN_D_M, cohesion);
  const R = 0.03; // AEOLIAN_CALIB.uStarRatio at 10 m
  const utFree0 = uStarT0 / R;
  const utFreeT = uStarT / R;

  // Module 1 integrates over the fitted Weibull. Module 2 has one instantaneous
  // wind, so it is evaluated as a narrow distribution (large k) at that speed.
  const kEff = mode === "live" ? 12 : windK;
  const aEff = mode === "live" ? Math.max(speed, 0.01) : windA;
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
        {([["seasonal", "Seasonal forecast", Wind], ["live", "Live feed", Radio]] as const).map(
          ([id, label, Icon]) => (
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
              <Icon className="h-4 w-4" />
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
            isLightMode={isLightMode}
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="caption inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showSources}
                onChange={(e) => setShowSources(e.target.checked)}
              />
              Ginoux source polygons
            </label>
            <span className="caption text-dune-orange">natural</span>
            <span className="caption text-dune-rose">anthropogenic</span>
            <span className="caption text-dune-teal">hydrologic</span>
          </div>
          <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            Source polygons are frequency of occurrence on a 0.1 degree grid, about 11 km.
            The dashed arrow is the drift and suspension pathway, pointing back toward where
            the sand comes from. It is not the path of saltating grains, which land within
            tens of metres. Ginoux published only MAM for the Middle East, so the source
            layer does not change with the season selector.
          </p>
        </div>

        {/* controls */}
        <div className="lg:col-span-5 space-y-6">
          <Panel title="Target market" icon={Layers} isLightMode={isLightMode}>
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
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-[4px] border border-border bg-transparent px-4 py-2 text-[length:var(--text-micro)]"
              >
                {visible.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {site && (
                <p className="caption">
                  nearest mapped source {site.nearestSourceKm} km, {site.nearestSourceType}
                </p>
              )}
            </div>
          </Panel>

          {mode === "seasonal" ? (
            <Panel title="Seasonal wind" icon={Wind} isLightMode={isLightMode}>
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
              <div className="mb-4 flex items-start gap-2 rounded-[4px] border border-dune-rose/40 bg-dune-rose/5 p-4">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-dune-rose" />
                <p className="text-[length:var(--text-micro)] leading-relaxed">
                  These wind values are your inputs, not a climatology. The ERA5 monthly
                  Weibull fit is not built yet, so the season buttons label the window but do
                  not yet load different data. Nothing here should be read as measured.
                </p>
              </div>
              <Slider label="Weibull scale A" value={windA} onChange={setWindA} min={2} max={16} step={0.1} unit="m/s" isLightMode={isLightMode} />
              <Slider label="Weibull shape k" value={windK} onChange={setWindK} min={1.2} max={4} step={0.05} unit="" isLightMode={isLightMode} />
              <Slider label="Wind direction from" value={windDir} onChange={setWindDir} min={0} max={359} step={1} unit="deg" isLightMode={isLightMode} />
            </Panel>
          ) : (
            <Panel title="Live conditions" icon={Radio} isLightMode={isLightMode}>
              {liveLoading && <p className="text-[length:var(--text-micro)] text-muted-foreground">Loading the feed.</p>}
              {liveErr && (
                <p className="text-[length:var(--text-micro)] text-dune-rose">
                  The live feed is unavailable right now. {liveErr}
                </p>
              )}
              {live && !liveLoading && (
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Surface dust" value={live.dust?.toFixed(0) ?? "n/a"} unit="ug/m3" accent="text-dune-orange" isLightMode={isLightMode} />
                  <StatCard label="Wind at 10 m" value={live.wind?.toFixed(1) ?? "n/a"} unit="m/s" accent="text-dune-teal" isLightMode={isLightMode} />
                  <StatCard label="Direction from" value={live.dir?.toFixed(0) ?? "n/a"} unit="deg" accent="text-dune-teal" isLightMode={isLightMode} />
                  <StatCard label="Valid" value={live.at?.slice(5, 16).replace("T", " ") ?? "n/a"} accent="text-muted-foreground" isLightMode={isLightMode} />
                </div>
              )}
              <p className="caption mt-4">CAMS global via Open-Meteo, 0.4 deg, 3-hourly</p>
            </Panel>
          )}

          <Panel title="Surface and treatment" icon={Layers} isLightMode={isLightMode}>
            <Slider label="Soil clay content" value={clay} onChange={setClay} min={0} max={25} step={0.5} unit="%" isLightMode={isLightMode} />
            {blast.capped && (
              <p className="mb-4 text-[length:var(--text-micro)] text-dune-rose">
                Clamped at 20 percent. Chappell Eq 3 is not valid above that, and SoilGrids
                reads about 20 percent over UAE dune fields where the petrography says nearer
                two. Read the value with that in mind.
              </p>
            )}
            <Slider label="Crust cohesion from the wet lab" value={cohesion} onChange={setCohesion} min={0} max={0.01} step={0.0002} unit="N/m" isLightMode={isLightMode} />
            <p className="-mt-2 mb-4 text-[length:var(--text-micro)] text-muted-foreground">
              About {(cohesion / 1.5e-5).toFixed(0)} kPa unconfined compressive strength at
              the repo's current UCS scaling, which is itself a placeholder awaiting the
              wet lab.
            </p>
            <Slider label="Treated patch to asset" value={patchDist} onChange={setPatchDist} min={1} max={200} step={1} unit="m" isLightMode={isLightMode} />
          </Panel>
        </div>
      </div>

      {/* outputs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title="Fraction of sand reaching the site"
          isLightMode={isLightMode}
          right={<Grade grade="literature" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Near field, untreated" value={(capture * 100).toFixed(1)} unit="%" accent="text-dune-orange" isLightMode={isLightMode} sub={`saltation over ${patchDist} m`} />
            <StatCard label="Near field, treated" value={(captureTreated * 100).toFixed(1)} unit="%" accent="text-dune-teal" isLightMode={isLightMode} emphasize />
            <StatCard label="Suspension flux F" value={noTransport ? "0" : (F0 * 1e9).toFixed(2)} unit="ug/m2/s" accent="text-dune-orange" isLightMode={isLightMode} sub="regional, reaches the site" />
            <StatCard
              label="Drift alignment"
              value={align == null ? "n/a" : (align * 100).toFixed(0)}
              unit={align == null ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              sub={
                align == null
                  ? "no wind above threshold"
                  : `source bearing ${sourceBearing?.toFixed(0)} deg, drift ${drift.RDD.toFixed(0)} deg`
              }
            />
          </div>
          <p className="mt-4 text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            The near-field figure is an upper bound. It ignores repeated re-launch, which
            extends transport, and it ignores turbulence.
          </p>
        </Panel>

        <Panel
          title="What the treatment changes"
          isLightMode={isLightMode}
          right={<Grade grade="measured" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Threshold, untreated" value={uStarT0.toFixed(3)} unit="m/s" accent="text-dune-orange" isLightMode={isLightMode} />
            <StatCard label="Threshold, treated" value={uStarT.toFixed(3)} unit="m/s" accent="text-dune-teal" isLightMode={isLightMode} />
            <StatCard
              label="Saltation flux cut"
              value={noTransport ? "n/a" : (reduction * 100).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
              emphasize
              sub={noTransport ? "untreated bed already still" : undefined}
            />
            <StatCard
              label="Suspension flux cut"
              value={noTransport ? "n/a" : (F0 > 0 ? (1 - Ft / F0) * 100 : 0).toFixed(1)}
              unit={noTransport ? "" : "%"}
              accent="text-dune-teal"
              isLightMode={isLightMode}
            />
          </div>
          <p className="mt-4 text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            Cohesion is the only thing the product changes. It raises the threshold, which
            raises the lower limit of the flux integral, which drops both fluxes at once.
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
        </Panel>
      </div>

      <Panel
        title="Cost impact"
        isLightMode={isLightMode}
        right={<Grade grade={market === "solar" ? "literature" : "unsourced"} />}
      >
        {market === "solar" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Transmittance loss" value={dep.value?.toFixed(1) ?? "n/a"} unit="%" accent="text-dune-orange" isLightMode={isLightMode} sub="at 2 g/m2, 24 deg tilt" />
              <StatCard label="Site capacity" value={site?.capacityMw?.toFixed(0) ?? "n/a"} unit="MW" accent="text-muted-foreground" isLightMode={isLightMode} />
              <StatCard label="DEWA industrial" value="0.126" unit="USD/kWh" accent="text-muted-foreground" isLightMode={isLightMode} sub="retail, not PPA" />
              <StatCard label="Capacity factor" value="needs source" accent="text-dune-rose" isLightMode={isLightMode} />
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
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-dune-rose" />
            <p className="text-[length:var(--text-micro)] leading-relaxed">
              No cost coefficient exists for this market yet. The mass reaching the site is
              modelled above and is sound. What is missing is the conversion from that mass
              to money. For roads the drift rate is measured, about 20 cubic metres per metre
              width per year in Kuwait, and only the clearing cost per cubic metre is absent.
              A number is not shown here because inventing one would not survive scrutiny.
            </p>
          </div>
        )}
      </Panel>

      <p className="caption" {...stick}>
        Dust from CAMS via Open-Meteo. Sources from Ginoux et al. 2012. Sites from
        OpenStreetMap, ODbL. Wind statistics from ERA5 and the Global Wind Atlas.
      </p>
    </div>
  );
}
