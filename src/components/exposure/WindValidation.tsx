"use client";

import { useEffect, useState } from "react";
import { Fold, Note, StatCard } from "@/src/components/simulation/_shared";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import Grade, { gradeFromScript } from "./Grade";

/**
 * What the wind model has been tested against, and what those tests found.
 *
 * Every number here is read from public/data/wind_validation.json, which
 * scripts/write_wind_validation.py writes by calling the verify_* scripts
 * rather than by re-deriving anything. So a figure on this page and a figure in
 * a test's output cannot disagree, and nobody has to remember to update a
 * component when a test is re-run.
 *
 * Two of the four tests failed. They are here at the same size as the two that
 * passed, because a validation section that only reports its wins is not a
 * validation section.
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
      // The section below says so if this is missing, rather than showing
      // nothing and letting the page look better tested than it is.
      .catch(() => undefined);
  }, []);
  return doc;
}

const pct = (v: number) => `${Math.round(Math.abs(v))}`;

export default function WindValidation({
  doc,
  isLightMode,
}: {
  doc: WindValidationDoc | null;
  isLightMode: boolean;
}) {
  if (!doc) {
    return (
      <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
        The test results did not load. They live in public/data/wind_validation.json
        and are written by scripts/write_wind_validation.py.
      </p>
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
    <div className="space-y-5">
      <Fold
        className="border-t border-border pt-5"
        title="What we checked the wind against"
        lede="Four tests, three of them against data the model was never shown. Two came out worse than the tolerance we wrote down beforehand, and those are here too."
        defaultOpen
        wide
        right={<Grade grade="measured" />}
      >
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
              sub={`median, at the ${impact.thresholdMs} m/s wind measured in Kuwait`}
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

          <Note label="How the held-back test worked">
            {"We fitted the wind on 2022 and 2023 only, then asked that fit to predict 2024, and compared it against what the wind actually did hour by hour in 2024. Nothing was adjusted after seeing the answer. The result is two numbers rather than one because the answer depends on how hard the wind has to blow before sand moves, and there are two published figures for that. At the lower one, measured in Kuwait, the model is usable. At the higher one, which we calculate from our own grain size, it is not."}
          </Note>

          <Note label="Why direction and amount come out so differently">
            {"Direction is an average over thousands of hours, so errors in single hours cancel out. The amount of sand moved is not an average of anything. It goes as roughly the cube of the wind above a threshold, so a handful of the windiest hours in a season carry nearly all of it, and an error in that handful is not cancelled by anything. Across our own fit, a four percent error at the strong-wind end of the distribution becomes a sixty percent error in the sand."}
          </Note>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="caption">Against the airport records, 2022 to 2024</p>
            <ul className="space-y-2">
              {doc.stations.map((s) => (
                <li
                  key={s.station}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-t border-border pt-2"
                >
                  <div className="min-w-0">
                    <p className="text-[length:var(--text-micro)] text-foreground">
                      {s.name}
                    </p>
                    <p className="caption">
                      {s.pairedHours.toLocaleString("en-US")} paired hours, wind reads{" "}
                      {Math.abs(s.speedBiasMs).toFixed(2)} m/s{" "}
                      {s.speedBiasMs < 0 ? "low" : "high"}
                    </p>
                  </div>
                  <span
                    className="tabular-nums text-[length:var(--text-body)] text-dune-teal"
                    style={{ fontVariationSettings: '"wght" 620' }}
                  >
                    {s.directionBiasDeg > 0 ? "+" : ""}
                    {s.directionBiasDeg.toFixed(1)}°
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
              The grid reads the wind low everywhere. It sees between{" "}
              {Math.round(Math.min(...seenLow))} and {Math.round(Math.max(...seenLow))}{" "}
              percent of the hours these airports recorded above the speed that starts
              sand moving, so the sand figures on this page are more likely to be under
              than over.
            </p>
            <Note label="Two of these airports are one pixel to this model">
              {"Abu Dhabi and Dubai airports fall inside the same grid cell, about 31 km across, and are given the same wind. Nothing tested here is a test at the scale of a single solar plant."}
            </Note>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="caption">Is the wind really the shape we assume?</p>
            <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
              Out by more than {doc.weibullFit.fluxErrorTolerancePct.toFixed(0)} percent
              in {Math.round(fitMissShare)} percent of the{" "}
              {doc.weibullFit.cellMonths.toLocaleString("en-US")} cell-months tested,
              worst in {doc.weibullFit.worstMonths.join(", ")} and best in{" "}
              {doc.weibullFit.bestMonths.slice().reverse().join(", ")}.
            </p>
            <Note label="What that test was asking">
              {"We describe a month's wind with a two-number curve, a Weibull. A curve like that cannot represent two weather patterns at once, and the Gulf has two: the steady summer Shamal, and winter fronts that arrive and pass. We expected the fit to struggle in spring and autumn where the two overlap. It does not. It struggles in winter, and summer is the half of the year one curve describes well. That is the opposite of what we guessed, and it is written down here because we guessed first."}
            </Note>
          </div>
        </div>
      </Fold>

      <Fold
        className="border-t border-border pt-5"
        title="Which number to distrust first"
        lede="Nudge each input and watch how far the answer moves. Two orderings, because the amount of sand and the percentage we cut it by are not moved by the same things."
        wide
      >
        <div className="space-y-4">
          <div className="caption grid grid-cols-[1fr_5rem_5rem] gap-3">
            <span>input</span>
            <span>sand</span>
            <span>the cut</span>
          </div>
          <ul className="space-y-3">
            {doc.sensitivity.map((r) => (
              <li key={r.input} className="border-t border-border pt-3">
                <div className="grid grid-cols-[1fr_5rem_5rem] items-baseline gap-3">
                  <div className="min-w-0">
                    <p className="text-[length:var(--text-micro)] text-foreground">
                      {r.input}
                    </p>
                    <span className="mt-1 inline-block">
                      <Grade grade={gradeFromScript(r.grade)} />
                    </span>
                  </div>
                  <span className="tabular-nums caption">
                    {Math.abs(r.elasticityFlux).toFixed(1)}
                  </span>
                  <span className="tabular-nums caption">
                    {r.elasticityReduction == null
                      ? "n/a"
                      : Math.abs(r.elasticityReduction).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_5rem_5rem] items-center gap-3">
                  <span />
                  <span
                    aria-hidden
                    className="block h-[3px] bg-dune-orange"
                    style={{
                      width: `${Math.max(1, (Math.abs(r.elasticityFlux) / maxFlux) * 100)}%`,
                    }}
                  />
                  <span
                    aria-hidden
                    className="block h-[3px] bg-dune-teal"
                    style={{
                      width: `${Math.max(
                        1,
                        (Math.abs(r.elasticityReduction ?? 0) / maxCut) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Note label="How to read the two columns">
            {"The first is how hard an input moves the amount of sand: a 1 next to it means a one percent change in the input gives a one percent change in the answer, and an 11 means it gives eleven. The second is how hard the same input moves the percentage this page reports as the cut. Wind dominates the first column and nothing dominates the second, which is why the cut is a steadier claim than the amount, and why we lead with it."}
          </Note>

          <Note label="The top two are the same number twice">
            {"The typical wind speed and the ratio that turns wind at 10 metres into force on the ground enter the equation only as a product. That is not a coincidence in the numbers, it falls out of the algebra, and it means no measurement of sand could ever tell the two apart. If we later calibrate one against field data, it will quietly absorb any error in the other and we would not be able to see it happen."}
          </Note>
        </div>
      </Fold>

      <Fold
        className="border-t border-border pt-5"
        title="What has not been tested"
        lede="The gaps, in the order they matter. Every test above validates the wind, or validates the sand equation against its own inputs."
        wide
        right={<Grade grade="unsourced" />}
      >
        <ul className="space-y-4">
          {[
            [
              "No measured sand has been weighed",
              "Nothing above compares a quantity of sand we predicted against a quantity somebody collected. Khalaf and Al-Ajmi measured about 20 cubic metres per metre of width per year in Kuwait, mostly May to August, moving southeast. Our model reproduces the timing and the direction. It has never been asked to reproduce the amount, and that is the largest gap on this page.",
            ],
            [
              "Nothing at the scale of one site",
              "The wind grid is about 31 km across. A passing test on a regional average is not a passing test at a solar plant, and we have not run the second kind.",
            ],
            [
              "The dune test is set up and unmeasured",
              "The model says the direction sand drifts rotates about 43 degrees across the Liwa belt. A rotation that size either shows up in the shape of the dunes or it does not, so five crest bearings read off satellite imagery would settle it. The script refuses to print a result until somebody measures them, which is the honest way to leave a test we have not done.",
            ],
            [
              "The crust strength is ours to measure",
              "The cohesion the treatment adds is a slider on this page because our own lab has not returned a number for it yet.",
            ],
            [
              "The browser has not been checked against the maths",
              "The flux integral was verified in Python against a brute-force sum. The version that runs in your browser is a separate implementation and has not been compared against it.",
            ],
          ].map(([title, body]) => (
            <li key={title} className="border-t border-border pt-3">
              <p className="text-[length:var(--text-micro)] text-foreground">{title}</p>
              <p className="mt-1 max-w-[62ch] text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                <GlossaryText max={2}>{body}</GlossaryText>
              </p>
            </li>
          ))}
        </ul>
      </Fold>

      <p className="caption">
        {doc.record.source}. {doc.record.cells} grid cells,{" "}
        {doc.record.from.slice(0, 10)} to {doc.record.to.slice(0, 10)}. Written{" "}
        {doc.generated} by scripts/write_wind_validation.py.
      </p>
    </div>
  );
}
