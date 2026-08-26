"use client";

import { useEffect, useState } from "react";
import CompactModal from "@/src/components/CompactModal";
import { StatCard } from "@/src/components/simulation/_shared";
import { GlossaryText } from "@/src/components/GlossaryTerm";

/**
 * What the wind model has been tested against, and what those tests found.
 *
 * A dialog rather than three sections down the page. The page itself is the
 * answer; this is the working, and a reader who wants it asks for it. Every
 * number is read from the test output, so a figure here and a figure in a
 * test's result cannot disagree.
 *
 * Two of the four tests failed. They are in here at the same size as the two
 * that passed, because a report that only carries its wins is not a report.
 */

type Threshold = {
  thresholdMs: number;
  medianErrorPct: number | null;
  worstErrorPct: number | null;
  seasonsScored: number;
  seasonsTotal: number;
  seasonsWithInventedTransport: number;
  monthlyMeanBetter: number;
  monthlyMeanPaired: number;
  seasonGapSwamped: number;
  seasonGapChecked: number;
};

export type WindValidationDoc = {
  generated: string;
  record: { cells: number; from: string; to: string; source: string };
  heldOutYear: { fluid: Threshold; impact: Threshold };
  weibullFit: {
    cellMonths: number;
    ksMedian: number;
    fluxErrorMedianPct: number;
    fluxErrorTolerancePct: number;
    fluxOutsideTolerance: number;
    fluxScored: number;
    worstMonths: string[];
    bestMonths: string[];
  };
  stations: {
    station: string;
    name: string;
    pairedHours: number;
    speedBiasMs: number;
    rmseMs: number;
    correlation: number;
    directionBiasDeg: number;
    aboveThresholdObservedPct: number;
    aboveThresholdEra5Pct: number;
  }[];
  sensitivity: {
    input: string;
    grade: string;
    elasticityFlux: number;
    elasticityReduction: number | null;
  }[];
  duneOrientation: { status: string; note: string };
};

