"use client";

import { useEffect, useState } from "react";
import CompactModal from "@/src/components/CompactModal";
import { StatCard } from "@/src/components/simulation/_shared";
import { GlossaryText } from "@/src/components/GlossaryTerm";

/**
 * What the wind model has been tested against, and what those tests found.
 *
 * Every number is read from the test output, so a figure here and a figure in a
 * test's result cannot disagree. The verdicts come first, because "two of them
 * failed" is not a claim a reader can do anything with until they know which
 * two, and what the test would have had to do to pass.
 *
 * Each verdict below matches the pass mark written into its verify_* script
 * before the numbers arrived. Do not soften one without changing the script.
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
    <GlossaryText max={6}>{children}</GlossaryText>
  </p>
);

/**
 * One test's verdict. The word sits in the rail, the way an index or a unit
 * does everywhere else on the site, so the four read down the page as a column
 * rather than as four badges.
 */
function Verdict({
  outcome,
  title,
  children,
}: {
  outcome: "passed" | "failed" | "no verdict";
  title: string;
  children: string;
}) {
  const tone =
    outcome === "failed"
      ? "text-dune-rose"
      : outcome === "passed"
        ? "text-dune-teal"
        : "text-muted-foreground";
  return (
    <li className="grid grid-cols-[6.25rem_1fr] items-baseline gap-4 border-t border-border pt-3">
      <span className={`caption ${tone}`}>{outcome}</span>
      <div>
        <p className="text-foreground">{title}</p>
        <p className="mt-1 max-w-[58ch] text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
          <GlossaryText max={4}>{children}</GlossaryText>
        </p>
      </div>
    </li>
  );
}

interface Gap {
  title: string;
  body: string;
  figure?: { src: string; alt: string; caption: string; credit: string };
}

