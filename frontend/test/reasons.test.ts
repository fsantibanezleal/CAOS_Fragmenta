/**
 * BL-039: every baked reason is shown in the language of the page and never falls back to English on a Spanish one.
 * The Predict group's abstention list groups by the text of the language shown; the fallback for an absent reason is
 * bilingual and does not occur on the committed bake.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { CaseArtifact, PredictionCell } from '../src/lib/contract.types';
import { refusalGroups } from '../src/viz/Panels';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const derived = join(repo, 'data', 'derived');
const index = JSON.parse(readFileSync(join(derived, 'manifests', 'index.json'), 'utf8')) as { cases: { case_id: string; artifact_path: string }[] };
const artifacts: CaseArtifact[] = index.cases.map((c) => JSON.parse(readFileSync(join(derived, c.artifact_path), 'utf8')));

const cell = (reason: PredictionCell['reason']): PredictionCell => ({
  x50_m: null, abstained: true, reason, extrapolated: false, group: null, cv: null, n_simulations: null,
});

test('the abstention list groups by the text of the language shown, on every arm of every committed case', () => {
  let groups = 0;
  for (const a of artifacts) {
    for (const [arm, row] of Object.entries(a.predictions)) {
      const refusals = Object.entries(row).filter(([, c]) => c.abstained);
      const english = new Set(refusals.map(([, c]) => c.reason!.en));
      for (const lang of ['en', 'es'] as const) {
        const got = refusalGroups(refusals, lang);
        assert.equal(got.size, new Set(refusals.map(([, c]) => c.reason![lang])).size, `${a.case.id}/${arm}/${lang}`);
        for (const text of got.keys()) {
          assert.ok(text.length > 0, `${a.case.id}/${arm}`);
          if (lang === 'es') assert.ok(!english.has(text), `${a.case.id}/${arm}: an English reason on the Spanish page: ${text}`);
        }
        groups += got.size;
      }
    }
  }
  assert.ok(groups > 0);
});

test('a refusal with no reason says so in the language shown, never in English on the Spanish page', () => {
  const refusals: [string, PredictionCell][] = [['B1', cell(null)], ['B2', cell(null)]];
  assert.deepEqual([...refusalGroups(refusals, 'en').entries()], [['no reason recorded', ['B1', 'B2']]]);
  assert.deepEqual([...refusalGroups(refusals, 'es').entries()], [['sin razón registrada', ['B1', 'B2']]]);
});

test('no committed refusal lacks a reason, so the fallback does not occur', () => {
  for (const a of artifacts) {
    for (const row of Object.values(a.predictions)) {
      for (const c of Object.values(row)) if (c.abstained) assert.ok(c.reason && c.reason.en && c.reason.es, a.case.id);
    }
  }
});

test('the two languages of a refusal group together or apart in the same way', () => {
  const same = { en: 'e', es: 's' };
  const refusals: [string, PredictionCell][] = [['B1', cell(same)], ['B2', cell(same)], ['B3', cell({ en: 'f', es: 't' })]];
  assert.equal(refusalGroups(refusals, 'en').size, 2);
  assert.equal(refusalGroups(refusals, 'es').size, 2);
  assert.deepEqual(refusalGroups(refusals, 'es').get('s'), ['B1', 'B2']);
});
