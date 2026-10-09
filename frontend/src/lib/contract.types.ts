/**
 * CONTRACT 2, the artifact schema, mirrored in TypeScript.
 *
 * The Python side writes these shapes and this file is the only place the web agrees to read them.
 * A field renamed on one side and not the other fails `tsc --noEmit`, which runs before every build,
 * rather than rendering an empty chart that looks exactly like a working one.
 *
 * Keep in lockstep with `data-pipeline/pipeline/stages/export.py` and `.../benchmark.py`.
 */

export const CASE_SCHEMA = 'fragmenta.case/v1';
export const INDEX_SCHEMA = 'fragmenta.index/v1';
export const BENCHMARK_SCHEMA = 'fragmenta.benchmark/v3';
export const MODELS_SCHEMA = 'fragmenta.models/v1';

export type Lang = 'en' | 'es';
export type Bilingual = Record<Lang, string>;

export type Category =
  | 'real-campaign'
  | 'extrapolation-control'
  | 'parameter-sweep'
  | 'structural-control'
  | 'negative-control'
  | 'positive-control';

/** The seven published model inputs, in the order every published equation uses them. */
export const FEATURES = [
  'S_over_B',
  'H_over_B',
  'B_over_D',
  'T_over_B',
  'Pf_kg_m3',
  'XB_m',
  'E_GPa',
] as const;
export type Feature = (typeof FEATURES)[number];

export interface Pattern {
  burden_m: number;
  spacing_m: number;
  bench_height_m: number;
  stemming_m: number;
  hole_diameter_mm: number;
  charge_length_m: number;
  rock_volume_m3: number;
  charge_mass_kg: number;
}

export interface BlastRow {
  blast_id: string;
  site: string;
  group: 1 | 2 | null;
  features: Record<Feature, number>;
  x50_measured_m: number | null;
  has_geometry: boolean;
  usable: boolean;
  rock_factor: number | null;
  pattern?: Pattern;
  geometry_reason?: string;
  degenerate_reason?: string;
}

/**
 * One arm's answer for one blast, or its refusal.
 *
 * `x50_m === null` always comes with a `reason`. That invariant is asserted in the pipeline's
 * release gate, so a refusal without an explanation never reaches this file.
 */
export interface PredictionCell {
  x50_m: number | null;
  abstained: boolean;
  reason: string | null;
  extrapolated: boolean;
  group: 1 | 2 | null;
  /** Coefficient of variation across the network's simulations: the uncertainty it reports. */
  cv?: number | null;
  n_simulations?: number | null;
}

export interface WorstRow {
  blast_id: string;
  site: string;
  measured_m: number;
  predicted_m: number;
  error_m: number;
  error_pct: number;
}

/**
 * A metric block. Note that BOTH variance statistics are present and each is named.
 *
 * They differ by a factor of two and a half for the classical arm on the published hold-out, so a
 * screen that shows one without saying which is showing something a reader will misread.
 */
export interface ScoreBlock {
  scoreable: boolean;
  reason?: string;
  n_scored?: number;
  n_abstained?: number;
  n_extrapolated?: number;
  abstain_reasons?: string[];
  pearson_r2?: number | null;
  r2_identity?: number | null;
  rmse_m?: number | null;
  mae_m?: number | null;
  mape_pct?: number | null;
  bias_m?: number | null;
  worst_rows?: WorstRow[];
  r2_identity_interval?: [number, number] | null;
  r2_identity_point?: number;
}

export interface DistributionCurve {
  sizes_m: number[];
  passing: number[];
  x50_m: number;
  p20_m: number;
  p80_m: number;
  /** False for the crush-zone composition, whose branch constants no source prints. */
  constants_published: boolean;
}

export interface VariantDef {
  id: string;
  label: Bilingual;
  field: string;
  factor: number;
}

export interface GeometryCheck {
  quantity: string;
  stated: [number, number];
  reconstructed: [number, number];
  printed_precision_slack_m: number;
  ok: boolean;
}

export interface GeometrySiteReport {
  n: number;
  reconstructable: boolean;
  reason?: string;
  hole_diameter_mm?: number;
  burden_m?: [number, number];
  checks: GeometryCheck[];
}

