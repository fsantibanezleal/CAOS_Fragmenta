/**
 * A blast design, and every arm's answer on it, computed in the browser.
 *
 * One function answers for every arm, so the What if views and the response surface are the same engine: the
 * closed forms recompute in TypeScript (`live.ts`), and the fitted arms walk the case's own models file, the models
 * fitted without the case's campaign (`learned.ts`). A changed design has not been fired, so nothing computed here is
 * a score.
 */

import type { BlastRow, Lang, ModelsFile, VariantDef } from '../lib/contract.types';
import { num } from '../lib/format';
import { fittedArms, predictModel } from './learned';
import {
  cappedAtInSituBlock,
  kuznetsovX50M,
  patternFromRatios,
  percentile,
  PLAUSIBLE_X50_M,
  publishedRegression,
  rosinRammler,
  sieveGrid,
  uniformityIndex,
  type LiveBlast,
} from './live';

export const FEATURES: (keyof LiveBlast)[] = ['S_over_B', 'H_over_B', 'B_over_D', 'T_over_B', 'Pf_kg_m3', 'XB_m', 'E_GPa'];

/** The training envelope, as the source paper's own summary table prints it. */
export const ENVELOPE: Record<keyof LiveBlast, [number, number]> = {
  S_over_B: [1.0, 1.75],
  H_over_B: [1.33, 6.82],
  B_over_D: [17.98, 39.47],
  T_over_B: [0.5, 4.67],
  Pf_kg_m3: [0.22, 1.26],
  XB_m: [0.02, 2.35],
  E_GPa: [9.57, 60],
};

/** Control ranges: wider than the envelope, so leaving it is possible and visible. */
export const RANGE: Record<keyof LiveBlast, [number, number, number]> = {
  S_over_B: [0.8, 2.2, 0.01],
  H_over_B: [1, 8, 0.05],
  B_over_D: [15, 45, 0.1],
  T_over_B: [0.3, 5, 0.01],
  Pf_kg_m3: [0.15, 1.5, 0.01],
  XB_m: [0.02, 3, 0.01],
  E_GPa: [5, 70, 0.1],
};

/** The arms that answer for a changed design: every arm that predicts a size from the design. */
export const DESIGN_ARMS = [
  'kuznetsov',
  'kuznetsov-transfer',
  'kuznetsov-capped',
  'published-regression',
  'refitted-regression',
  'published-neural-net',
  'svr-rbf',
  'random-forest',
  'xgboost',
  'stacking',
] as const;

export const DEFAULT_HOLE_MM = 165;

export interface Answer {
  value: number | null;
  reason: string | null;
}

export interface DesignContext {
  /** The case's recovered rock factor for the classical arm, or null where the site has no geometry. */
  rockFactor: number | null;
  /** The case's training-scope models, or null while they load. */
  models: ModelsFile | null;
  lang: Lang;
}

/** The design of a blast as fired: its seven ratios. */
export function designOf(blast: BlastRow): LiveBlast {
  return Object.fromEntries(FEATURES.map((k) => [k, blast.features[k]])) as unknown as LiveBlast;
}

/** One variant of a case: one ratio moved by a multiplier, as the bake applies it (`apply_variant`). */
export function applyVariant(design: LiveBlast, variant: VariantDef | undefined): LiveBlast {
  if (!variant || variant.field === 'none' || !(variant.field in design)) return design;
  const field = variant.field as keyof LiveBlast;
  return { ...design, [field]: design[field] * variant.factor };
}

/** The ratios a design moves outside the corpus envelope; a prediction there is an extrapolation. */
export const outsideEnvelope = (design: LiveBlast): (keyof LiveBlast)[] =>
  FEATURES.filter((k) => design[k] < ENVELOPE[k][0] || design[k] > ENVELOPE[k][1]);

const two = (v: number, lang: Lang) => num(v, 2, lang);