/** Load once. Same shape as every other dataset on the page. */
export function useWindValidation() {
  const [doc, setDoc] = useState<WindValidationDoc | null>(null);
  useEffect(() => {
    fetch("/data/wind_validation.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDoc)
      // The dialog says so if this is missing, rather than showing nothing and
      // letting the page look better tested than it is.
      .catch(() => undefined);
  }, []);
  return doc;
}

const pct = (v: number) => `${Math.round(Math.abs(v))}`;

const Para = ({ children }: { children: string }) => (
  <p className="max-w-[62ch] leading-relaxed text-muted-foreground">
    <GlossaryText max={2}>{children}</GlossaryText>
  </p>
);

const GAPS: [string, string][] = [
  [
    "No measured sand has been weighed",
    "Nothing here compares a quantity of sand we predicted against a quantity somebody collected. A field study in Kuwait measured about 20 cubic metres per metre of width per year, mostly May to August, moving southeast. Our model reproduces the timing and the direction. It has never been asked to reproduce the amount, and that is the largest gap.",
  ],
  [
    "Nothing at the scale of one site",
    "The wind grid is about 31 km across. A passing test on a regional average is not a passing test at a solar plant, and we have not run the second kind.",
  ],
  [
    "The dune test is set up and unmeasured",
    "The model says the direction sand drifts rotates about 43 degrees across the Liwa belt. A rotation that size either shows up in the shape of the dunes or it does not, so five crest bearings read off satellite imagery would settle it. The test refuses to print a result until somebody measures them, which is the honest way to leave a test we have not done.",
  ],
  [
    "The crust strength is ours to measure",
    "How much strength the treatment adds is a dial on this page because our own lab has not returned a number for it yet.",
  ],
  [
    "The browser has not been checked against the maths",
    "The sand equation was verified against a brute-force sum. The version that runs in your browser is a separate implementation and has not been compared against it.",
  ],
];

export default function WindValidation({
  doc,
  open,
  onClose,
  isLightMode,
}: {
  doc: WindValidationDoc | null;
  open: boolean;
  onClose: () => void;
  isLightMode: boolean;
}) {
  if (!doc) {
    return (
      <CompactModal
        open={open}
        onClose={onClose}
        title="How well is this tested"
        widthClass="max-w-xl"
        tabs={[
          {
            id: "none",
            label: "",
            body: (
              <p className="text-muted-foreground">
                The test results did not load, so this is empty rather than
                reassuring.
              </p>
            ),
          },
        ]}
      />
    );
  }

  const { impact, fluid } = doc.heldOutYear;
  const worstDirection = doc.stations.reduce(
    (a, s) => Math.max(a, Math.abs(s.directionBiasDeg)),
    0,
  );
  const totalHours = doc.stations.reduce((a, s) => a + s.pairedHours, 0);
  const seenLow = doc.stations.map(
    (s) => (s.aboveThresholdEra5Pct / s.aboveThresholdObservedPct) * 100,
  );
  const fitMissShare =
    (doc.weibullFit.fluxOutsideTolerance / doc.weibullFit.fluxScored) * 100;

  const maxFlux = Math.max(...doc.sensitivity.map((r) => Math.abs(r.elasticityFlux)));
  const maxCut = Math.max(
    ...doc.sensitivity.map((r) => Math.abs(r.elasticityReduction ?? 0)),
  );

  return (
    <CompactModal
      open={open}
      onClose={onClose}
      eyebrow="Four tests, two of them failed"
      title="How well is this tested"
      widthClass="max-w-2xl"
      bodyHeightClass="max-h-[60vh]"
      tabs={[
        {
          id: "checked",
          label: "What we checked",
          body: (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Worst direction error"
                  value={worstDirection.toFixed(1)}
                  unit="°"
                  accent="text-dune-teal"
                  isLightMode={isLightMode}
                  emphasize
                  sub={`across three airports and ${Math.round(totalHours / 1000)},000 paired hours`}
                  rule={false}
                />
                <StatCard
                  label="Amount error, year held back"
                  value={impact.medianErrorPct == null ? null : pct(impact.medianErrorPct)}
                  unit="%"
                  accent="text-dune-orange"
                  isLightMode={isLightMode}
                  sub={`median, at the ${impact.thresholdMs} m/s a field study measured`}
                  rule={false}
                />
                <StatCard
                  label="The same, at our own threshold"
                  value={fluid.medianErrorPct == null ? null : pct(fluid.medianErrorPct)}
                  unit="%"
                  accent="text-dune-rose"
                  isLightMode={isLightMode}
                  sub={`median, at the ${fluid.thresholdMs} m/s our grain size implies`}
                  rule={false}
                />
                <StatCard
                  label="Seasons it invented sand"
                  value={`${fluid.seasonsWithInventedTransport} of ${fluid.seasonsTotal}`}
                  accent="text-dune-rose"
                  isLightMode={isLightMode}
                  sub="the year held back never blew that hard, the model moved sand anyway"
                  rule={false}
                />
              </div>

              <Para>
                {"We fitted the wind on two years, then asked that fit to predict a third year it had never seen, and compared it hour by hour against what the wind actually did. Nothing was adjusted after seeing the answer. There are two figures rather than one because the answer depends on how hard the wind has to blow before sand moves, and there are two published values for that. At the lower one the model is usable. At the higher one, which we calculate from our own grain size, it is not."}
              </Para>

              <div className="space-y-3 border-t border-border pt-4">
                <p className="caption">Against three airport records, hour by hour</p>
                <ul className="space-y-2">
                  {doc.stations.map((s) => (
                    <li
                      key={s.station}
                      className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-t border-border pt-2"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground">{s.name}</p>
                        <p className="caption">
                          {s.pairedHours.toLocaleString("en-US")} paired hours, wind reads{" "}
                          {Math.abs(s.speedBiasMs).toFixed(2)} m/s{" "}
                          {s.speedBiasMs < 0 ? "low" : "high"}
                        </p>
                      </div>
                      <span
                        className="tabular-nums text-dune-teal"
                        style={{ fontVariationSettings: '"wght" 620' }}
                      >
                        {s.directionBiasDeg > 0 ? "+" : ""}
                        {s.directionBiasDeg.toFixed(1)}°
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="leading-relaxed text-dune-rose">
                  The grid reads the wind low everywhere. It sees between{" "}
                  {Math.round(Math.min(...seenLow))} and{" "}
                  {Math.round(Math.max(...seenLow))} percent of the hours these airports
                  recorded above the speed that starts sand moving, so the sand figures
                  on this page are more likely to be under than over.
                </p>
                <Para>
                  {"Two of these airports fall inside the same grid square, about 31 km across, and are given the same wind. Nothing tested here is a test at the scale of a single solar plant."}
                </Para>
              </div>
            </div>
          ),
        },
        {
          id: "weak",
          label: "Where it is weak",
          body: (
            <div className="space-y-5">
              <Para>
                {"Direction is an average over thousands of hours, so errors in single hours cancel out. The amount of sand moved is not an average of anything. It goes as roughly the cube of the wind above a threshold, so a handful of the windiest hours in a season carry nearly all of it, and an error in that handful is cancelled by nothing. A four percent error at the strong-wind end becomes a sixty percent error in the sand."}
              </Para>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="caption">Is the wind really the shape we assume?</p>
                <p className="leading-relaxed text-muted-foreground">
                  Out by more than {doc.weibullFit.fluxErrorTolerancePct.toFixed(0)}{" "}
                  percent in {Math.round(fitMissShare)} percent of the{" "}
                  {doc.weibullFit.cellMonths.toLocaleString("en-US")} cell-months tested,
                  worst in {doc.weibullFit.worstMonths.join(", ")} and best in{" "}
                  {doc.weibullFit.bestMonths.slice().reverse().join(", ")}.
                </p>
                <Para>
                  {"We describe a month's wind with a two-number curve. A curve like that cannot represent two weather patterns at once, and the Gulf has two: the steady summer Shamal, and winter fronts that arrive and pass. We expected the fit to struggle in spring and autumn where the two overlap. It does not. It struggles in winter, and summer is the half of the year one curve describes well. That is the opposite of what we guessed, and it is written down because we guessed first."}
                </Para>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <p className="caption">Which number to distrust first</p>
                <ul className="space-y-4">
                  {doc.sensitivity.map((r) => (
                    <li key={r.input} className="border-t border-border pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-foreground">{r.input}</p>
                        <span className="caption">{r.grade}</span>
                      </div>
                      {/* Two bars, each on its own row with the quantity named
                          at the leading edge. The bar is the number drawn, so
                          it is a plain rule at the colour that quantity carries
                          elsewhere, not a filled track. */}
                      <div className="mt-2 space-y-1">
                        {(
                          [
                            ["sand", Math.abs(r.elasticityFlux), maxFlux,
                             "bg-dune-orange", Math.abs(r.elasticityFlux).toFixed(1)],
                            ["the cut", Math.abs(r.elasticityReduction ?? 0), maxCut,
                             "bg-dune-teal",
                             r.elasticityReduction == null
                               ? "n/a"
                               : Math.abs(r.elasticityReduction).toFixed(2)],
                          ] as const
                        ).map(([name, value, max, tone, shown]) => (
                          <div
                            key={name}
                            className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3"
                          >
                            <span className="caption">{name}</span>
                            <span className="block h-[3px] bg-border">
                              <span
                                aria-hidden
                                className={`block h-[3px] ${tone}`}
                                style={{ width: `${Math.max(0.5, (value / max) * 100)}%` }}
                              />
                            </span>
                            <span className="caption tabular-nums text-right">{shown}</span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <Para>
                  {"The first bar is how hard an input moves the amount of sand: a 1 means a one percent change in the input gives a one percent change in the answer, and an 11 means it gives eleven. The second is how hard the same input moves the percentage this page reports as the cut. Wind dominates the first and nothing dominates the second, which is why the cut is a steadier claim than the amount."}
                </Para>
                <Para>
                  {"The top two are the same number twice. The typical wind speed and the ratio that turns wind at 10 metres into force on the ground enter the equation only as a product, so no measurement of sand could ever tell them apart. If we later calibrate one against field data, it will quietly absorb any error in the other."}
                </Para>
              </div>
            </div>
          ),
        },
        {
          id: "gaps",
          label: "Not tested",
          body: (
            <div className="space-y-4">
              <Para>
                {"The gaps, in the order they matter. Every test in the other two tabs checks the wind, or checks the sand equation against its own inputs."}
              </Para>
              <ul className="space-y-4">
                {GAPS.map(([title, body]) => (
                  <li key={title} className="border-t border-border pt-3">
                    <p className="text-foreground">{title}</p>
                    <p className="mt-1 max-w-[62ch] leading-relaxed text-muted-foreground">
                      <GlossaryText max={2}>{body}</GlossaryText>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ),
        },
      ]}
    />
  );
}
