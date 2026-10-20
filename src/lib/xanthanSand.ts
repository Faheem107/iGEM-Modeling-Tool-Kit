/**
 * Xanthan Gum on Sand, Measured
 * =============================
 * Our wet lab's own measurement, not model output. Sand in petri dishes was treated with xanthan
 * solution and no cells, left to dry, blown for 5 seconds by a hairdryer on its cold setting, and
 * weighed before and after. Values are copied as recorded in the team's Benchling notebook
 * ("Testing Sand Strength", 8, 11 and 14 October 2026), so each can be checked against it.
 *
 * The wiki's Model pages read the same numbers (model-wiki src/pages/model/wetlab.ts). Change both
 * together.
 */

/** One dish: xanthan concentration of the solution (% w/w) and grams of sand lost. */
export type CarrierDish = readonly [concentration: number, massLost: number];

/**
 * The notebook's 14 October table repeats the 8 October values as the first of two dishes for 0.05
 * to 0.5 percent and for the control. They are kept under the day they were measured.
 */
export const CARRIER_RUNS = {
  /** Untreated sand, blown on 8 October. The only control. */
  bare: [6.66, 14.212],
  oct8: [
    [0.05, 0.448],
    [0.1, 0.065],
    [0.25, 0.03],
    [0.5, 0.04],
  ],
  oct11: [
    [0.005, 21.336],
    [0.01, 71.14],
    [0.02, 0.164],
  ],
  oct14: [
    [0.005, 0.196],
    [0.005, 0.177],
    [0.01, 0.106],
    [0.01, 0.038],
    [0.02, 0.037],
    [0.02, 0.042],
    [0.025, 0.236],
    [0.025, 0.133],
    [0.05, 0.116],
    [0.1, 0.016],
    [0.25, 0.075],
    [0.5, 0.028],
  ],
} as const satisfies Record<string, readonly number[] | readonly CarrierDish[]>;

export const CARRIER_CONCENTRATIONS = [0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.25, 0.5] as const;

/** Blow time per dish, seconds. */
export const CARRIER_BLOW_SECONDS = 5;

/**
 * Wind speed of the hairdryer at the dish, m/s, as the wet lab measured it. It is a near-surface jet
 * speed, not a 10 m wind, so it does not go into the aeolian module's equations.
 */
export const CARRIER_TEST_WIND: number | null = 8;

/** Every dish from one run at one concentration, as recorded, or null if that run did not test it. */
export function dishesAt(run: readonly CarrierDish[], concentration: number): number[] | null {
  const masses = run.filter(([c]) => c === concentration).map(([, mass]) => mass);
  return masses.length ? masses : null;
}

/** Largest loss from any treated dish in one run. */
export const maxLoss = (run: readonly CarrierDish[]) => Math.max(...run.map(([, mass]) => mass));
