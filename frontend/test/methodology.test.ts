/**
 * The Methodology page (ADR-0017 section 2.1): six method topics on the shell's DocPage and DocSection, each one `method`
 * section at its floor, in both languages. The shell gate (`caos-shell-gate`, check ADR-0017.2) measures the rendered page
 * at integration; this test holds the floors that can be counted without layout: dense paragraphs by word count, captioned
 * equations, captioned figures, callouts by variant, references, the Spanish text being Spanish, and every number read from
 * the committed documents.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS, SECTION_REFS } from '../src/data/citations';
import type { BenchmarkArtifact, ModelsFile } from '../src/lib/contract.types';
import Methodology from '../src/pages/Methodology';
import { TOPICS, type TopicData } from '../src/pages/methodology/index';

const FRONTEND = process.cwd();
const DERIVED = join(FRONTEND, '..', 'data', 'derived');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(DERIVED, path), 'utf8')) as T;
const benchmark = readJson<BenchmarkArtifact>('benchmark.json');
const corpus = readJson<ModelsFile>('models/corpus.json');
const FULL: TopicData = { b: benchmark, corpus };
const EMPTY: TopicData = { b: null, corpus: null };

type Lang = 'en' | 'es';

/** Render with the shell's console errors collected: an equation without a caption or an unknown citation is one. */
function render(node: () => ReturnType<typeof createElement>, lang: Lang): { html: string; errors: string[] } {
  // Server rendering reads the store's INITIAL state (zustand's server snapshot), so the language is set on both.
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

/** The visible paragraphs of a topic (the callout title is a paragraph of the shell and is not one of the page's). */
function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p(?=[\s>])(?![^>]*callout-title)[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
}

/** A paragraph counts when it holds 40 words, and mostly text rather than a link; the same text once. */
function dense(html: string): string[] {
  const seen = new Set<string>();
  for (const m of html.matchAll(/<p(?=[\s>])(?![^>]*callout-title)[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = textOf(m[1]);
    const linked = words(textOf([...m[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((a) => a[1]).join(' ')));
    if (words(text) >= 40 && linked * 2 < words(text)) seen.add(text);
  }
  return [...seen];
}

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const equations = (html: string) => count(html, /class="equation"/g);
const captionedEquations = (html: string) => count(html, /class="equation-caption"/g);
const figures = (html: string) =>
  html.split('<figure').slice(1).filter((f) => f.includes('<svg') && /<figcaption[^>]*>[^<]+/.test(f)).length;
const honest = (html: string) => count(html, /data-callout="honest"/g);
const strong = (html: string) => count(html, /data-callout="strong"/g);

const EXPECTED: [string, 'classical' | 'learned'][] = [
  ['mean-size', 'classical'],
  ['rock-factor', 'classical'],
  ['distributions', 'classical'],
  ['router', 'classical'],
  ['network', 'learned'],
  ['ensembles', 'learned'],
];

test('the page has the six method topics of the mapping, two of them learned, at most six peers', () => {
  assert.deepEqual(
    TOPICS.map((t) => [t.id, t.kind]),
    EXPECTED,
  );
  assert.ok(TOPICS.length >= 6 && TOPICS.length <= 6, 'six peers, no more (ADR-0071 rule 5)');
  assert.ok(TOPICS.filter((t) => t.kind === 'learned').length >= 2);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length);
  for (const t of TOPICS) assert.ok(t.label.en.length > 3 && t.label.es.length > 3, t.id);
});

for (const lang of ['en', 'es'] as const) {
  test(`every topic is one method section of its kind at the ADR-0017 floors, in ${lang}`, () => {
    for (const [id, kind] of EXPECTED) {
      const { html, errors } = topicHtml(id, lang);
      const sections = [...html.matchAll(/<section\b[^>]*data-area="method"[^>]*>/g)];
      assert.equal(sections.length, 1, `${id}: exactly one method section`);
      assert.match(sections[0][0], new RegExp(`data-method-kind="${kind}"`), `${id}: kind`);
      assert.equal(count(html, /data-doc-section/g), 1, `${id}: one DocSection`);
      assert.ok(dense(html).length >= 4, `${id} (${lang}): ${dense(html).length} dense paragraphs, the floor is 4`);
      assert.ok(captionedEquations(html) >= 2, `${id} (${lang}): ${captionedEquations(html)} captioned equations, the floor is 2`);
      assert.equal(equations(html), captionedEquations(html), `${id}: every equation has a caption`);
      assert.ok(figures(html) >= 1, `${id} (${lang}): a captioned figure`);
      assert.equal(honest(html), 1, `${id} (${lang}): exactly one honest callout`);
      assert.equal(strong(html), 0, `${id}: no strong callout`);
      assert.match(sections[0][0], /data-refs="[1-9]\d*"/, `${id}: at least one reference declared`);
      assert.deepEqual(errors, [], `${id} (${lang}): the shell reported ${errors.join(' | ')}`);
    }
  });

  test(`a topic still renders every area when no document has loaded, in ${lang}`, () => {
    for (const [id] of EXPECTED) {
      const { html, errors } = topicHtml(id, lang, EMPTY);
      assert.equal(count(html, /data-area="method"/g), 1, id);
      assert.ok(dense(html).length >= 4, `${id}: dense paragraphs without data`);
      assert.equal(honest(html), 1, id);
      assert.deepEqual(errors, [], `${id}: ${errors.join(' | ')}`);
    }
  });
}

test('the Spanish paragraphs are Spanish: none equals an English one, few English function words, decimal commas', () => {
  const english = /\b(?:the|and|of|which|with|is|are|that|this|from|on)\b/gi;
  for (const [id] of EXPECTED) {
    const en = new Set(paragraphs(topicHtml(id, 'en').html));
    const es = paragraphs(topicHtml(id, 'es').html).filter((p) => words(p) >= 40);
    assert.ok(es.length >= 4, `${id}: Spanish dense paragraphs`);
    for (const p of es) {
      assert.ok(!en.has(p), `${id}: an English paragraph shown in Spanish: ${p.slice(0, 60)}`);
      const plain = p.replace(/\([^()]*\d{4}[^()]*\)/g, ' ');
      const share = count(plain, english) / words(plain);
      assert.ok(share < 0.04, `${id}: ${Math.round(share * 100)} percent English function words in: ${p.slice(0, 60)}`);
      assert.doesNotMatch(plain.replace(/\d+\.\d+\.\d+/g, ''), /\b\d+\.\d+\b/, `${id}: a point decimal in Spanish: ${p.slice(0, 80)}`);
    }
  }
});

test('the numbers read from the committed documents are on the page, formatted for the language', () => {
  const trees = String(corpus.arms['random-forest'].kind === 'forest' ? corpus.arms['random-forest'].trees.length : -1);
  const boosting = String(corpus.arms.xgboost.kind === 'xgboost' ? corpus.arms.xgboost.trees.length : -1);
  const ens = topicHtml('ensembles', 'en').html;
  const ensEs = topicHtml('ensembles', 'es').html;
  assert.ok(textOf(ens).includes(`${trees} trees`), 'the forest size is the exported one');
  assert.ok(textOf(ens).includes(`${boosting} trees`), 'the boosting size is the exported one');
  assert.ok(textOf(ensEs).includes(`${trees} árboles`), 'the forest size, in Spanish');
  const net = corpus.arms['published-neural-net'];
  assert.equal(net.kind, 'network');
  if (net.kind === 'network') {
    const hidden = net.groups['1'].n_hidden;
    assert.ok(textOf(topicHtml('network', 'en').html).includes(`${9 * hidden + 1} free parameters`), 'free parameters from the exported width');
  }
  const transfer = corpus.arms['kuznetsov-transfer'];
  assert.equal(transfer.kind, 'kuznetsov-transfer');
  if (transfer.kind === 'kuznetsov-transfer') {
    const intercept = transfer.rock_factor.intercept.toFixed(3);
    assert.ok(textOf(topicHtml('rock-factor', 'en').html).includes(intercept), 'the transfer intercept');
    assert.ok(textOf(topicHtml('rock-factor', 'es').html).includes(intercept.replace('.', ',')), 'the transfer intercept, decimal comma');
  }
});

test('the references: every id a topic lists is defined, each topic lists at least one, and no topic lists the old protocols key', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  for (const t of TOPICS) {
    const ids = SECTION_REFS[t.refsKey];
    assert.ok(ids && ids.length >= 1, `${t.id}: references`);
    assert.ok(t.refsKey.startsWith('m-'), `${t.id}: the key keeps the page's prefix`);
    for (const id of ids) assert.ok(defined.has(id), `${t.id}: ${id} is not defined`);
    assert.equal(new Set(ids).size, ids.length, `${t.id}: a duplicate reference`);
  }
  assert.equal(SECTION_REFS['m-protocols'], undefined, 'the protocols moved to Experiments');
});

test('every inline Cite in a topic file is among that topic\'s references', () => {
  const dir = join(FRONTEND, 'src', 'pages', 'methodology');
  const FILES: Record<string, string> = {
    'mean-size': 'MeanSize.tsx',
    'rock-factor': 'RockFactor.tsx',
    distributions: 'Distributions.tsx',
    router: 'Router.tsx',
    network: 'Network.tsx',
    ensembles: 'Ensembles.tsx',
  };
  assert.ok(readdirSync(dir).filter((f) => f.endsWith('.tsx')).length >= 6, 'one file per topic');
  for (const t of TOPICS) {
    const source = readFileSync(join(dir, FILES[t.id]), 'utf8');
    const cited = new Set([...source.matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1]));
    assert.ok(cited.size >= 1, `${t.id}: cites inline`);
    for (const id of cited) assert.ok(SECTION_REFS[t.refsKey].includes(id), `${t.id} cites ${id} without listing it`);
  }
});

test('the page: DocPage with a lede of 35 words in both languages, the validation protocols pointed to Experiments, no Protocols tab', () => {
  for (const lang of ['en', 'es'] as const) {
    const { html, errors } = render(() => createElement(Methodology), lang);
    assert.match(html, /data-doc-page/, 'DocPage');
    const lede = /<p class="lede">([\s\S]*?)<\/p>/.exec(html);
    assert.ok(lede, 'lede');
    assert.ok(words(textOf(lede[1])) >= 35, `${lang}: lede of ${words(textOf(lede[1]))} words`);
    assert.match(textOf(lede[1]), lang === 'en' ? /Experiments/ : /Experimentos/, `${lang}: the protocols are on Experiments`);
    assert.deepEqual(errors, [], errors.join(' | '));
    assert.doesNotMatch(html, /Protocols and metrics|Protocolos y métricas/);
    for (const t of TOPICS) assert.ok(html.includes(t.label[lang]), `${lang}: tab ${t.id}`);
  }
});

test('content standards: no em-dash, arrow or emoji, no internal reference, no raw toFixed in the page files', () => {
  const dir = join(FRONTEND, 'src', 'pages');
  const files = [join(dir, 'Methodology.tsx'), ...readdirSync(join(dir, 'methodology')).map((f) => join(dir, 'methodology', f))];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /[\u2014→←\u{1F300}-\u{1FAFF}☀-➿]/u, `${file}: em-dash, arrow or emoji`);
    assert.doesNotMatch(text, /\.toFixed\(/, `${file}: raw toFixed`);
    assert.doesNotMatch(text, /\bBL-\d+|CAOS_MANAGE|[A-Z]:[\\/]/, `${file}: an internal reference`);
  }
  for (const lang of ['en', 'es'] as const) {
    for (const [id] of EXPECTED) {
      const text = textOf(topicHtml(id, lang).html);
      assert.doesNotMatch(text, /[\u2014→←]/u, `${id}: em-dash or arrow in the rendered text`);
    }
  }
});
