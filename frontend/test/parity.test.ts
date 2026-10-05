/**
 * The parity gate: the browser engine against the numbers the Python engine baked.
 *
 * Two implementations of one equation drift the moment nobody checks, and the symptom is a chart
 * that is subtly wrong and entirely plausible. This test scores every closed-form function in
 * `src/engine/live.ts` against the committed artifacts and fails the build on a divergence.
 *
 * It runs on the COMMITTED artifacts rather than a fixture, because those are what the site serves.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  assignGroup,
  cappedAtInSituBlock,
  DISCRIMINANT_BOUNDARY,
  discriminantScore,
  kuznetsovX50M,
  passingAt,
  patternFromRatios,
  percentile,
  PLAUSIBLE_X50_M,
  publishedRegression,
  rosinRammler,
  sieveGrid,
  swebrec,
  uniformityIndex,
  degenerateReason,
  type LiveBlast,
} from '../src/engine/live';
import { ARMS, formatSize } from '../src/lib/artifacts';
import type { CaseArtifact, CaseIndex } from '../src/lib/contract.types';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');

function readIndex(): CaseIndex {
  return JSON.parse(readFileSync(join(DERIVED, 'manifests', 'index.json'), 'utf8'));
}
function readCase(caseId: string): CaseArtifact {
  return JSON.parse(readFileSync(join(DERIVED, caseId, 'case.json'), 'utf8'));
}

const index = readIndex();
const cases = index.cases.map((entry) => readCase(entry.case_id));
const benchmark: { protocols: Record<string, { arms: Record<string, unknown> }> } = JSON.parse(
  readFileSync(join(DERIVED, 'benchmark.json'), 'utf8'),
);

/* ------------------------------------------------------------------------------------------- */

test('the classical mean size matches the baked value on every reconstructable blast', () => {
  let checked = 0;
  for (const artifact of cases) {
    const row = artifact.predictions.kuznetsov ?? {};
    for (const blast of artifact.blasts) {
      const cell = row[blast.blast_id];
      if (!cell || cell.x50_m === null || !blast.pattern || blast.rock_factor === null) continue;
      const live = kuznetsovX50M(
        {
          burdenM: blast.pattern.burden_m,
          spacingM: blast.pattern.spacing_m,
          benchHeightM: blast.pattern.bench_height_m,
          stemmingM: blast.pattern.stemming_m,
          holeDiameterMm: blast.pattern.hole_diameter_mm,
          powderFactor: blast.features.Pf_kg_m3,
        },
        blast.rock_factor,
      );
      // The baked value is rounded to six decimals and the pattern to four, so the tolerance is the
      // rounding rather than a fudge. Anything larger is a real divergence.
      assert.ok(
        Math.abs(live - cell.x50_m) < 5e-4,
        `${artifact.case.id}/${blast.blast_id}: TypeScript ${live} against Python ${cell.x50_m}`,
      );
      checked += 1;
    }
  }
  assert.ok(checked > 80, `only ${checked} blasts were checked, which proves too little`);
});

test('the capped classical mean size matches the baked value on every reconstructable blast', () => {
  let checked = 0;
  let bound = 0;
  for (const artifact of cases) {
    const row = artifact.predictions['kuznetsov-capped'] ?? {};
    for (const blast of artifact.blasts) {
      const cell = row[blast.blast_id];
      if (!cell || cell.x50_m === null || !blast.pattern || blast.rock_factor === null) continue;
      const classical = kuznetsovX50M(
        {
          burdenM: blast.pattern.burden_m,
          spacingM: blast.pattern.spacing_m,
          benchHeightM: blast.pattern.bench_height_m,
          stemmingM: blast.pattern.stemming_m,
          holeDiameterMm: blast.pattern.hole_diameter_mm,
          powderFactor: blast.features.Pf_kg_m3,
        },
        blast.rock_factor,
      );
      const live = cappedAtInSituBlock(classical, blast.features.XB_m);
      assert.ok(
        Math.abs(live - cell.x50_m) < 5e-4,
        `${artifact.case.id}/${blast.blast_id}: TypeScript ${live} against Python ${cell.x50_m}`,
      );
      assert.ok(cell.x50_m <= blast.features.XB_m + 1e-9, `${blast.blast_id}: above its in-situ block`);
      if (classical > blast.features.XB_m) bound += 1;
      checked += 1;
    }
  }
  assert.ok(checked > 80, `only ${checked} blasts were checked, which proves too little`);
  assert.ok(bound > 0, 'the cap bound on no blast, so this test proves nothing about it');
});

