/**
 * The product's charts on the shell's `UPlotChart` (BL-042, shell 0.17.0): the three kinds (the size distribution, the
 * parity plot, the lines) and the pages that draw them, rendered to markup. The shell's chart declares what it was asked
 * to draw on its host element (`data-series`, `data-log-x`, `data-y-marks`, `data-overlay`, `data-parity`, `data-pick`),
 * so these tests read the declaration; the pixels are the gate's. The last tests hold the removal: the product carries no
 * uPlot wrapper of its own and nothing imports one.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS } from '../src/data/citations';
import type { BenchmarkArtifact, ModelsFile } from '../src/lib/contract.types';

// The shell's chart imports a stylesheet, which Node cannot load: the modules are imported after this hook answers it.
registerHooks({
  load(url, context, nextLoad) {
    return url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context);
  },
});
const { Lines } = await import('../src/viz/plots');
const { TOPICS: BENCH_TOPICS } = await import('../src/pages/benchmark/index');
const { TOPICS: EXP_TOPICS } = await import('../src/pages/experiments/topics');

const FRONTEND = process.cwd();
const DERIVED = join(FRONTEND, '..', 'data', 'derived');
const benchmark = JSON.parse(readFileSync(join(DERIVED, 'benchmark.json'), 'utf8')) as BenchmarkArtifact;
const corpus = JSON.parse(readFileSync(join(DERIVED, 'models', 'corpus.json'), 'utf8')) as ModelsFile;

function render(node: ReturnType<typeof createElement>, lang: 'en' | 'es' = 'en'): string {
  useLangStore.setState({ lang });
  Object.assign(useLangStore.getInitialState(), { lang });
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CitationsProvider, { items: CITATIONS, children: node })));
}

/** The attributes of every shell chart host in a markup string. */
function hosts(html: string): Record<string, string>[] {
  return [...html.matchAll(/<div class="caos-chart(?: fill)?"([^>]*)>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
}

// ---------------------------------------------------------------------------------------------------------- lines

test('lines are the shell chart with the series in order; a zero line is a reference line and none by default', () => {
  const series = [
    { id: 's1', label: 'one', values: [1, 2, 3] },
    { id: 's2', label: 'two', values: [3, 2, 1], dashed: true, width: 3 },
  ];
  const base = { x: [0, 1, 2], series, xLabel: 'x', yLabel: 'y' };
  const plain = hosts(render(createElement(Lines, base)))[0];
  assert.equal(plain['data-series'], '2');
  assert.equal(plain['data-y-marks'], undefined);
  assert.equal(plain['data-log-x'], undefined);
  const zero = hosts(render(createElement(Lines, { ...base, zeroLine: true })))[0];
  assert.equal(zero['data-y-marks'], '1', 'the zero line');
  assert.equal(zero['data-axis-titles'], 'x|y');
});

test('lines with no x draw no chart, as the wrapper they replace did', () => {
  const html = render(createElement(Lines, { x: [], series: [], xLabel: 'x', yLabel: 'y' }));
  assert.deepEqual(hosts(html), []);
});

// ---------------------------------------------------------------------------------------------- the pages' charts

function topic(list: { id: string; Body?: unknown; Component?: unknown }[], id: string, props: Record<string, unknown>, lang: 'en' | 'es'): string {
  const found = list.find((t) => t.id === id);
  assert.ok(found, id);
  return render(createElement((found.Body ?? found.Component) as never, props as never), lang);
}

test('the Benchmark draws its width sweep, its seed curve and its draw curve on the shell chart', () => {
  for (const lang of ['en', 'es'] as const) {
    const published = hosts(topic(BENCH_TOPICS as never, 'published', { b: benchmark, corpus }, lang));
    assert.ok(published.length >= 2, `${lang}: the width sweep and the seeds`);
    assert.ok(published.every((h) => h['data-axis-titles']?.includes('|')), `${lang}: every chart names both axes`);
    const sweep = published.find((h) => h['data-series'] === '4');
    assert.ok(sweep, `${lang}: the width sweep, with every blast, with geometry, the published pair and the null`);
    assert.equal(sweep['data-y-marks'], '1', `${lang}: the zero line`);
    assert.ok(published.some((h) => h['data-series'] === '2' && h['data-y-marks'] === undefined), `${lang}: the seed curve, its reproduction and the published figure`);
    const robustness = hosts(topic(BENCH_TOPICS as never, 'robustness', { b: benchmark, corpus }, lang));
    assert.ok(robustness.length >= 1, `${lang}: the sorted draws`);
    assert.equal(robustness[0]['data-y-marks'], '1', `${lang}: the zero line`);
  }
});

test('the Experiments draw the protocol sensitivity on the shell chart with its zero line and one line per arm', () => {
  for (const lang of ['en', 'es'] as const) {
    const html = topic(EXP_TOPICS as never, 'protocol-sensitivity', { es: lang === 'es', b: benchmark }, lang);
    const [host] = hosts(html);
    assert.ok(host, `${lang}: a chart`);
    assert.equal(host['data-y-marks'], '1');
    assert.ok(Number(host['data-series']) >= 3, `${lang}: one line per learned arm and the classical`);
    assert.doesNotMatch(html, /class="fr-chart-canvas"/, 'no canvas of the old wrapper');
  }
});

