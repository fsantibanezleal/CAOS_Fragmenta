/**
 * The live lane: the closed-form arms, recomputed in the browser.
 *
 * This is what makes the App a workbench rather than a replay viewer. A reader changes a burden and
 * the curve moves, because the same equations the offline bake ran are here too.
 *
 * **Parity is a gate, not a hope.** `test/parity.test.ts` scores every function here against the
 * numbers the Python engine baked into the committed artifacts and fails the build on a divergence
 * beyond a tight tolerance. Two implementations of one equation drift the moment nobody checks, and
 * the symptom is a chart that is subtly wrong and entirely plausible.
 *
 * Every equation below is transcribed from the same primary sources the Python engine cites, so
 * this file is a second implementation rather than a port. Where the sources disagree, the choice
 * made here is the one the Python side documents.
 */

export interface LivePattern {
  burdenM: number;
  spacingM: number;
  benchHeightM: number;
  stemmingM: number;
  holeDiameterMm: number;
  powderFactor: number;
  subdrillM?: number;
  drillDeviationM?: number;
  staggered?: boolean;
  /** Weight strength relative to ANFO. The whole published corpus used ANFO, so 100. */
  rws?: number;
}

export interface LiveBlast {
  S_over_B: number;
  H_over_B: number;
  B_over_D: number;
  T_over_B: number;
  Pf_kg_m3: number;
  XB_m: number;
  E_GPa: number;
}

const TNT_RWS = 115;

/** Rock volume broken per hole. */
export const rockVolume = (p: LivePattern) => p.burdenM * p.spacingM * p.benchHeightM;

/** Explosive mass per hole, from the powder factor and the volume it breaks. */
export const chargeMass = (p: LivePattern) => p.powderFactor * rockVolume(p);

export const chargeLength = (p: LivePattern) =>
  Math.max(0, p.benchHeightM + (p.subdrillM ?? 0) - p.stemmingM);

/**
 * The classical mean fragment size, in metres.
 *
 *   x50 = A * (V/Q)^0.8 * Q^(1/6) * (RWS/115)^(-19/30)      [centimetres]
 *
 * Two published statements of this equation disagree on the explosive-strength exponent. The
 * `-19/30` form is used because back-solving the rock factor from the published predictions with it
 * gives a value that is near constant within each site, which the other form does not.
 */
export function kuznetsovX50M(
  pattern: LivePattern,
  rockFactor: number,
  options: { timingFactor?: number } = {},
): number {
  const volume = rockVolume(pattern);
  const charge = chargeMass(pattern);
  if (!(volume > 0) || !(charge > 0) || !(rockFactor > 0)) return NaN;
  const timing = options.timingFactor ?? 1;
  const sizeCm =
    rockFactor *
    timing *
    Math.pow(volume / charge, 0.8) *
    Math.pow(charge, 1 / 6) *
    Math.pow((pattern.rws ?? 100) / TNT_RWS, -19 / 30);
  return sizeCm / 100;
}

/**
 * The Cunningham uniformity index.
 *
 * THE UNIT TRAP: the source states the burden in METRES and the diameter in MILLIMETRES, so the
 * published `B/d` is about 0.027 for a 4.5 m burden on a 165 mm hole. It is not the dimensionless
 * burden-to-diameter ratio the corpus tabulates, which is a thousand times larger and sends this
 * term to about -380.
 *
 * The charge-distribution term needs a bottom and column charge split the corpus does not publish.
 * With one continuous column the two are equal and the term reduces to 0.1^0.1.
 */
export function uniformityIndex(pattern: LivePattern): number {
  const { burdenM, spacingM, benchHeightM, holeDiameterMm } = pattern;
  if (!(burdenM > 0) || !(holeDiameterMm > 0) || !(benchHeightM > 0)) return NaN;
  const burdenOverDiameter = burdenM / holeDiameterMm; // metres per millimetre, deliberately
  const geometry = 2.2 - 14 * burdenOverDiameter;
  const spacingTerm = Math.sqrt((1 + spacingM / burdenM) / 2);
  const deviationTerm = 1 - (pattern.drillDeviationM ?? 0) / burdenM;
  const chargeTerm = Math.pow(0.1, 0.1);
  const lengthTerm = chargeLength(pattern) / benchHeightM;
  const index = geometry * spacingTerm * deviationTerm * chargeTerm * lengthTerm;
  return pattern.staggered ? index * 1.1 : index;
}