test('the capped classical arm equals the classical arm wherever its cap does not bind', () => {
  let folded = 0;
  let differing = 0;
  cases.forEach((artifact, i) => {
    const caseId = index.cases[i].case_id;
    const capped = artifact.predictions['kuznetsov-capped'];
    const base = artifact.predictions.kuznetsov;
    assert.ok(capped && base, `${caseId}: the capped arm is missing`);
    const binds = artifact.blasts.some((b) => (base[b.blast_id]?.x50_m ?? -1) > b.features.XB_m);
    if (binds) {
      differing += 1;
      return;
    }
    for (const field of ['r2_identity', 'pearson_r2', 'rmse_m', 'n_scored', 'n_abstained'] as const) {
      assert.equal(artifact.scores['kuznetsov-capped']?.[field], artifact.scores.kuznetsov?.[field], `${caseId}: ${field}`);
    }
    for (const [blastId, cell] of Object.entries(capped)) {
      assert.equal(cell.x50_m, base[blastId]?.x50_m, `${caseId} ${blastId}`);
    }
    folded += 1;
  });
  assert.ok(folded > 0 && differing > 0, `${folded} cases where the cap never binds, ${differing} where it does`);
});

test('the published regression matches the baked value on every blast', () => {
  let checked = 0;
  for (const artifact of cases) {
    const row = artifact.predictions['published-regression'] ?? {};
    for (const blast of artifact.blasts) {
      const cell = row[blast.blast_id];
      if (!cell || cell.x50_m === null) continue;
      const live = publishedRegression(blast.features as LiveBlast);
      assert.ok(
        Math.abs(live.x50M - cell.x50_m) < 1e-5,
        `${artifact.case.id}/${blast.blast_id}: ${live.x50M} against ${cell.x50_m}`,
      );
      assert.equal(live.group, cell.group, `${artifact.case.id}/${blast.blast_id}: group`);
      checked += 1;
    }
  }
  assert.ok(checked > 100, `only ${checked} blasts were checked`);
});

test('the group router agrees with the baked group on every blast', () => {
  let checked = 0;
  for (const artifact of cases) {
    const row = artifact.predictions['group-discriminant'] ?? {};
    for (const blast of artifact.blasts) {
      const cell = row[blast.blast_id];
      if (!cell || cell.group === null) continue;
      assert.equal(assignGroup(blast.features as LiveBlast), cell.group, blast.blast_id);
      checked += 1;
    }
  }
  assert.ok(checked > 100);
  assert.equal(DISCRIMINANT_BOUNDARY, 11.821);
});

test('the two published groups stay perfectly separated by the discriminant', () => {
  const high: number[] = [];
  const low: number[] = [];
  for (const artifact of cases) {
    for (const blast of artifact.blasts) {
      if (blast.group === 1) high.push(discriminantScore(blast.features as LiveBlast));
      if (blast.group === 2) low.push(discriminantScore(blast.features as LiveBlast));
    }
  }
  assert.ok(high.length > 30 && low.length > 50);
  assert.ok(Math.max(...low) < Math.min(...high), 'the groups overlap in the browser engine');
});

