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

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { CaseArtifact, PredictionCell } from '../src/lib/contract.types';
import { refusalGroups, refusalsByReason, refusalsOfCase, RefusalsPanel } from '../src/viz/Panels';

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

// BL-049: when no arm is ranked, the refusals of every arm are listed, grouped by reason, in the language shown.

test('on a case where every arm abstains the refusals are listed for every arm, in both languages', () => {
  const a = artifacts.find((x) => x.case.id === 'ctrl-degenerate')!;
  assert.ok(a, 'ctrl-degenerate is committed');
  for (const lang of ['en', 'es'] as const) {
    const lists = refusalsOfCase(a, lang);
    assert.ok(lists.length >= 2, 'every arm that refuses is listed');
    for (const { arm, groups } of lists) {
      assert.ok(groups.size > 0, arm);
      for (const text of groups.keys()) {
        assert.ok(text.length > 0);
        if (lang === 'es') assert.match(text, /no es una voladura/, `${arm}: ${text}`);
        else assert.match(text, /is not a blast/, `${arm}: ${text}`);
      }
    }
  }
});

test('a ranked arm shows no refusal: only an arm that abstained is listed', () => {
  for (const a of artifacts) {
    for (const { arm, groups } of refusalsOfCase(a, 'en')) {
      const abstained = Object.values(a.predictions[arm]).filter((c) => c.abstained).length;
      assert.ok(abstained > 0, `${a.case.id}/${arm}`);
      assert.equal([...groups.values()].flat().length, abstained, `${a.case.id}/${arm}`);
    }
    for (const arm of Object.keys(a.predictions)) {
      const abstained = Object.values(a.predictions[arm]).some((c) => c.abstained);
      assert.equal(refusalsOfCase(a, 'en').some((l) => l.arm === arm), abstained, `${a.case.id}/${arm}`);
    }
  }
});

test('the refusal list is drawn on ctrl-degenerate, in the language shown, and says that no model answers', () => {
  const a = artifacts.find((x) => x.case.id === 'ctrl-degenerate')!;
  for (const lang of ['en', 'es'] as const) {
    const html = renderToStaticMarkup(createElement(RefusalsPanel, { artifact: a, noneAnswers: true, lang }));
    assert.match(html, /data-panel="refusals"/, lang);
    assert.match(html, lang === 'es' ? /Ningún modelo responde en este caso: todos rechazan/ : /No model answers on this case: every model refuses/, lang);
    assert.match(html, lang === 'es' ? /no es una voladura/ : /is not a blast/, lang);
    if (lang === 'es') assert.ok(!/this design is not a blast/.test(html), 'no English reason on the Spanish page');
    for (const { arm } of refusalsOfCase(a, lang)) assert.ok(html.includes(arm), arm);
    // Every arm refuses this design for one reason, so the list is one row, naming all the arms.
    const rows = refusalsByReason(a, lang);
    assert.equal(rows.length, 1, lang);
    assert.equal(rows[0].arms.length, refusalsOfCase(a, lang).length, lang);
    assert.equal(rows[0].blasts.length, a.blasts.length, lang);
  }
});

test('the Predict group lists the refusals where no arm is ranked and draws none beside a ranked arm', () => {
  const views = readFileSync(join(repo, 'frontend', 'src', 'workbench', 'views.tsx'), 'utf8');
  assert.match(views, /const listed = !ranked && refusalsOfCase\(sel\.artifact, 'en'\)\.length > 0;/, 'listed means: no arm ranked and some refusal');
  const unranked = views.slice(views.indexOf('{ranked ? ('));
  assert.match(unranked, /\) : listed \? \([\s\S]*<RefusalsPanel /, 'the unranked branch lists the refusals');
  const ranked = unranked.slice(0, unranked.indexOf(') : listed'));
  assert.ok(!ranked.includes('<RefusalsPanel'), 'the ranked branch does not');
  assert.ok(ranked.includes('<AbstentionPanel'), 'the ranked branch keeps its own arm list');
});
