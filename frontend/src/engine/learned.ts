/**
 * The fitted models, run in the browser.
 *
 * The bake writes each training scope's fitted arms in the engine's portable form: the network's
 * weights, the support vectors, and every tree as four flat arrays. This module walks them. It is a
 * line-for-line mirror of the engine's reference reader (`blastfrag.export.predict_portable`), and the
 * frontend tests hold it to the ORIGINAL fitted models' predictions at all 116 shipped blasts, which
 * every models file carries as fixtures: exactly for the forest, the boosting model and the stacked
 * model, and to a relative 1e-12 for the network, the kernels and the power law, whose exponentials
 * and powers may differ in the last bit between two maths libraries.
 *
 * Two details make the trees exact rather than close:
 *
 * - scikit-learn and XGBoost both compare a 32-bit input against the split value, so the standardised
 *   input is rounded with `Math.fround` before every comparison;
 * - XGBoost accumulates its leaf values in 32 bits, starting from the base score, so the sum is
 *   rounded after every tree.
 */

import type { FlatTree, ModelsFile, PortableModel, Router, Standardise } from '../lib/contract.types';

export const FEATURE_ORDER = [
  'S_over_B',
  'H_over_B',
  'B_over_D',
  'T_over_B',
  'Pf_kg_m3',
  'XB_m',
  'E_GPa',
] as const;

export type FeatureName = (typeof FEATURE_ORDER)[number];
export type FeatureVector = Record<FeatureName, number>;

export interface LearnedResult {
  /** Metres; for the transfer arm, the rock factor. Null when the arm abstains. */
  value: number | null;
  reason: string | null;
}

const f32 = Math.fround;

export const toVector = (features: Partial<Record<string, number>>): number[] =>
  FEATURE_ORDER.map((name) => {
    const value = features[name];
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error(`feature ${name} is missing`);
    }
    return value;
  });

function group(router: Router, x: number[]): 1 | 2 {
  let score = 0;
  for (let i = 0; i < x.length; i += 1) score += router.coefficients[i] * x[i];
  score += router.constant;
  return score > router.boundary ? 1 : 2;
}

function walk(tree: FlatTree, z32: number[]): number {
  let node = 0;
  while (tree.left[node] !== -1) {
    node = z32[tree.feature[node]] <= tree.t[node] ? tree.left[node] : tree.right[node];
  }
  return tree.t[node];
}

function walkXgb(tree: FlatTree, z32: number[]): number {
  let node = 0;
  while (tree.left[node] !== -1) {
    node = z32[tree.feature[node]] < tree.t[node] ? tree.left[node] : tree.right[node];
  }
  return tree.t[node];
}

function forestValue(trees: FlatTree[], z32: number[]): number {
  let total = 0;
  for (const tree of trees) total += walk(tree, z32);
  return total / trees.length;
}

function xgbValue(baseScore: number, trees: FlatTree[], z32: number[]): number {
  let total = f32(baseScore);
  for (const tree of trees) total = f32(total + walkXgb(tree, z32));
  return total;
}

function standardised(standardise: Standardise, x: number[]): number[] {
  return x.map((v, i) => (v - standardise.mean[i]) / (standardise.sd[i] > 0 ? standardise.sd[i] : 1));
}

/**
 * Replace the stacked model's references to the standalone forest and boosting model, which the bake
 * stores once because, with the published parameters, they are the same fitted models.
 */
export function resolveModel(name: string, file: ModelsFile): PortableModel {
  const model = file.arms[name];
  if (!model) throw new Error(`${file.scope}: no fitted ${name}`);
  if (model.kind !== 'stacking') return model;
  const forest = 'ref' in model.forest ? file.arms[model.forest.ref] : null;
  const boosting = 'ref' in model.boosting ? file.arms[model.boosting.ref] : null;
  return {
    ...model,
    forest: forest && forest.kind === 'forest' ? { trees: forest.trees } : model.forest,
    boosting: boosting && boosting.kind === 'xgboost' ? { base_score: boosting.base_score, trees: boosting.trees } : model.boosting,
  };
}