test('the distribution curves match the baked ones point for point', () => {
  let checked = 0;
  for (const artifact of cases) {
    const baked = artifact.distributions['kuz-ram'];
    if (!baked) continue;
    const blast = artifact.blasts.find((b) => b.blast_id === artifact.representative_blast_id);
    if (!blast?.pattern || blast.rock_factor === null) continue;

    const pattern = {
      burdenM: blast.pattern.burden_m,
      spacingM: blast.pattern.spacing_m,
      benchHeightM: blast.pattern.bench_height_m,
      stemmingM: blast.pattern.stemming_m,
      holeDiameterMm: blast.pattern.hole_diameter_mm,
      powderFactor: blast.features.Pf_kg_m3,
    };
    const grid = sieveGrid();
    const live = rosinRammler(kuznetsovX50M(pattern, blast.rock_factor), uniformityIndex(pattern), grid);

    assert.equal(live.passing.length, baked.passing.length, `${artifact.case.id}: grid length`);
    for (let i = 0; i < live.passing.length; i += 1) {
      assert.ok(
        Math.abs(live.passing[i] - baked.passing[i]) < 2e-5,
        `${artifact.case.id} point ${i}: ${live.passing[i]} against ${baked.passing[i]}`,
      );
    }
    checked += 1;
  }
  assert.ok(checked >= 8, `only ${checked} distributions were checked`);
});

test('the three-parameter curve matches the baked one', () => {
  let checked = 0;
  for (const artifact of cases) {
    const baked = artifact.distributions.swebrec;
    if (!baked) continue;
    const blast = artifact.blasts.find((b) => b.blast_id === artifact.representative_blast_id);
    if (!blast?.pattern || blast.rock_factor === null) continue;
    const pattern = {
      burdenM: blast.pattern.burden_m,
      spacingM: blast.pattern.spacing_m,
      benchHeightM: blast.pattern.bench_height_m,
      stemmingM: blast.pattern.stemming_m,
      holeDiameterMm: blast.pattern.hole_diameter_mm,
      powderFactor: blast.features.Pf_kg_m3,
    };
    const grid = sieveGrid();
    const live = swebrec(
      kuznetsovX50M(pattern, blast.rock_factor),
      Math.max(pattern.burdenM, pattern.spacingM),
      2,
      grid,
    );
    for (let i = 0; i < live.passing.length; i += 1) {
      assert.ok(
        Math.abs(live.passing[i] - baked.passing[i]) < 2e-5,
        `${artifact.case.id} point ${i}`,
      );
    }
    checked += 1;
  }
  assert.ok(checked >= 8);
});

test('the percentiles the artifact carries are reproduced in the browser', () => {
  for (const artifact of cases) {
    const baked = artifact.distributions['kuz-ram'];
    if (!baked) continue;
    const p80 = percentile(baked.passing, baked.sizes_m, 0.8);
    const p20 = percentile(baked.passing, baked.sizes_m, 0.2);
    assert.ok(Math.abs(p80 - baked.p80_m) / baked.p80_m < 2e-3, `${artifact.case.id}: P80`);
    assert.ok(Math.abs(p20 - baked.p20_m) / baked.p20_m < 2e-3, `${artifact.case.id}: P20`);
  }
});

test('the sieve grid is the same one the bake used', () => {
  const artifact = cases.find((c) => c.distributions['kuz-ram']);
  assert.ok(artifact, 'no case shipped a distribution');
  const baked = artifact.distributions['kuz-ram'].sizes_m;
  const live = sieveGrid();
  assert.equal(live.length, baked.length);
  for (let i = 0; i < live.length; i += 1) {
    assert.ok(Math.abs(live[i] - baked[i]) < 1e-6, `grid point ${i}`);
  }
});

test('the geometry reconstruction matches the baked pattern', () => {
  let checked = 0;
  for (const artifact of cases) {
    for (const blast of artifact.blasts) {
      if (!blast.pattern) continue;
      const live = patternFromRatios(blast.features as LiveBlast, blast.pattern.hole_diameter_mm);
      assert.ok(Math.abs(live.burdenM - blast.pattern.burden_m) < 1e-3, blast.blast_id);
      assert.ok(Math.abs(live.spacingM - blast.pattern.spacing_m) < 1e-3, blast.blast_id);
      assert.ok(Math.abs(live.benchHeightM - blast.pattern.bench_height_m) < 1e-3, blast.blast_id);
      assert.ok(Math.abs(live.stemmingM - blast.pattern.stemming_m) < 1e-3, blast.blast_id);
      checked += 1;
    }
  }
  assert.ok(checked > 80);
});

