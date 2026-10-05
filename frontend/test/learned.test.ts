/**
 * The learned tier in the browser, held to the fitted models.
 *
 * Every models file carries, as fixtures, the predictions of the ORIGINAL fitted models (numpy,
 * scikit-learn, xgboost) at all 116 shipped blasts. The TypeScript walker must reproduce them:
 * exactly for the tree models, whose arithmetic is comparisons and stored additions, and to 1e-12
 * relative for the models that call an exponential or a power, where two maths libraries may round
 * the last bit differently.
 *
 * It runs on the COMMITTED files, because those are what the site serves.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { FEATURE_ORDER, fittedArms, predictModel } from '../src/engine/learned';
import type { CaseArtifact, CaseIndex, ModelsFile } from '../src/lib/contract.types';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');
const files: ModelsFile[] = readdirSync(join(DERIVED, 'models'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(DERIVED, 'models', name), 'utf8')));

const EXACT = new Set(['forest', 'xgboost', 'stacking']);

test('there is one models file per campaign plus the corpus', () => {
  assert.equal(files.length, 11);
  assert.ok(files.some((f) => f.scope === 'corpus' && f.held_out_site === null));
});

test('the walker reproduces every fitted model at every fixture', () => {
  let checked = 0;
  for (const file of files) {
    const arms = fittedArms(file);
    for (const [name, expected] of Object.entries(file.fixtures.expected)) {
      const model = arms[name];
      file.fixtures.inputs.forEach((input, i) => {
        const { value } = predictModel(model, input.features);
        const want = expected[i];
        if (want === null) {
          assert.equal(value, null, `${file.scope}/${name}/${input.blast_id}: expected a refusal`);
          return;
        }
        assert.notEqual(value, null, `${file.scope}/${name}/${input.blast_id}: refused, expected ${want}`);
        const tolerance = EXACT.has(model.kind) ? 0 : 1e-12 * Math.abs(want);
        assert.ok(
          Math.abs((value as number) - want) <= tolerance,
          `${file.scope}/${name}/${input.blast_id}: TypeScript ${value} against the fitted model ${want}`,
        );
        checked += 1;
      });
    }
  }
  assert.ok(checked > 8000, `only ${checked} fixtures were checked`);
});

test('the learned predictions the App replays are what the shipped models return', () => {
  const index: CaseIndex = JSON.parse(readFileSync(join(DERIVED, 'manifests', 'index.json'), 'utf8'));
  const byScope = new Map(files.map((f) => [f.scope, fittedArms(f)]));
  let checked = 0;
  for (const entry of index.cases) {
    const artifact: CaseArtifact = JSON.parse(readFileSync(join(DERIVED, entry.artifact_path), 'utf8'));
    const arms = byScope.get(artifact.live_models?.scope ?? '');
    assert.ok(arms, `${entry.case_id}: no models for scope ${artifact.live_models?.scope}`);
    for (const name of ['random-forest', 'xgboost', 'stacking', 'published-neural-net', 'svr-rbf', 'refitted-regression']) {
      if (!arms[name]) continue;
      for (const blast of artifact.blasts) {
        const cell = artifact.predictions[name]?.[blast.blast_id];
        if (!cell || cell.x50_m === null || blast.degenerate_reason) continue;
        const { value } = predictModel(arms[name], FEATURE_ORDER.map((f) => blast.features[f]));
        // The replay is rounded to six decimals; the live value is not.
        assert.ok(value !== null && Math.abs(value - cell.x50_m) <= 5e-7, `${entry.case_id}/${name}/${blast.blast_id}: ${value} against ${cell.x50_m}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 400, `only ${checked} case predictions were checked`);
});

test('a design outside the physical range is refused, not drawn', () => {
  const corpus = files.find((f) => f.scope === 'corpus') as ModelsFile;
  const power = fittedArms(corpus)['refitted-regression'];
  // A modulus of 0.5 GPa with a 15:1 bench pushes the refitted power law to about 377 m.
  const { value, reason } = predictModel(power, [3, 15, 80, 0.1, 0.05, 10, 0.5]);
  assert.equal(value, null);
  assert.match(reason ?? '', /plausible fragment range/);
});
