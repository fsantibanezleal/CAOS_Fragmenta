/**
 * The product's charts on the shell's `UPlotChart` (BL-042, shell 0.17.0 and 0.18.0): the three kinds (the size distribution, the
 * parity plot, the lines) and the pages that draw them, rendered to markup. The shell's chart declares what it was asked
 * to draw on its host element (`data-series`, `data-log-x`, `data-y-marks`, `data-overlay`, `data-parity`, `data-pick`),
 * so these tests read the declaration; the pixels are the gate's. The last tests hold the removal: the product carries no
 * uPlot wrapper of its own and nothing imports one.
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
const { SizeCurves, ParityPlot, Lines, SERIES_COLOURS, lineChartProps } = await import('../src/viz/plots');
const { TOPICS: BENCH_TOPICS } = await import('../src/pages/benchmark/index');
const { TOPICS: EXP_TOPICS } = await import('../src/pages/experiments/topics');

const FRONTEND = process.cwd();
const SRC = join(FRONTEND, 'src');
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

const SIZES = [0.0001, 0.001, 0.01, 0.1, 1, 3];
const CURVES = [
  { id: 'a', label: { en: 'Classical', es: 'Clásica' }, values: [0, 0.01, 0.1, 0.5, 0.9, 1] },
  { id: 'b', label: { en: 'Three-parameter', es: 'Tres parámetros' }, values: [0.05, 0.1, 0.2, 0.5, 0.8, 0.99] },
  { id: 'c', label: { en: 'Crush zone', es: 'Zona triturada' }, values: [0, 0.02, 0.15, 0.55, 0.92, 1], dashed: true },
];
const P = [
  { fraction: 0.2, label: 'P20' },
  { fraction: 0.5, label: 'P50' },
  { fraction: 0.8, label: 'P80' },
];

// ------------------------------------------------------------------------------------------ the size distribution

test('the size distribution is the shell chart on a log x axis with its percentile lines, markers and measured point', () => {
  const html = render(
    createElement(SizeCurves, {
      sizesM: SIZES,
      curves: CURVES,
      percentiles: P,
      measured: [{ sizeM: 0.3, passing: 0.5 }],
      sizeMarkers: [{ sizeM: 0.8, label: { en: 'in-situ block', es: 'bloque in situ' } }],
      height: 240,
    }),
  );
  const [host, ...rest] = hosts(html);
  assert.equal(rest.length, 0, 'one chart');
  assert.equal(host['data-log-x'], '1', 'the size axis is logarithmic');
  assert.equal(host['data-y-marks'], '3', 'P20, P50 and P80');
  assert.equal(host['data-overlay'], '1', 'the measured point, on its own x');
  assert.equal(host['data-series'], '4', 'three curves and the measured point');
  assert.equal(host['data-y-drag'], undefined, 'the percentile lines are not draggable (they never were)');
  assert.match(html, /class="fr-chart"/, 'drawn in the product card');
});

test('the size distribution with no measured point and a single curve declares no overlay and no key', () => {
  const html = render(createElement(SizeCurves, { sizesM: SIZES, curves: CURVES.slice(0, 1), height: 'fill' }));
  const [host] = hosts(html);
  assert.equal(host['data-overlay'], undefined);
  assert.equal(host['data-y-marks'], undefined);
  assert.equal(host['data-series'], '1');
  assert.doesNotMatch(html, /caos-chart-legend/, 'a single curve needs no key');
  assert.match(html, /class="caos-chart fill"/, 'filling, it takes the box the stage gives it');
});

test('the curves keep the product colours in order, and a dashed curve its dash, in both languages', () => {
  assert.deepEqual([...SERIES_COLOURS], ['--color-accent', '--color-good', '--color-warn', '--color-bad', '--color-accent-2', '--color-magenta']);
  for (const lang of ['en', 'es'] as const) {
    const html = render(createElement(SizeCurves, { sizesM: SIZES, curves: CURVES, height: 240 }), lang);
    const keys = [...html.matchAll(/<li class="caos-chart-key"([^>]*)><span[^>]*--swatch:var\((--[\w-]+)\)[^>]*><\/span>([^<]*)<\/li>/g)];
    assert.deepEqual(keys.map((k) => k[2]), ['--color-accent', '--color-good', '--color-warn']);
    assert.deepEqual(keys.map((k) => k[3]), CURVES.map((c) => c.label[lang]));
    assert.match(keys[2][1], /data-dash="1"/, 'the crush zone is dashed');
    assert.doesNotMatch(keys[0][1], /data-dash/);
  }
});

// ------------------------------------------------------------------------------------------------ the parity plot

const BLASTS = [
  { blastId: 'a1', site: 'Murgul', measuredM: 0.2, predictedM: 0.25 },
  { blastId: 'a2', site: 'Miami', measuredM: 0.1, predictedM: 0.12, extrapolated: true },
  { blastId: 'a3', site: 'Soma', measuredM: 0.4, predictedM: 0.3 },
];

test('the parity plot is the shell chart in its parity form, with the identity range, the null line and a pick', () => {
  const html = render(createElement(ParityPlot, { points: BLASTS, nullMeanM: 0.2, selected: 'a3', onSelect: () => {}, height: 320 }));
  const [host] = hosts(html);
  assert.equal(host['data-parity'], '1');
  assert.equal(host['data-pick'], '1', 'a click selects a blast');
  assert.equal(host['data-y-marks'], '1', 'the null model');
  assert.equal(host['data-series'], '3', 'blasts, outside the training range, the selected blast');
  assert.match(html, /class="fr-chart fr-parity"/);
});

test('the parity plot without a selection handler or a null level asks for neither', () => {
  const html = render(createElement(ParityPlot, { points: BLASTS.filter((b) => !b.extrapolated), fill: true }));
  const [host] = hosts(html);
  assert.equal(host['data-pick'], undefined);
  assert.equal(host['data-y-marks'], undefined);
  assert.equal(host['data-series'], '1');
  assert.match(html, /class="fr-chart fr-parity fill"/);
});

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

const TICKS = [
  { value: 0, label: { en: 'random', es: 'aleatorio' } },
  { value: 1, label: { en: 'deduplicated', es: 'deduplicado' } },
  { value: 2, label: { en: 'site held out', es: 'sitio excluido' } },
];
const LINE_BASE = { x: [0, 1, 2], series: [{ id: 's1', label: 'one', values: [1, 2, 3] }], xLabel: 'x', yLabel: 'y' };

test('lines pass the named ticks, the x range, the solo key, the dots and an unlabelled zero line to the shell chart (0.18.0)', () => {
  const asked = lineChartProps({ ...LINE_BASE, xTicks: TICKS, xRange: [-0.12, 2.12], solo: true, zeroLine: true }, 'en');
  assert.deepEqual(asked.x.ticks, TICKS);
  assert.deepEqual(asked.x.range, [-0.12, 2.12]);
  assert.equal(asked.solo, true);
  assert.equal(asked.series[0].dots, true, 'fewer than 40 x values: a dot at each value');
  assert.deepEqual(asked.yMarks, [{ y: 0, tone: 'neutral' }], 'the zero line carries no label');
  assert.equal('label' in (asked.yMarks?.[0] ?? {}), false);
  const plain = lineChartProps(LINE_BASE, 'en');
  assert.equal(plain.x.ticks, undefined);
  assert.equal(plain.x.range, undefined);
  assert.equal(plain.solo, undefined);
  assert.equal(plain.yMarks, undefined);
});

test('lines draw no dots from 40 x values on, as the wrapper did', () => {
  const x = Array.from({ length: 40 }, (_, i) => i);
  const props = lineChartProps({ ...LINE_BASE, x, series: [{ id: 's', label: 's', values: x }] }, 'en');
  assert.equal(props.series[0].dots, undefined);
  const short = lineChartProps({ ...LINE_BASE, x: x.slice(0, 39), series: [{ id: 's', label: 's', values: x.slice(0, 39) }] }, 'en');
  assert.equal(short.series[0].dots, true);
});

test('the readout names an x on a tick by its label in the page language, never by its number', () => {
  for (const lang of ['en', 'es'] as const) {
    const props = lineChartProps({ ...LINE_BASE, xTicks: TICKS }, lang);
    assert.match(props.readout?.(1) ?? '', new RegExp(`^${TICKS[1].label[lang]} · one 2`));
  }
});

test('a lines chart with one series keeps the solo key', () => {
  const html = render(createElement(Lines, { ...LINE_BASE, solo: true }));
  assert.match(hosts(html)[0]['data-series'], /^1$/);
  assert.match(html, /caos-chart-legend/);
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


test('each page asks for what the removed wrapper gave its chart, in both languages', () => {
  const read = (html: string) => {
    const m = [...html.matchAll(/<div class="fr-chart"([^>]*)>/g)].map((x) => Object.fromEntries([...x[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
    return m;
  };
  const es = { en: 'random|deduplicated|site held out', es: 'aleatorio|deduplicado|sitio excluido' };
  for (const lang of ['en', 'es'] as const) {
    const [ps] = read(topic(EXP_TOPICS as never, 'protocol-sensitivity', { es: lang === 'es', b: benchmark }, lang));
    assert.equal(ps['data-x-ticks'], es[lang], `${lang}: the protocols name the axis`);
    assert.equal(ps['data-x-range'], '-0.12,2.12');
    assert.equal(ps['data-solo-key'], '1');
    const pub = read(topic(BENCH_TOPICS as never, 'published', { b: benchmark, corpus }, lang));
    assert.ok(pub.length >= 2 && pub.every((h) => h['data-solo-key'] === '1'), `${lang}: a solo key on every published chart`);
    const sweep = pub.find((h) => h['data-x-ticks']);
    assert.ok(sweep, `${lang}: the width sweep ticks at the widths`);
    assert.equal(sweep['data-x-ticks'], benchmark.network_width_sweep.leave_one_site_out.filter((r) => !r.published).map((r) => String(Math.round(r.hidden['1']))).join('|'));
    const rob = read(topic(BENCH_TOPICS as never, 'robustness', { b: benchmark, corpus }, lang));
    assert.ok(rob.length >= 1 && rob.every((h) => h['data-solo-key'] === '1'));
  }
});

// ------------------------------------------------------------------------------------------------ the removal

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('the product carries no uPlot wrapper of its own and no file imports one', () => {
  assert.equal(existsSync(join(SRC, 'viz', 'Charts.tsx')), false, 'viz/Charts.tsx is removed');
  const offenders = sources(SRC).filter((file) => {
    const text = readFileSync(file, 'utf8');
    return /from\s+['"]uplot['"]|from\s+['"][^'"]*viz\/Charts['"]|uplot\/dist/.test(text);
  });
  assert.deepEqual(offenders, [], 'nothing imports uplot or the removed wrapper');
});