test('the browser refuses exactly the designs the bake refused as not a blast', () => {
  const artifact = cases.find((c) => c.case.id === 'ctrl-degenerate');
  assert.ok(artifact, 'the degenerate control did not ship');
  for (const blast of artifact.blasts) {
    assert.ok(
      degenerateReason(blast.features as LiveBlast) !== null,
      `${blast.blast_id}: the browser would have priced a hole with no charge in it`,
    );
    for (const [arm, row] of Object.entries(artifact.predictions)) {
      assert.equal(row[blast.blast_id].x50_m, null, `${arm}/${blast.blast_id} answered`);
    }
  }
});

test('a normal blast is not flagged as degenerate', () => {
  const artifact = cases.find((c) => c.case.id === 'real-murgul');
  assert.ok(artifact);
  for (const blast of artifact.blasts) {
    assert.equal(degenerateReason(blast.features as LiveBlast), null, blast.blast_id);
  }
});

test('the plausible range agrees with the engine that baked the artifacts', () => {
  assert.deepEqual(PLAUSIBLE_X50_M, [0.001, 3]);
  for (const artifact of cases) {
    for (const row of Object.values(artifact.predictions)) {
      for (const cell of Object.values(row)) {
        if (cell.x50_m === null) continue;
        assert.ok(
          cell.x50_m >= PLAUSIBLE_X50_M[0] && cell.x50_m <= PLAUSIBLE_X50_M[1],
          `a baked value of ${cell.x50_m} m escaped the guard`,
        );
      }
    }
  }
});

test('the uniformity index stays in a physical band on every reconstructable blast', () => {
  // The unit trap: read the burden-to-diameter quotient as the corpus's tabulated ratio and this
  // goes to about -380. That is the single most likely way this file drifts from the Python one.
  const values: number[] = [];
  const degenerate: number[] = [];
  for (const artifact of cases) {
    for (const blast of artifact.blasts) {
      if (!blast.pattern) continue;
      const index = uniformityIndex({
        burdenM: blast.pattern.burden_m,
        spacingM: blast.pattern.spacing_m,
        benchHeightM: blast.pattern.bench_height_m,
        stemmingM: blast.pattern.stemming_m,
        holeDiameterMm: blast.pattern.hole_diameter_mm,
        powderFactor: blast.features.Pf_kg_m3,
      });
      // A design with no charge column is not a blast, and the index is linear in the charge
      // length, so it correctly returns zero there. Those rows are the degenerate control; they
      // belong in the second assertion, not the first.
      (blast.usable ? values : degenerate).push(index);
    }
  }
  assert.ok(values.length > 80, `only ${values.length} real blasts were checked`);
  assert.ok(Math.min(...values) > 0.1, `the index fell to ${Math.min(...values)} on a real blast`);
  assert.ok(Math.max(...values) < 2.5, `the index rose to ${Math.max(...values)}`);

  assert.ok(degenerate.length > 0, 'the degenerate control did not reach this check');
  assert.ok(
    degenerate.every((v) => v === 0),
    'a design with no charge column returned a non-zero uniformity index',
  );
});

test('the passing interpolation is monotone and lands at the mean size', () => {
  const curve = rosinRammler(0.3, 1.2);
  assert.ok(Math.abs(passingAt(curve, 0.3) - 0.5) < 1e-4);
  for (let i = 1; i < curve.passing.length; i += 1) {
    assert.ok(curve.passing[i] >= curve.passing[i - 1] - 1e-12, `point ${i} decreased`);
  }
});

test('every case the index declares actually shipped', () => {
  assert.equal(cases.length, index.n_cases);
  assert.ok(index.benchmark, 'the cross-case benchmark did not ship');
});