const GAPS: Gap[] = [
  {
    title: "No measured sand has been weighed",
    body: "We have never put a number we predicted next to a pile of sand somebody weighed. A field study in Kuwait measured about 20 cubic metres of sand crossing every metre of ground there each year, mostly between May and August, heading southeast. Our model gets the timing right and the direction right. Nobody has yet asked it for the amount.",
  },
  {
    title: "Nothing at the scale of one site",
    body: "The weather record we use gives one wind for every 31 km square of ground, and this page reads one square every 100 km. So every number here is an average over an area far larger than a solar plant. Passing a test on a regional average is not the same as passing one at a site, and we have only run the first kind.",
  },
  {
    title: "The dune test is set up and unmeasured",
    body: "Dunes line up with the wind that built them, so the way their ridge lines point is a record of the wind written into the ground. Our model says that direction turns by about 43 degrees across the Liwa dune belt. A turn that size either shows up in the ridges or it does not, so five crest bearings read off satellite images would settle it. The test refuses to print any result until somebody measures them.",
    figure: {
      src: "/exposure/dune-crests.jpg",
      alt: "A dune field photographed from ground level, ridge lines running across the frame.",
      caption:
        "Dune ridges, from the ground. The test needs them from above, over the Liwa belt, where a bearing can be read off the image. This photograph is neither, so it shows what a ridge line is and not what we would measure.",
      credit: "Source not yet confirmed. Replace this line before the page is published.",
    },
  },
  {
    title: "The crust strength is ours to measure",
    body: "How much cohesion the treatment adds is a dial on this page because our own lab has not measured it yet. Until it does, the difference we report is a range, not a number.",
  },
  {
    title: "The browser has not been checked against the maths",
    body: "We checked the sand equation against a slow, plodding version of itself and the two agreed. The copy running in your browser is a third piece of code, written separately, and nobody has checked it against either of them.",
  },
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
              {/* The verdicts first. "Two of them failed" is not something a
                  reader can use until they know which two. */}
              <ul className="space-y-3">
                <Verdict outcome="failed" title="Predicting a year we held back">
                  {`We built the model on 2022 and 2023, then asked it to predict 2024. In ${fluid.seasonsWithInventedTransport} of the ${fluid.seasonsTotal} seasons it said sand was moving when the wind that year never blew hard enough to move any.`}
                </Verdict>
                <Verdict outcome="passed" title="Against three airports, hour by hour">
                  {`The wind direction it gives is off by ${worstDirection.toFixed(1)} degrees at worst, measured against an anemometer at each airport. We wrote down beforehand that 20 degrees would count as a failure.`}
                </Verdict>
                <Verdict outcome="failed" title="Is the wind the shape we assume">
                  {`We describe a whole month of wind with one simple curve. In ${Math.round(fitMissShare)} of every 100 months we tested, that curve got the sand wrong by more than ${doc.weibullFit.fluxErrorTolerancePct.toFixed(0)} percent.`}
                </Verdict>
                <Verdict outcome="no verdict" title="Which number to distrust first">
                  {"This one ranks the inputs by how badly each hurts the answer when it is wrong. There is nothing in it to pass or fail."}
                </Verdict>
              </ul>

              <div className="space-y-3 border-t border-border pt-4">
                <p className="max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
                  <GlossaryText max={3}>
                    {"Failed means the test missed a mark we wrote down before the numbers came in, not that we disliked the answer. Each mark lives in the script that runs the test, so it cannot be moved after the fact without changing the test."}
                  </GlossaryText>
                </p>
                <p className="max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
                  <GlossaryText max={3}>
                    {`The first test turns on how hard the wind has to blow before sand starts moving, and there are two published answers. At the lower one the model is out by about ${impact.medianErrorPct == null ? "" : pct(impact.medianErrorPct)} percent, which is usable. At the higher one, which our own grain size points to, it is out by about ${fluid.medianErrorPct == null ? "" : pct(fluid.medianErrorPct)} percent. It fails on the higher one.`}
                  </GlossaryText>
                </p>
              </div>

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
                  label="How far off the amount was"
                  value={impact.medianErrorPct == null ? null : pct(impact.medianErrorPct)}
                  unit="%"
                  accent="text-dune-orange"
                  isLightMode={isLightMode}
                  sub={`the middle season, at the ${impact.thresholdMs} m/s a field study measured`}
                  rule={false}
                />
                <StatCard
                  label="The same, at our own starting speed"
                  value={fluid.medianErrorPct == null ? null : pct(fluid.medianErrorPct)}
                  unit="%"
                  accent="text-dune-rose"
                  isLightMode={isLightMode}
                  sub={`the middle season, at the ${fluid.thresholdMs} m/s our grain size implies`}
                  rule={false}
                />
                <StatCard
                  label="Seasons it invented sand"
                  value={`${fluid.seasonsWithInventedTransport} of ${fluid.seasonsTotal}`}
                  accent="text-dune-rose"
                  isLightMode={isLightMode}
                  sub="the held-back year never blew that hard, and the model moved sand anyway"
                  rule={false}
                />
              </div>

              <Para>
                {"We built the wind model on two years of weather, then asked it to predict a third year it had never seen. Nothing was adjusted afterwards. There are two figures above because sand does not move until the wind reaches a certain speed, and there are two published answers for what that speed is."}
              </Para>

              <div className="space-y-3 border-t border-border pt-4">
                <p className="caption">Against three airports, hour by hour</p>
                <Para>
                  {"Airports are the only real instrument this model has been held up against. Each one has an anemometer on open ground and files what it reads about once an hour, going back years."}
                </Para>
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
                <p className="max-w-[62ch] leading-relaxed text-dune-rose">
                  <GlossaryText max={4}>
                    {`The model reads the wind low everywhere. Of the hours these airports actually recorded above the speed that starts sand moving, it sees only ${Math.round(Math.min(...seenLow))} to ${Math.round(Math.max(...seenLow))} percent. It is missing the tail, which is the part that carries the sand, so the figures on this page are more likely to be under than over.`}
                  </GlossaryText>
                </p>
                <Para>
                  {"Two of these airports sit inside the same ERA5 square, about 31 km across, so the model hands them the same wind and cannot tell them apart. This test ran on those squares, while the page reads one square every 100 km. So it is a gentler test than the page deserves, and nothing here is a test at the size of a single solar plant."}
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
                {"Direction comes out well and the amount does not, and there is a reason for it. Direction is an average over thousands of hours, so being wrong about single hours cancels out. The amount of sand is not an average of anything. Double the wind and you get roughly eight times the sand, so nearly all of a season moves in its windiest few hours, and being wrong about those cancels against nothing. Four percent out at the strong end puts the sand sixty percent out."}
              </Para>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="caption">Is the wind really the shape we assume?</p>
                <p className="max-w-[62ch] leading-relaxed text-muted-foreground">
                  Out by more than {doc.weibullFit.fluxErrorTolerancePct.toFixed(0)}{" "}
                  percent in {Math.round(fitMissShare)} of every 100 months tested, across{" "}
                  {doc.weibullFit.cellMonths.toLocaleString("en-US")} of them. Worst in{" "}
                  {doc.weibullFit.worstMonths.join(", ")}, best in{" "}
                  {doc.weibullFit.bestMonths.slice().reverse().join(", ")}.
                </p>
                <Para>
                  {"We describe a whole month of wind with a curve that has only two numbers in it, called a Weibull. One curve cannot hold two kinds of weather at once, and the Gulf has two: the steady summer Shamal, and winter fronts blowing through. We expected trouble in spring and autumn, where the two overlap. We were wrong. The curve struggles in winter, and summer is the half of the year it describes well. We wrote the guess down before running the test, which is why we can say we were wrong."}
                </Para>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <p className="caption">Which number to distrust first</p>
                <Para>
                  {"The word on the right of each row says where that number came from. Literature means a published paper. Fitted to ERA5 means we worked it out from the weather record. Measured means somebody measured it. Unsourced means we picked it, and nothing has measured it yet."}
                </Para>
                <ul className="space-y-4">
                  {doc.sensitivity.map((r) => (
                    <li key={r.input} className="border-t border-border pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-foreground">
                          <GlossaryText max={1}>{r.input}</GlossaryText>
                        </p>
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
                  {"The first bar says how hard an input pushes the amount of sand. Change the input by one percent: a 1 means the answer moves one percent, an 11 means it moves eleven. That ratio is the elasticity. The second bar says how hard the same input pushes the difference the treatment makes. Wind rules the first bar and nothing rules the second, which is why the difference is a steadier claim than the amount."}
                </Para>
                <Para>
                  {"The top two entries are really one number counted twice. Wind speed, and the ratio that turns wind into the force the air puts on the ground, only ever appear multiplied together. No measurement of sand could tell them apart. If we ever fit one of them to field data, it will quietly swallow any error in the other."}
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
                {"The gaps, worst first. Every test in the other two tabs checks the wind, or checks the sand equation against its own inputs. Not one of them checks the sand against sand anybody has weighed."}
              </Para>
              <ul className="space-y-4">
                {GAPS.map((gap) => (
                  <li key={gap.title} className="border-t border-border pt-3">
                    <p className="text-foreground">{gap.title}</p>
                    <p className="mt-1 max-w-[62ch] leading-relaxed text-muted-foreground">
                      <GlossaryText max={4}>{gap.body}</GlossaryText>
                    </p>
                    {gap.figure && (
                      <figure className="mt-4">
                        <img
                          src={gap.figure.src}
                          alt={gap.figure.alt}
                          loading="lazy"
                          className="block w-full rounded-[4px]"
                        />
                        <figcaption className="mt-2 max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
                          {gap.figure.caption}
                        </figcaption>
                        <p className="mt-1 max-w-[62ch] text-[length:var(--text-micro)] leading-relaxed text-dune-rose">
                          {gap.figure.credit}
                        </p>
                      </figure>
                    )}
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