/** A shared logarithmic sieve grid, so curves overlay without resampling. */
export function sieveGrid(lowM = 1e-4, highM = 3, n = 241): number[] {
  const step = (Math.log(highM) - Math.log(lowM)) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.exp(Math.log(lowM) + i * step));
}

export interface LiveCurve {
  sizesM: number[];
  passing: number[];
  x50M: number;
}

/**
 * Rosin-Rammler on the mean size. The 0.693 is ln 2, which is what makes x50 the fifty-percent
 * size rather than the characteristic size.
 */
export function rosinRammler(x50M: number, uniformity: number, sizesM = sieveGrid()): LiveCurve {
  const passing = sizesM.map((x) => 1 - Math.exp(-Math.LN2 * Math.pow(x / x50M, uniformity)));
  return { sizesM, passing, x50M };
}

/** The three-parameter Swebrec form, whose upper limit fixes the coarse tail. */
export function swebrec(
  x50M: number,
  xMaxM: number,
  undulation: number,
  sizesM = sieveGrid(),
): LiveCurve {
  const denominator = Math.log(xMaxM / x50M);
  const passing = sizesM.map((x) => {
    if (x >= xMaxM) return 1;
    const f = Math.pow(Math.log(xMaxM / x) / denominator, undulation);
    return 1 / (1 + f);
  });
  return { sizesM, passing, x50M };
}

export interface CrushZoneParameters {
  crossoverM: number;
  finesUniformity: number;
  finesFraction: number;
}

export const CRUSH_ZONE_DEFAULTS: CrushZoneParameters = {
  crossoverM: 0.01,
  finesUniformity: 0.8,
  finesFraction: 0.05,
};

/**
 * The two-branch composition: the classical coarse branch plus a crushed-zone fines branch.
 *
 * The mechanism is sourced and the constants are not. No source held for this work prints the
 * crossover size, the fines-branch uniformity or the fines fraction, so they are the caller's and
 * the interface says so wherever this curve is drawn.
 */
export function crushZone(
  x50M: number,
  uniformity: number,
  parameters: CrushZoneParameters = CRUSH_ZONE_DEFAULTS,
  sizesM = sieveGrid(),
): LiveCurve {
  const coarse = rosinRammler(x50M, uniformity, sizesM);
  const fines = rosinRammler(parameters.crossoverM, parameters.finesUniformity, sizesM);
  const w = parameters.finesFraction;
  const passing = sizesM.map((_, i) => w * fines.passing[i] + (1 - w) * coarse.passing[i]);
  return { sizesM, passing, x50M: percentile(passing, sizesM, 0.5) };
}

/** The mesh size passing a given fraction, interpolated in log size. */
export function percentile(passing: number[], sizesM: number[], fraction: number): number {
  if (fraction <= passing[0]) return sizesM[0];
  if (fraction >= passing[passing.length - 1]) return sizesM[sizesM.length - 1];
  for (let i = 1; i < passing.length; i += 1) {
    if (fraction <= passing[i]) {
      const span = passing[i] - passing[i - 1];
      const t = span <= 0 ? 0 : (fraction - passing[i - 1]) / span;
      return Math.exp(Math.log(sizesM[i - 1]) + t * (Math.log(sizesM[i]) - Math.log(sizesM[i - 1])));
    }
  }
  return sizesM[sizesM.length - 1];
}

/** The fraction passing a given mesh, interpolated in log size. */
export function passingAt(curve: LiveCurve, sizeM: number): number {
  const { sizesM, passing } = curve;
  if (sizeM <= sizesM[0]) return passing[0];
  if (sizeM >= sizesM[sizesM.length - 1]) return passing[passing.length - 1];
  for (let i = 1; i < sizesM.length; i += 1) {
    if (sizeM <= sizesM[i]) {
      const t =
        (Math.log(sizeM) - Math.log(sizesM[i - 1])) /
        (Math.log(sizesM[i]) - Math.log(sizesM[i - 1]));
      return passing[i - 1] + t * (passing[i] - passing[i - 1]);
    }
  }
  return passing[passing.length - 1];
}