export interface ControlBlock {
  passed: boolean;
  [key: string]: unknown;
}

export interface CaseArtifact {
  schema: typeof CASE_SCHEMA;
  digest: string;
  case: {
    id: string;
    category: Category;
    real_or_synthetic: 'real' | 'synthetic';
    site: string | null;
    title: Bilingual;
    reason: Bilingual;
    expected_band: Record<Lang, string>;
    licence: string;
    doi: string;
  };
  provenance: {
    engine: { package: string; version: string };
    app_version: string;
    corpus_digest: string;
    /** The site withheld from every learned arm on this case. Null when nothing was withheld. */
    held_out_site: string | null;
    n_training_rows: number;
    leakage_note: string;
  };
  blasts: BlastRow[];
  variants: VariantDef[];
  predictions: Record<string, Record<string, PredictionCell>>;
  variant_curves: Record<string, Record<string, number | null>>;
  distributions: Record<string, DistributionCurve>;
  representative_blast_id: string | null;
  scores: Record<string, ScoreBlock>;
  null_mean_m: number;
  controls: Record<string, ControlBlock>;
  geometry_report: Record<string, GeometrySiteReport>;
  /** The fitted models this case's learned predictions came from, for the live lane. */
  live_models: { scope: string; path: string; digest: string; arms: string[] } | null;
}

export interface IndexEntry {
  case_id: string;
  category: Category;
  real_or_synthetic: 'real' | 'synthetic';
  site: string | null;
  title: Bilingual;
  manifest_path: string;
  artifact_path: string;
  lane: 'live' | 'precompute';
  bytes: number;
  digest: string;
  controls_passed: boolean;
}

export interface CaseIndex {
  schema: typeof INDEX_SCHEMA;
  app_version: string;
  engine_version: string;
  corpus_digest: string;
  n_cases: number;
  cases: IndexEntry[];
  benchmark?: { path: string; bytes: number; digest: string; verdict: string };
  models?: { scope: string; path: string; bytes: number; digest: string; arms: string[] }[];
}

/** The named figures of one score, as the engine writes them. */
export interface EngineScore {
  n_scored: number;
  n_abstained: number;
  n_extrapolated: number;
  pearson_r: number | null;
  pearson_r2: number | null;
  r2_identity: number | null;
  rmse_m: number | null;
  mae_m: number | null;
  mape_pct: number | null;
  bias_m: number | null;
}

export interface DrawSummary {
  n: number;
  p05?: number;
  p25?: number;
  median?: number;
  p75?: number;
  p95?: number;
  mean?: number;
}

/** A random protocol: 100 draws, each scored on its own. `r2_identity` is the median draw. */
export interface RepeatedArmBlock {
  tier: string;
  r2_identity: number | null;
  seed0: EngineScore;
  repeats: DrawSummary;
  rmse_repeats: DrawSummary;
  draws: number[];
  /** The same draws on the rows every size-predicting arm answered (schema v3); never decides the verdict. */
  common: {
    repeats: DrawSummary;
    rmse_repeats: DrawSummary;
    n_rows: DrawSummary;
    draws_r2_identity: (number | null)[];
    arms: string[];
  };
}

export type Support = 'all' | 'geometry';

export interface SiteError {
  n_blasts: number;
  n_scored: number;
  mean_measured_m: number | null;
  mean_predicted_m?: number;
  rmse_m?: number;
  mae_m?: number;
  bias_m?: number;
  abstain_reason?: string | null;
}

/** Leave-one-site-out, pooled over the ten folds; the top-level fields are the all-blasts support. */
export interface GroupedArmBlock extends EngineScore {
  tier: string;
  supports: Record<Support, { score: EngineScore; interval_95: [number, number] | null; n_sites: number }>;
  per_site: Record<string, SiteError>;
  predictions: Record<string, number | null>;
  /** The pooled score on the rows every size-predicting arm answered (schema v3), with its site interval. */
  common: {
    score: EngineScore;
    interval_95: [number, number] | null;
    n_rows: number;
    n_sites: number;
    arms: string[];
  };
}