/** Why a design is not a blast, in the interface language, or null if it is one (the engine's own rule). */
export function designRefusal(design: LiveBlast, lang: Lang): string | null {
  if (design.T_over_B >= design.H_over_B) {
    return lang === 'es'
      ? `el taco mide ${two(design.T_over_B, lang)} bordos en un banco de ${two(design.H_over_B, lang)} bordos de alto, así que no hay columna de carga`
      : `the stemming is ${two(design.T_over_B, lang)} burdens in a bench ${two(design.H_over_B, lang)} burdens tall, so there is no charge column`;
  }
  const charged = 1 - design.T_over_B / design.H_over_B;
  if (charged < 0.05) {
    const pct = num(charged * 100, 1, lang);
    return lang === 'es'
      ? `solo el ${pct} por ciento del barreno lleva explosivo después del taco`
      : `only ${pct} percent of the hole carries explosive after stemming`;
  }
  return null;
}

function plausible(value: number, lang: Lang): Answer {
  return Number.isFinite(value) && value >= PLAUSIBLE_X50_M[0] && value <= PLAUSIBLE_X50_M[1]
    ? { value, reason: null }
    : { value: null, reason: lang === 'es' ? 'fuera del rango plausible de tamaño' : 'outside the plausible size range' };
}

/** A cache of the fitted arms per models file, so a grid of designs does not rebuild them per cell. */
const armsCache = new WeakMap<ModelsFile, ReturnType<typeof fittedArms>>();
function armsOf(models: ModelsFile) {
  let arms = armsCache.get(models);
  if (!arms) {
    arms = fittedArms(models);
    armsCache.set(models, arms);
  }
  return arms;
}

/** One arm's answer on a design, or its refusal with a reason; undefined while a fitted arm's models load. */
export function answerOnDesign(arm: string, design: LiveBlast, holeMm: number, ctx: DesignContext): Answer | undefined {
  const refusal = designRefusal(design, ctx.lang);
  if (refusal) return { value: null, reason: refusal };
  const pattern = patternFromRatios(design, holeMm);
  const es = ctx.lang === 'es';
  switch (arm) {
    case 'kuznetsov':
      return ctx.rockFactor === null
        ? { value: null, reason: es ? 'sin factor de roca recuperado para este sitio' : 'no recovered rock factor for this site' }
        : plausible(kuznetsovX50M(pattern, ctx.rockFactor), ctx.lang);
    case 'kuznetsov-capped': {
      // The cap reads the design's own in-situ block, so moving that ratio below the classical size shows it bind.
      const base = answerOnDesign('kuznetsov', design, holeMm, ctx);
      return !base || base.value === null ? base : plausible(cappedAtInSituBlock(base.value, design.XB_m), ctx.lang);
    }
    case 'published-regression':
      return plausible(publishedRegression(design).x50M, ctx.lang);
    default: {
      if (!ctx.models) return undefined;
      const arms = armsOf(ctx.models);
      const model = arms[arm];
      if (!model) return undefined;
      const x = FEATURES.map((k) => design[k]);
      if (arm === 'kuznetsov-transfer') {
        const factor = predictModel(model, x).value;
        return factor === null
          ? { value: null, reason: es ? 'sin factor de roca' : 'no rock factor' }
          : plausible(kuznetsovX50M(pattern, factor), ctx.lang);
      }
      return predictModel(model, x);
    }
  }
}

/** Every design arm's answer on a design. */
export function answersOnDesign(design: LiveBlast, holeMm: number, ctx: DesignContext): Record<string, Answer | undefined> {
  return Object.fromEntries(DESIGN_ARMS.map((arm) => [arm, answerOnDesign(arm, design, holeMm, ctx)]));
}

const GRID = sieveGrid();

/**
 * The 80 percent passing size of a design, from a mean size and the design's own uniformity (Cunningham's index on
 * the Rosin-Rammler curve). A declared choice: no learned arm predicts a curve, so its P80 takes the classical shape.
 */
export function p80Of(x50M: number, design: LiveBlast, holeMm: number): number {
  const curve = rosinRammler(x50M, uniformityIndex(patternFromRatios(design, holeMm)), GRID);
  return percentile(curve.passing, GRID, 0.8);
}
