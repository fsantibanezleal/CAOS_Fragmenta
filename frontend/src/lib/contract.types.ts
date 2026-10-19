/**
 * CONTRACT 2, the artifact schemas, as the web reads them.
 *
 * The types are GENERATED: `contract.gen.ts` comes from `docs/contracts/api.openapi.json`, whose components are the
 * schema files of `docs/contracts/schemas/` (ADR-0080 decision 2; `npm run contracts:types`, and `npm run build` fails
 * when the committed file is not current). The names below are aliases of the generated types, never hand-written
 * interfaces; what stays here is what no schema holds: the runtime constants, the two arm-block guards and the
 * widening of the models file's arm map. `contract.test.ts` reads the committed artifacts and the provider tree against
 * the schemas in both directions, so the pipeline cannot ship a shape the web does not read and the web cannot read a
 * key the pipeline does not write.
 */

import type { components } from './contract.gen';

type Schemas = components['schemas'];

export type Lang = 'en' | 'es';
/** Every reader-facing string is bilingual at the source. */
export type Bilingual = Schemas['text'];
export type Category = Schemas['category'];

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

export type BlastRow = Schemas['blastRow'];
export type Pattern = Schemas['pattern'];
/** One arm's answer for one blast, or its refusal: `x50_m === null` always comes with a `reason`. */
export type PredictionCell = Schemas['prediction'];
export type WorstRow = Schemas['worstRow'];
/** A metric block: BOTH variance statistics are present and each is named. */
export type ScoreBlock = Schemas['scoreBlock'];
export type DistributionCurve = Schemas['distribution'];
export type GeometryCheck = Schemas['geometryCheck'];
export type GeometrySiteReport = Schemas['geometrySite'];
export type ControlBlock = Schemas['controls'][keyof Schemas['controls']] & { passed: boolean };

export type CaseArtifact = Schemas['CaseArtifact'];
export type VariantDef = CaseArtifact['variants'][number];
export type CaseManifest = Schemas['CaseManifest'];
export type GateVerdict = Schemas['gate'];
export type IndexEntry = Schemas['indexEntry'];
export type CaseIndex = Schemas['CaseIndex'];
export type BlastRecord = Schemas['BlastRecord'];

/** The named figures of one score, as the engine writes them. */
export type EngineScore = Schemas['engineScore'];
export type DrawSummary = Schemas['drawSummary'];
/** A random protocol: 100 draws, each scored on its own. `r2_identity` is the median draw. */
export type RepeatedArmBlock = Schemas['repeatedArm'];
/** Leave-one-site-out, pooled over the ten folds; the top-level fields are the all-blasts support. */
export type GroupedArmBlock = Schemas['groupedArm'];
export type Support = keyof GroupedArmBlock['supports'];
export type SiteError = Schemas['siteError'];
export type ProtocolBlock = Schemas['protocol'];
export type CriterionOnSupport = Schemas['criterionOnSupport'];
export type ArmProvenance = Schemas['BenchmarkArmProvenance'];
export type ImportanceReport = Schemas['importance'];
export type SiteMeta = Schemas['siteMeta'];
export type ReproductionBlock = Schemas['reproduction'];

type Reproduction = Schemas['Benchmark']['published_reproduction'];
/**
 * The benchmark. The schema names the arms of the two published-reproduction blocks (classical, regression, neural-net
 * and, held out, null); a page walks them by arm id, so each block is read as a map from an arm id to its score.
 */
export type BenchmarkArtifact = Omit<Schemas['Benchmark'], 'published_reproduction'> & {
  published_reproduction: Omit<Reproduction, 'published_holdout_arms' | 'without_the_leaked_row'> & {
    published_holdout_arms: Record<string, Reproduction['published_holdout_arms'][keyof Reproduction['published_holdout_arms']]>;
    without_the_leaked_row: Record<string, Reproduction['without_the_leaked_row'][keyof Reproduction['without_the_leaked_row']]>;
  };
};

export type FlatTree = Schemas['flatTree'];
export type Router = Schemas['router'];
export type Standardise = Schemas['standardise'];

type Arm = Schemas['ModelsFile']['arms'][keyof Schemas['ModelsFile']['arms']];
/** The groups of a network or a power law are named 1 and 2 in the schema; the walker reads them by the router's group id. */
type ReadByGroupId<A> = A extends { groups: infer G } ? Omit<A, 'groups'> & { groups: Record<string, G[keyof G]> } : A;
/** One fitted arm in the engine's portable form: the union of the seven arms the schema names. */
export type PortableModel = ReadByGroupId<Arm>;
/** The models file; its seven arms are named in the schema and the live walker reads them by arm id. */
export type ModelsFile = Omit<Schemas['ModelsFile'], 'arms'> & { arms: Record<string, PortableModel> };

export type Readiness = Schemas['Readiness'];
export type ReadinessEntry = Readiness['contracts'][number];
/** The declared state of a catalog row (docs/contracts/catalog.md, Missing-data states). */
export type ContractState = ReadinessEntry['state'];
/** What served a catalog row in this build; null when nothing did. */
export type Provenance = NonNullable<ReadinessEntry['provenance']>;
export type Text = Schemas['text'];

/** The 503 body (state missing, with the reason) and the 404 body of the dormant API (catalog row api). */
export type UnavailableBody = Schemas['UnavailableBody'];
export type NotFoundBody = Schemas['NotFoundBody'];

/** The `schema` field of each document; `satisfies` ties each to the generated literal, so a schema that moves fails `tsc`. */
export const CASE_SCHEMA = 'fragmenta.case/v1' satisfies CaseArtifact['schema'];
export const INDEX_SCHEMA = 'fragmenta.index/v1' satisfies CaseIndex['schema'];
export const BENCHMARK_SCHEMA = 'fragmenta.benchmark/v3' satisfies BenchmarkArtifact['schema'];
export const MODELS_SCHEMA = 'fragmenta.models/v1' satisfies ModelsFile['schema'];
export const MANIFEST_SCHEMA = 'fragmenta.manifest/v1' satisfies CaseManifest['schema'];
export const READINESS_SCHEMA = 'fragmenta.readiness/v1' satisfies Readiness['schema'];

/** Narrow an arm block to the site-held-out form. */
export const isGrouped = (block: RepeatedArmBlock | GroupedArmBlock | undefined): block is GroupedArmBlock =>
  !!block && 'supports' in block;

/** Narrow an arm block to the repeated-draw form. */
export const isRepeated = (block: RepeatedArmBlock | GroupedArmBlock | undefined): block is RepeatedArmBlock =>
  !!block && 'repeats' in block;