export interface ProtocolBlock {
  n_folds: number;
  repeated: boolean;
  arms: Record<string, RepeatedArmBlock | GroupedArmBlock>;
}

export interface CriterionOnSupport {
  n_blasts: number;
  best_learned_arm: string;
  best_learned_r2_identity: number;
  best_learned_interval_95: [number, number] | null;
  null_r2_identity: number;
  null_pearson_r: number | null;
  margin_over_null: number;
  best_learned_is_positive: boolean;
  n_learned_arms_positive: number;
  n_learned_arms: number;
  generalises_across_sites: boolean;
}

export interface ArmProvenance {
  tier: string;
  lane: string;
  source: string;
  shares_mean_size_with: string | null;
  fitted_on: string;
  in_sample_corpus: boolean;
  uses_site_constant: boolean;
  router_in_sample: boolean;
  /** Set on the in-situ cap (schema v3): the arm it caps, and that the cap is a declared choice. */
  caps?: string;
  declared_not_published?: boolean;
}

export interface ImportanceReport {
  method: string;
  n_repeats: number;
  n_rows: number;
  baseline_mse: number | null;
  mean_increase_in_mse: Record<string, number | null>;
  share: Record<string, number | null>;
}

export interface SiteMeta {
  n_blasts: number;
  mean_x50_m: number;
  E_GPa: number[];
  mine: string | null;
  rock: string | null;
  hole_diameter_mm: number | null;
  rock_factor_recovered: number | null;
  rock_factor_transfer: number;
  measurement: string | null;
}

export interface BenchmarkArtifact {
  schema: typeof BENCHMARK_SCHEMA;
  digest: string;
  app_version: string;
  engine_version: string;
  corpus_digest: string;
  seed: number;
  n_repeats: number;
  n_boot: number;
  kill_criterion: string;
  verdict: Omit<CriterionOnSupport, 'n_blasts'> & {
    criterion: string;
    outcome: string;
    supports: Record<Support, CriterionOnSupport>;
    depends_on_support: boolean;
    sites_outside_geometry_support: string[];
    in_sample_arms: [string, number, string][];
    site_constant_arms: string[];
    arms_with_positive_variance_explained_across_sites: [string, number][];
    intervals_95: Record<string, Record<Support, [number, number] | null>>;
    arms_with_interval_above_zero: string[];
    protocol_gap_random_minus_grouped: Record<string, number>;
    protocol_gap_basis: string;
    median_protocol_gap: number;
    median_protocol_gap_over: string;
    dedup_minus_random_median: Record<string, number>;
    published_random_split_figures: Record<
      string,
      { published: number; share_of_draws_below: number; median_draw: number }
    >;
  };
  provenance: Record<string, ArmProvenance>;
  protocols: Record<string, ProtocolBlock>;
  published_reproduction: {
    [key: string]: unknown;
    published_holdout_arms: Record<string, ScoreBlock>;
    without_the_leaked_row: Record<string, ScoreBlock>;
  };
  network_seed_sweep: {
    n_seeds: number;
    r2_identity: number[];
    min: number;
    median: number;
    max: number;
    published: number;
    published_above_every_seed: boolean;
    per_blast: Record<
      string,
      { measured_m: number; published_m: number; min_m: number | null; max_m: number | null }
    >;
  };
  /** The published network's hidden width (schema v3): the source's protocol, and every width held out by site. */
  network_width_sweep: {
    widths: number[];
    n_simulations: number;
    seed: number;
    published_widths: Record<string, number>;
    published_protocol: Record<
      string,
      {
        best_hidden: number;
        best_rmse: number;
        published_optimum: number;
        table: { hidden: number; rmse: number; correlation: number }[];
      }
    >;
    leave_one_site_out: { hidden: Record<string, number>; published: boolean; supports: Record<Support, EngineScore> }[];
  };
  duplicate_groups: string[][];
  sites: string[];
  site_counts: Record<string, number>;
  site_meta: Record<string, SiteMeta>;
  diagnostics: {
    outliers: {
      method: string;
      inputs: string[];
      contamination: number;
      n_estimators: number;
      standardised: boolean;
      seed: number;
      n_blasts: number;
      flagged: string[];
      flagged_by_site: Record<string, number>;
      anomaly_score: Record<string, number>;
      applied_as_filter: false;
    };
    native_importance: Record<string, { kind: string; values: Record<string, number> } | null>;
    published_importance: Record<string, Record<string, number>>;
    resampling_importance: Record<string, ImportanceReport>;
    transfer_fit: { intercept: number; slope: number; fit_sites: string[]; form: string };
  };
  /** The 97 corpus rows behind the pooled scores: measured size, site and the seven features. */
  corpus_rows?: { blast_id: string; site: string; x50_m: number; features: number[] }[];
  /** The published hold-out and field blasts, with what each source printed for them. */
  holdout_rows?: {
    blast_id: string;
    site: string;
    set: 'published-2012' | 'published-2010-only' | 'field-2025';
    x50_m: number;
    features: number[];
    in_training_table: boolean;
    published: { classical?: number | null; regression?: number | null; neural_net?: number | null };
  }[];
}

