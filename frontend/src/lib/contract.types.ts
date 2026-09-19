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
export const BENCHMARK_SCHEMA = 'fragmenta.benchmark/v1';

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
}

export interface ProtocolBlock {
  n_folds: number;
  arms: Record<string, ScoreBlock & { tier: string }>;
}

export interface BenchmarkArtifact {
  schema: typeof BENCHMARK_SCHEMA;
  digest: string;
  app_version: string;
  engine_version: string;
  corpus_digest: string;
  seed: number;
  kill_criterion: string;
  verdict: {
    criterion: string;
    outcome: string;
    generalises_across_sites: boolean;
    best_learned_arm: string;
    best_learned_r2_identity: number;
    null_r2_identity: number;
    margin_over_null: number;
    // Whether the best learned arm's score is above zero at all. The kill criterion needs BOTH this
    // and the margin, because a margin over a null that is itself deeply negative is two models
    // failing by different amounts rather than skill. The artifact has carried it since the bake
    // was written; the mirror did not, which is drift in the direction that hides a field.
    best_learned_is_positive: boolean;
    n_learned_arms_positive: number;
    n_learned_arms: number;
    arms_with_positive_variance_explained_across_sites: [string, number][];
    protocol_gap_random_minus_grouped: Record<string, number>;
    median_protocol_gap: number;
  };
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
  duplicate_groups: string[][];
  sites: string[];
  site_counts: Record<string, number>;
}

export interface ReproductionBlock {
  n_rows: number;
  as_published: ScoreBlock;
  recomputed: ScoreBlock;
  gain_in_r2_identity: number;
}
