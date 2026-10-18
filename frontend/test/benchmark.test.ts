/**
 * The Benchmark page (ADR-0017 section 2.1): six topics on the shell's DocPage and DocSection, every area of the
 * Benchmark table present at its floor in both languages. The shell gate (`caos-shell-gate`, check ADR-0017.2) measures
 * the rendered page at integration; this test holds the floors that can be counted without layout: the areas of every
 * topic, the table, chart and control floors, the single honest or strong callout, captioned equations and figures, the
 * lede, the Spanish text being Spanish, every number read from the committed documents, and every cited id defined.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS, SECTION_REFS } from '../src/data/citations';
import { BENCHMARK_REFS } from '../src/data/citations/benchmark';
import type { BenchmarkArtifact, GroupedArmBlock, ModelsFile } from '../src/lib/contract.types';
import type { TopicData } from '../src/pages/benchmark/shared';

// The charts import the uPlot stylesheet, which Node cannot load: the page modules are imported after this hook
// answers a stylesheet with an empty module (the bundler does the real work in the build).
registerHooks({
  load(url, context, nextLoad) {
    return url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context);
  },
});
const { BenchmarkPage } = await import('../src/pages/Benchmark');
const { TOPICS } = await import('../src/pages/benchmark/index');

const FRONTEND = process.cwd();
const DERIVED = join(FRONTEND, '..', 'data', 'derived');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(DERIVED, path), 'utf8')) as T;
const benchmark = readJson<BenchmarkArtifact>('benchmark.json');
const corpus = readJson<ModelsFile>('models/corpus.json');
const FULL: TopicData = { b: benchmark, corpus };
const NO_MODELS: TopicData = { b: benchmark, corpus: null };

type Lang = 'en' | 'es';

/** Render with the shell's console errors collected: an equation without a caption or an unknown citation is one. */
function render(node: () => ReturnType<typeof createElement>, lang: Lang): { html: string; errors: string[] } {
  useLangStore.setState({ lang });
  Object.assign(useLangStore.getInitialState(), { lang });
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void errors.push(args.map(String).join(' '));
  try {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CitationsProvider, { items: CITATIONS, children: node() })));
    return { html, errors };
  } finally {
    console.error = original;
  }
}

const topicHtml = (id: string, lang: Lang, data: TopicData = FULL) => {
  const topic = TOPICS.find((t) => t.id === id);
  assert.ok(topic, `topic ${id}`);
  return render(() => createElement(topic.Body, data), lang);
};