/** Narrow an arm block to the site-held-out form. */
export const isGrouped = (block: RepeatedArmBlock | GroupedArmBlock | undefined): block is GroupedArmBlock =>
  !!block && 'supports' in block;

/** Narrow an arm block to the repeated-draw form. */
export const isRepeated = (block: RepeatedArmBlock | GroupedArmBlock | undefined): block is RepeatedArmBlock =>
  !!block && 'repeats' in block;

/* ------------------------------------------------------------------------------------------- */
/* The portable models, written by the engine's export and read by src/engine/learned.ts        */
/* ------------------------------------------------------------------------------------------- */

export interface FlatTree {
  left: number[];
  right: number[];
  feature: number[];
  t: number[];
}

interface PortableBase {
  schema: 'blastfrag.portable/v1';
  arm: string;
  engine_version: string;
  features: string[];
  plausible_x50_m: [number, number];
}

export interface Router {
  coefficients: number[];
  constant: number;
  boundary: number;
}

export interface Standardise {
  mean: number[];
  sd: number[];
}

export type PortableModel =
  | (PortableBase & {
      kind: 'network';
      router: Router;
      groups: Record<
        string,
        { minimum: number[]; maximum: number[]; target_low: number; target_high: number; n_hidden: number; networks: number[][] }
      >;
    })
  | (PortableBase & {
      kind: 'svr';
      standardise: Standardise;
      kernel: 'rbf' | 'poly';
      gamma: number;
      degree: number;
      coef0: number;
      support_vectors: number[][];
      dual_coef: number[];
      intercept: number;
    })
  | (PortableBase & { kind: 'forest'; standardise: Standardise; trees: FlatTree[] })
  | (PortableBase & { kind: 'xgboost'; standardise: Standardise; base_score: number; trees: FlatTree[] })
  | (PortableBase & {
      kind: 'stacking';
      standardise: Standardise;
      forest: { trees: FlatTree[] } | { ref: string };
      boosting: { base_score: number; trees: FlatTree[] } | { ref: string };
      meta: { coef: number[]; intercept: number };
    })
  | (PortableBase & {
      kind: 'power-law';
      router: Router;
      groups: Record<string, { intercept: number; exponents: number[] }>;
    })
  | (PortableBase & {
      kind: 'kuznetsov-transfer';
      rock_factor: { intercept: number; slope: number; fit_sites: string[] };
      timing_factor: number;
    });

export interface ModelsFile {
  schema: typeof MODELS_SCHEMA;
  scope: string;
  held_out_site: string | null;
  n_training_rows: number;
  engine: { package: string; version: string };
  app_version: string;
  arms: Record<string, PortableModel>;
  fixtures: {
    inputs: { blast_id: string; site: string; features: number[] }[];
    expected: Record<string, (number | null)[]>;
  };
  digest: string;
}

export interface ReproductionBlock {
  n_rows: number;
  as_published: ScoreBlock;
  recomputed: ScoreBlock;
  gain_in_r2_identity: number;
}