test('every artifact path the app fetches is root-absolute', () => {
  // A relative path resolves against the CURRENT route. GitHub Pages serves a route as a directory
  // and redirects /benchmark to /benchmark/, so `data/x.json` became `/benchmark/data/x.json` and
  // 404ed on every route except the landing page. A local preview server does not redirect, so the
  // base URL stays at the root and nothing fails locally. This reads the source rather than the
  // behaviour, because the behaviour needs the host to reproduce.
  const source = readFileSync(new URL('../src/lib/artifacts.ts', import.meta.url), 'utf8');
  const paths = [...source.matchAll(/fetchJson<[^>]+>\(\s*[`']([^`']+)[`']/g)].map((m) => m[1]);
  assert.ok(paths.length >= 3, `expected the three loaders, found ${paths.length}`);
  for (const path of paths) {
    assert.ok(path.startsWith('/'), `${path} is relative and will break on a nested route`);
  }
});

test('every arm in every shipped artifact has an entry in the arm catalogue', () => {
  // Without this, an arm the pipeline produces but the UI has never heard of renders as its raw id
  // with no tier, no label and no source. Two did: `svr-poly` and `oracle` appeared in the
  // benchmark table as bare slugs beside properly named models.
  const known = new Set(ARMS.map((a) => a.id));
  const seen = new Set<string>();
  for (const protocol of Object.values(benchmark.protocols)) {
    for (const id of Object.keys(protocol.arms)) seen.add(id);
  }
  for (const one of cases) {
    for (const id of Object.keys(one.predictions)) seen.add(id);
  }
  const missing = [...seen].filter((id) => !known.has(id));
  assert.deepEqual(missing, [], `arms with no catalogue entry: ${missing.join(', ')}`);
});

test('an arm declared as sharing a mean size predicts it and scores as its source on every case', () => {
  // The App folds these arms into a sentence under their source's row; that is only true if it holds here.
  const shared = ARMS.filter((a) => a.sharesMeanSizeWith);
  assert.deepEqual(shared.map((a) => a.id).sort(), ['crush-zone', 'kuz-ram', 'swebrec']);
  let compared = 0;
  cases.forEach((artifact, i) => {
    const caseId = index.cases[i].case_id;
    for (const arm of shared) {
      const source = arm.sharesMeanSizeWith as string;
      const own = artifact.scores[arm.id];
      const theirs = artifact.scores[source];
      assert.equal(own?.scoreable, theirs?.scoreable, `${caseId} ${arm.id}: scoreable`);
      for (const field of ['r2_identity', 'pearson_r2', 'rmse_m', 'n_scored', 'n_abstained'] as const) {
        assert.equal(own?.[field], theirs?.[field], `${caseId} ${arm.id}: ${field}`);
      }
      for (const [blastId, cell] of Object.entries(artifact.predictions[arm.id] ?? {})) {
        assert.equal(cell.x50_m, artifact.predictions[source]?.[blastId]?.x50_m, `${caseId} ${arm.id} ${blastId}`);
      }
      compared += 1;
    }
  });
  assert.equal(compared, shared.length * cases.length);
});

test('every field in every shipped artifact is named in the TypeScript contract mirror', () => {
  // The docs claimed "the web build fails on drift". It does not, and cannot: TypeScript is
  // structural, so a JSON file carrying a field the interface never declares type-checks perfectly
  // and the field is simply invisible to the app. Five already were, including
  // `best_learned_is_positive`, which is half of the kill criterion.
  //
  // This compares NAMES rather than types on purpose. A type mismatch surfaces the moment the field
  // is used; a missing name never surfaces at all.
  const mirror = readFileSync(new URL('../src/lib/contract.types.ts', import.meta.url), 'utf8');
  // Anywhere in the file, not only at the start of a line. The mirror declares plenty of small
  // shapes inline, `engine: { package: string; version: string }`, and a line-anchored match reports
  // every one of those as missing. That nearly sent a correct mirror off to be "fixed".
  const declared = new Set([...mirror.matchAll(/([a-z_][a-z0-9_]*)\??\s*:/gi)].map((m) => m[1]));

  // Paths whose keys are DATA, not schema: an arm id, a blast id, a variant id, a control name, a
  // protocol name. No interface can name them, and `*` matches exactly one such level.
  const dataKeyed = [
    'case.predictions', 'case.predictions.*', 'case.predictions.*.*',
    'case.variant_curves', 'case.variant_curves.*', 'case.variant_curves.*.*',
    'case.distributions', 'case.distributions.*', 'case.scores', 'case.scores.*',
    'case.controls', 'case.blasts.features', 'case.geometry_report',
    'case.geometry_report.*', 'case.case.title', 'case.case.reason', 'case.case.expected_band',
    'index.cases.expected_band',
    'case.variants.label', 'benchmark.duplicate_groups',
    'benchmark.protocols', 'benchmark.protocols.*.arms',
    'benchmark.network_seed_sweep.per_blast',
    'benchmark.published_reproduction', 'benchmark.published_reproduction.*',
    'benchmark.site_counts', 'benchmark.verdict.protocol_gap_random_minus_grouped',
    'index.case_paths', 'index.cases.title',
    // Schema v2 (0.05.000): maps keyed by an arm, a site, a blast, a support or a feature.
    'benchmark.protocols.*.arms.*.per_site', 'benchmark.protocols.*.arms.*.predictions',
    'benchmark.protocols.*.arms.*.supports', 'benchmark.verdict.supports',
    'benchmark.provenance', 'benchmark.site_meta',
    'benchmark.verdict.intervals_95', 'benchmark.verdict.intervals_95.*',
    'benchmark.verdict.dedup_minus_random_median', 'benchmark.verdict.published_random_split_figures',
    'benchmark.diagnostics.native_importance', 'benchmark.diagnostics.native_importance.*.values',
    'benchmark.diagnostics.outliers.anomaly_score', 'benchmark.diagnostics.outliers.flagged_by_site',
    'benchmark.diagnostics.published_importance', 'benchmark.diagnostics.published_importance.*',
    'benchmark.diagnostics.resampling_importance',
    'benchmark.diagnostics.resampling_importance.*.mean_increase_in_mse',
    'benchmark.diagnostics.resampling_importance.*.share',
    // Schema v3 (0.06.000): the width sweep, keyed by a stiffness group or a support.
    'benchmark.network_width_sweep.published_protocol', 'benchmark.network_width_sweep.published_widths',
    'benchmark.network_width_sweep.leave_one_site_out.hidden',
    'benchmark.network_width_sweep.leave_one_site_out.supports',
    // ControlBlock is deliberately open: `[key: string]: unknown`. Each control reports the counts
    // that make sense for the thing it controls, and forcing them into one shape would flatten
    // what each one measures.
    'case.controls.*',
  ].map((pattern) => new RegExp('^' + pattern.replace(/\./g, '\.').replace(/\*/g, '[^.]+') + '$'));

  const isDataKeyed = (path: string) => dataKeyed.some((re) => re.test(path));

  const missing = new Set<string>();
  const walk = (node: unknown, path: string[]): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, path);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const here = path.join('.');
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (!isDataKeyed(here) && !declared.has(key)) missing.add(`${here}.${key}`);
      walk(value, [...path, isDataKeyed(here) ? '*' : key]);
    }
  };

  walk(JSON.parse(readFileSync(join(DERIVED, 'benchmark.json'), 'utf8')), ['benchmark']);
  for (const one of cases) walk(one, ['case']);
  walk(index, ['index']);

  assert.deepEqual([...missing].sort(), [], `fields the mirror never names: ${[...missing].sort().join(', ')}`);
});

test('every fragment size is stated in one unit, whatever its magnitude', () => {
  // Until 0.06.000 the unit was picked by magnitude: "22 mm" sat above "11.0 cm" in one column.
  assert.equal(formatSize(0.022), '2.2 cm');
  assert.equal(formatSize(0.11), '11.0 cm');
  assert.equal(formatSize(0.96), '96.0 cm');
  assert.equal(formatSize(null), 'n/a');
  for (const metres of [0.004, 0.0999, 0.1, 0.45, 1.2]) assert.match(formatSize(metres), /^\d+\.\d cm$/);
});