/** Remove the KaTeX markup (equations are not text) by balancing its spans. */
function stripMath(html: string): string {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const at = html.indexOf('<span class="katex', i);
    if (at < 0) return out + html.slice(i);
    out += html.slice(i, at);
    let depth = 0;
    let j = at;
    for (;;) {
      const open = html.indexOf('<span', j);
      const close = html.indexOf('</span>', j);
      if (open >= 0 && open < close) {
        depth += 1;
        j = open + 5;
      } else {
        depth -= 1;
        j = close + 7;
        if (depth === 0) break;
      }
    }
    i = j;
  }
  return out;
}

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
const textOf = (html: string) => decode(stripMath(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const words = (s: string) => (s ? s.split(/\s+/).length : 0);

function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p(?=[\s>])(?![^>]*callout-title)[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
}

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const equations = (html: string) => count(html, /class="equation"/g);
const captionedEquations = (html: string) => count(html, /class="equation-caption"/g);
const figures = (html: string) =>
  html.split('<figure').slice(1).filter((f) => f.includes('<svg') && /<figcaption[^>]*>[^<]+/.test(f)).length;
const honest = (html: string) => count(html, /data-callout="honest"/g);
const strong = (html: string) => count(html, /data-callout="strong"/g);
const tables = (html: string) => count(html, /<table\b/g);
const charts = (html: string) => count(html, /class="fr-chart"/g);
const controls = (html: string) => count(html, /data-control="/g);

/** The sections of a rendered topic: its area, and the markup from its tag on. */
function sections(html: string): { area: string | null; html: string }[] {
  return html
    .split('<section')
    .slice(1)
    .map((chunk) => ({ area: /data-area="([^"]+)"/.exec(chunk.split('>')[0])?.[1] ?? null, html: `<section${chunk}` }));
}

/** The areas each topic carries, in the order of its sections (the mapping of the unit's brief). */
const EXPECTED: [string, string[]][] = [
  ['verdict', ['caveat', 'results']],
  ['arms', ['results', 'results', 'comparison']],
  ['published', ['comparison', 'robustness']],
  ['robustness', ['robustness']],
  ['live', ['live']],
  ['provenance', ['provenance', 'provenance']],
];

test('the page has the six topics of the mapping, at most six peers, each with a bilingual label', () => {
  assert.deepEqual(
    TOPICS.map((t) => t.id),
    EXPECTED.map(([id]) => id),
  );
  assert.ok(TOPICS.length <= 6, 'six peers, no more (ADR-0071 rule 5)');
  for (const t of TOPICS) assert.ok(t.label.en.length > 3 && t.label.es.length > 3, t.id);
});

for (const lang of ['en', 'es'] as const) {
  test(`every topic carries its areas, each at its floor, in ${lang}`, () => {
    const caveat: string[] = [];
    for (const [id, areas] of EXPECTED) {
      const { html, errors } = topicHtml(id, lang);
      const found = sections(html);
      assert.deepEqual(found.map((s) => s.area), areas, `${id}: the areas of its sections`);
      assert.equal(count(html, /data-doc-section/g), areas.length, `${id}: one DocSection per area entry`);
      for (const s of found) {
        assert.match(s.html, /data-refs="[1-9]\d*"/, `${id}/${s.area}: at least one reference declared`);
        if (s.area === 'results' || s.area === 'comparison') assert.ok(tables(s.html) + charts(s.html) >= 1, `${id}/${s.area}: a table or chart`);
        if (s.area === 'robustness') assert.ok(charts(s.html) >= 1, `${id}/${s.area}: a chart`);
        if (s.area === 'live') assert.ok(controls(s.html) >= 1, `${id}/${s.area}: a control registered with the panel`);
        if (s.area === 'provenance') assert.ok(tables(s.html) >= 1, `${id}/${s.area}: a table`);
        if (s.area === 'caveat') caveat.push(s.html);
      }
      assert.equal(equations(html), captionedEquations(html), `${id}: every equation has a caption`);
      assert.deepEqual(errors, [], `${id} (${lang}): the shell reported ${errors.join(' | ')}`);
    }
    assert.equal(caveat.length, 1, 'exactly one caveat section on the page');
    assert.equal(honest(caveat[0]) + strong(caveat[0]), 1, 'exactly one honest or strong callout in the caveat area');
  });

  test(`the whole page holds exactly one honest or strong callout, and captioned figures and equations, in ${lang}`, () => {
    let honestOrStrong = 0;
    let figs = 0;
    let eqs = 0;
    for (const [id] of EXPECTED) {
      const { html } = topicHtml(id, lang);
      honestOrStrong += honest(html) + strong(html);
      figs += figures(html);
      eqs += captionedEquations(html);
    }
    assert.equal(honestOrStrong, 1, 'one honest or strong callout on the page');
    assert.ok(figs >= 4, `${figs} captioned figures`);
    assert.ok(eqs >= 3, `${eqs} captioned equations`);
  });

  test(`the live panel renders its controls while the models load, and the page has a lede of 35 words, in ${lang}`, () => {
    const { html } = topicHtml('live', lang, NO_MODELS);
    assert.ok(controls(html) >= 2, 'the set and the arm controls');
    const page = render(() => createElement(BenchmarkPage, FULL), lang);
    assert.match(page.html, /data-doc-page/, 'DocPage');
    const lede = /<p class="lede">([\s\S]*?)<\/p>/.exec(page.html);
    assert.ok(lede, 'lede');
    assert.ok(words(textOf(lede[1])) >= 35, `${lang}: lede of ${words(textOf(lede[1]))} words`);
    for (const t of TOPICS) assert.ok(page.html.includes(t.label[lang]), `${lang}: tab ${t.id}`);
    assert.deepEqual(page.errors, [], page.errors.join(' | '));
  });
}

test('the Spanish paragraphs are Spanish: none equals an English one, few English function words, decimal commas', () => {
  const english = /\b(?:the|and|of|which|with|is|are|that|this|from|on)\b/gi;
  for (const [id] of EXPECTED) {
    const en = new Set(paragraphs(topicHtml(id, 'en').html));
    const es = paragraphs(topicHtml(id, 'es').html).filter((p) => words(p) >= 25);
    assert.ok(es.length >= 1, `${id}: Spanish paragraphs`);
    for (const p of es) {
      assert.ok(!en.has(p), `${id}: an English paragraph shown in Spanish: ${p.slice(0, 60)}`);
      const plain = p.replace(/\([^()]*\d{4}[^()]*\)/g, ' ').replace(/\b[A-Z][A-Za-z-]+ et al\.?/g, ' ');
      const share = count(plain, english) / words(plain);
      assert.ok(share < 0.05, `${id}: ${Math.round(share * 100)} percent English function words in: ${p.slice(0, 60)}`);
      assert.doesNotMatch(plain.replace(/\d+\.\d+\.\d+|CC BY \d+\.\d+/g, ''), /\b\d+\.\d+\b/, `${id}: a point decimal in Spanish: ${p.slice(0, 80)}`);
    }
  }
});

test('the numbers read from the committed documents are on the page, formatted for the language', () => {
  const v = benchmark.verdict;
  const all = v.supports.all.best_learned_r2_identity.toFixed(3);
  const verdictEn = textOf(topicHtml('verdict', 'en').html);
  const verdictEs = textOf(topicHtml('verdict', 'es').html);
  assert.ok(verdictEn.includes(all), 'the best learned score over every blast');
  assert.ok(verdictEs.includes(all.replace('.', ',')), 'the same, with a decimal comma');
  const common = (benchmark.protocols['leave-one-site-out'].arms.null as GroupedArmBlock).common;
  assert.ok(textOf(topicHtml('arms', 'en').html).includes(`${common.n_rows} blasts from ${common.n_sites} sites`), "the common rows are the artifact's");
  assert.ok(textOf(topicHtml('arms', 'es').html).includes(`${common.n_rows} tiros de ${common.n_sites} sitios`), 'the common rows, in Spanish');
  const sweep = benchmark.network_seed_sweep;
  assert.ok(textOf(topicHtml('published', 'en').html).includes(`${sweep.n_seeds} seeds`), "the seed sweep size is the artifact's");
  const published = v.published_random_split_figures.stacking?.published;
  assert.ok(published !== undefined);
  assert.ok(textOf(topicHtml('robustness', 'es').html).includes(String(published).replace('.', ',')), 'the published figure of one random split');
  const miami = benchmark.site_meta.Miami;
  assert.ok(textOf(topicHtml('provenance', 'en').html).includes(String(miami.n_blasts)), 'the per-site blast count');
});

test('no topic prints a placeholder of a failed interpolation, in either language', () => {
  for (const lang of ['en', 'es'] as const) {
    for (const [id] of EXPECTED) {
      assert.doesNotMatch(textOf(topicHtml(id, lang).html), /\[object|undefined|NaN/, `${id} (${lang})`);
    }
  }
});

test('the verdict callout keeps its logic: strong unless the tier generalises and the verdict does not depend on the row set', () => {
  const v = benchmark.verdict;
  const { html } = topicHtml('verdict', 'en');
  const expected = v.generalises_across_sites && !v.depends_on_support ? 'note' : 'strong';
  assert.match(html, new RegExp(`data-callout="${expected}"`), 'the variant the committed verdict gives');
  assert.equal(expected, 'strong', 'the committed verdict leaves exactly one strong callout for the caveat area');
});

test('the references: every key the page lists is defined, every id exists in CITATIONS, no duplicate', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  for (const [key, ids] of Object.entries(BENCHMARK_REFS)) {
    assert.ok(key.startsWith('b-'), `${key}: the key keeps the page's prefix`);
    assert.equal(SECTION_REFS[key], ids);
    assert.equal(new Set(ids).size, ids.length, `${key}: a duplicate reference`);
    for (const id of ids) assert.ok(defined.has(id), `${key}: ${id} is not defined`);
  }
  const dir = join(FRONTEND, 'src', 'pages', 'benchmark');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    const source = readFileSync(join(dir, file), 'utf8');
    for (const m of source.matchAll(/<Cite id="([^"]+)"/g)) assert.ok(defined.has(m[1]), `${file} cites ${m[1]}, which is not defined`);
    for (const m of source.matchAll(/SECTION_REFS\['([^']+)'\]/g)) assert.ok(BENCHMARK_REFS[m[1]], `${file}: ${m[1]} is not a Benchmark key`);
  }
});

test('content standards: no em-dash, arrow or emoji, no internal reference, no raw toFixed in the page files', () => {
  const dir = join(FRONTEND, 'src', 'pages');
  const files = [
    join(dir, 'Benchmark.tsx'),
    ...readdirSync(join(dir, 'benchmark')).map((f) => join(dir, 'benchmark', f)),
    join(FRONTEND, 'src', 'viz', 'figures', 'benchmark.tsx'),
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /[\u2014\u2192\u2190\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u, `${file}: em-dash, arrow or emoji`);
    assert.doesNotMatch(text, /\.toFixed\(/, `${file}: raw toFixed`);
    assert.doesNotMatch(text, /\bBL-\d+|CAOS_MANAGE|[A-Z]:[\\/]/, `${file}: an internal reference`);
  }
  for (const lang of ['en', 'es'] as const) {
    for (const [id] of EXPECTED) {
      assert.doesNotMatch(textOf(topicHtml(id, lang).html), /[\u2014\u2192\u2190]/u, `${id}: em-dash or arrow in the rendered text`);
    }
  }
});