const logistic = (v: number) => 1 / (1 + Math.exp(-v));

/** Predict a mean fragment size, in metres, or the reason the arm would refuse. */
export function predictModel(model: PortableModel, x: number[]): LearnedResult {
  let value: number;
  switch (model.kind) {
    case 'kuznetsov-transfer': {
      const e = x[FEATURE_ORDER.indexOf('E_GPa')];
      return { value: Math.exp(model.rock_factor.intercept + model.rock_factor.slope * Math.log(e)), reason: null };
    }
    case 'power-law': {
      const g = group(model.router, x);
      const coefficients = model.groups[String(g)];
      if (!coefficients) return { value: null, reason: `no refitted equation for group ${g}` };
      value = coefficients.intercept;
      for (let i = 0; i < x.length; i += 1) value *= x[i] ** coefficients.exponents[i];
      break;
    }
    case 'network': {
      const g = group(model.router, x);
      const spec = model.groups[String(g)];
      if (!spec) return { value: null, reason: `no network was trained for group ${g}` };
      const scaled = x.map((v, i) => {
        const span = spec.maximum[i] - spec.minimum[i];
        return span === 0 ? 0.5 : (v - spec.minimum[i]) / span;
      });
      const nIn = x.length;
      const nH = spec.n_hidden;
      const cut = nIn * nH;
      let sum = 0;
      for (const w of spec.networks) {
        let raw = 0;
        for (let j = 0; j < nH; j += 1) {
          let a = 0;
          for (let i = 0; i < nIn; i += 1) a += scaled[i] * w[i * nH + j];
          raw += logistic(a + w[cut + j]) * w[cut + nH + j];
        }
        raw += w[cut + 2 * nH];
        const clamped = Math.min(1, Math.max(0, raw));
        sum += clamped * (spec.target_high - spec.target_low) + spec.target_low;
      }
      value = sum / spec.networks.length;
      break;
    }
    case 'svr': {
      const z = standardised(model.standardise, x);
      let total = model.intercept;
      for (let k = 0; k < model.dual_coef.length; k += 1) {
        const sv = model.support_vectors[k];
        let kernel: number;
        if (model.kernel === 'rbf') {
          let d = 0;
          for (let i = 0; i < z.length; i += 1) d += (sv[i] - z[i]) ** 2;
          kernel = Math.exp(-model.gamma * d);
        } else {
          let dot = 0;
          for (let i = 0; i < z.length; i += 1) dot += sv[i] * z[i];
          kernel = (model.gamma * dot + model.coef0) ** model.degree;
        }
        total += model.dual_coef[k] * kernel;
      }
      value = total;
      break;
    }
    case 'forest': {
      const z32 = standardised(model.standardise, x).map(f32);
      value = forestValue(model.trees, z32);
      break;
    }
    case 'xgboost': {
      const z32 = standardised(model.standardise, x).map(f32);
      value = xgbValue(model.base_score, model.trees, z32);
      break;
    }
    case 'stacking': {
      if ('ref' in model.forest || 'ref' in model.boosting) {
        throw new Error('resolve the stacked model with resolveModel before predicting');
      }
      const z32 = standardised(model.standardise, x).map(f32);
      const forest = forestValue(model.forest.trees, z32);
      const boosting = xgbValue(model.boosting.base_score, model.boosting.trees, z32);
      value = model.meta.coef[0] * forest + model.meta.coef[1] * boosting + model.meta.intercept;
      break;
    }
    default:
      return { value: null, reason: 'unknown model kind' };
  }
  const [low, high] = model.plausible_x50_m;
  if (!Number.isFinite(value) || value < low || value > high) {
    return {
      value: null,
      reason: `the model returned ${value.toPrecision(4)} m, outside the plausible fragment range ${low} to ${high} m`,
    };
  }
  return { value, reason: null };
}

/** Every fitted arm of a models file, resolved and ready, keyed by arm name. */
export function fittedArms(file: ModelsFile): Record<string, PortableModel> {
  return Object.fromEntries(Object.keys(file.arms).map((name) => [name, resolveModel(name, file)]));
}