/* ------------------------------------------------------------------------------------------- */
/* The statistical arms                                                                          */
/* ------------------------------------------------------------------------------------------- */

const DISCRIMINANT = {
  S_over_B: 4.467,
  H_over_B: -0.551,
  B_over_D: -0.123,
  T_over_B: 1.642,
  Pf_kg_m3: -3.005,
  XB_m: 0.309,
  E_GPa: 0.208,
} as const;
const DISCRIMINANT_CONSTANT = 3.577;

/** Midpoint between the two published group centroids, measured on the corpus. */
export const DISCRIMINANT_BOUNDARY = 11.821;

export function discriminantScore(blast: LiveBlast): number {
  return (
    (Object.keys(DISCRIMINANT) as (keyof typeof DISCRIMINANT)[]).reduce(
      (sum, key) => sum + DISCRIMINANT[key] * blast[key],
      0,
    ) + DISCRIMINANT_CONSTANT
  );
}

/** 1 is the high-modulus group, 2 the low. Exact on all 109 labelled blasts. */
export const assignGroup = (blast: LiveBlast): 1 | 2 =>
  discriminantScore(blast) > DISCRIMINANT_BOUNDARY ? 1 : 2;

const REGRESSION = {
  1: {
    intercept: 208,
    exponents: {
      S_over_B: 2.788,
      H_over_B: 0.112,
      B_over_D: 0.027,
      T_over_B: -0.321,
      Pf_kg_m3: -0.36,
      XB_m: 0.233,
      E_GPa: -1.802,
    },
  },
  2: {
    intercept: 0.6,
    exponents: {
      S_over_B: 0.547,
      H_over_B: 0.535,
      B_over_D: 0.427,
      T_over_B: -0.101,
      Pf_kg_m3: -0.115,
      XB_m: 0.434,
      E_GPa: -1.202,
    },
  },
} as const;

/**
 * The published group regression.
 *
 * The two intercepts differ by a factor of 347 and both return metres. That is not a unit error: the
 * modulus exponents differ by 0.6 over a range of 9.57 to 60 GPa and the modulus term absorbs it.
 */
export function publishedRegression(blast: LiveBlast): { x50M: number; group: 1 | 2 } {
  const group = assignGroup(blast);
  const model = REGRESSION[group];
  let value = model.intercept;
  for (const key of Object.keys(model.exponents) as (keyof LiveBlast)[]) {
    value *= Math.pow(blast[key], model.exponents[key as keyof typeof model.exponents]);
  }
  return { x50M: value, group };
}

/** What a muckpile mean fragment size can physically be. Outside this the model has left the domain. */
export const PLAUSIBLE_X50_M: [number, number] = [0.001, 3];

export const isPlausible = (x50M: number) =>
  Number.isFinite(x50M) && x50M >= PLAUSIBLE_X50_M[0] && x50M <= PLAUSIBLE_X50_M[1];

/**
 * Why this design is not a blast, or null if it is one.
 *
 * Checked at the design level, because a ratio-only model will happily price a hole with no charge
 * in it: nothing in a power law over seven ratios knows that the stemming has swallowed the bench.
 */
export function degenerateReason(blast: LiveBlast): string | null {
  if (blast.T_over_B >= blast.H_over_B) {
    return `the stemming is ${blast.T_over_B.toFixed(2)} burdens in a bench ${blast.H_over_B.toFixed(
      2,
    )} burdens tall, so there is no charge column`;
  }
  const charged = 1 - blast.T_over_B / blast.H_over_B;
  if (charged < 0.05) {
    return `only ${(charged * 100).toFixed(1)} percent of the hole carries explosive after stemming`;
  }
  return null;
}

/** Turn a set of ratios and a hole diameter back into an absolute pattern. */
export function patternFromRatios(blast: LiveBlast, holeDiameterMm: number): LivePattern {
  const burdenM = blast.B_over_D * (holeDiameterMm / 1000);
  return {
    burdenM,
    spacingM: blast.S_over_B * burdenM,
    benchHeightM: blast.H_over_B * burdenM,
    stemmingM: blast.T_over_B * burdenM,
    holeDiameterMm,
    powderFactor: blast.Pf_kg_m3,
  };
}
