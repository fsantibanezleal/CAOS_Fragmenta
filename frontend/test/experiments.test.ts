/**
 * The Experiments page on the shell's DocPage and DocSection (ADR-0017 section 2.1, shell 0.15.0).
 *
 * The shell gate (`caos-shell-gate`, check ADR-0017.2) measures the rendered page in a browser; this test holds the
 * floors that can be counted without layout, on the product's side: every topic is rendered in both languages with the
 * committed documents it reads, and each section that declares an area is checked against the area's row of the table
 * (dense paragraphs by word count, captioned equations, captioned figures, tables), the lede, the topic count, the group
 * limits of ADR-0071 rule 5, the references of every section, the ids it cites, and the protocol content carried over from
 * the Methodology page.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS } from '../src/data/citations';
import { EXPERIMENTS_CITATIONS, EXPERIMENTS_REFS } from '../src/data/citations/experiments';
import type { BenchmarkArtifact, CaseIndex } from '../src/lib/contract.types';

// The charts import a stylesheet (uPlot's), which Node cannot load: this test answers it with an empty module, then loads
// the page, so that the topics that draw a chart are rendered here like any other.
register(
  'data:text/javascript,' +
    encodeURIComponent(
      "export async function load(url, context, next) { if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true }; return next(url, context); }",
    ),
);
const { default: Experiments } = await import('../src/pages/Experiments');
const { GROUPS, TOPICS } = await import('../src/pages/experiments/topics');

const ROOT = join(import.meta.dirname, '..', '..');
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, 'data', 'derived', path), 'utf8')) as T;
const benchmark = read<BenchmarkArtifact>('benchmark.json');
const index = read<CaseIndex>('manifests/index.json');
const LANGS = ['en', 'es'] as const;

/** The four areas of the Experiments page: a copy of `PAGES['/experiments']` of the shell's gate/areas.mjs. */
const FLOORS: Record<string, { dense?: number; equations?: number; figures?: number; tables?: number }> = {
  question: { dense: 2 },
  metrics: { equations: 2 },
  protocol: { figures: 1 },
  datasets: { tables: 1 },
};
const DENSE_WORDS = 40;
const LEDE_WORDS = 35;
const EXP_TOPICS = 6;
/** A margin over the gate's floor so that a rewording never lands exactly on it. */
const MARGIN = 3;

// ---------------------------------------------------------------------------------------------------- the markup

type Node = { tag: string; attrs: string; children: (Node | string)[] };

/** A small parser of the markup React writes (no raw `<` in text, void tags known); enough to count what a section holds. */
function parse(html: string): Node {
  const root: Node = { tag: '#root', attrs: '', children: [] };
  const stack: Node[] = [root];
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'wbr']);
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) top.children.push(m[5]);
    else if (m[1]) {
      if (stack.some((n, i) => i > 0 && n.tag === m[2])) {
        while (stack[stack.length - 1].tag !== m[2]) stack.pop();
        stack.pop();
      }
    } else {
      const node: Node = { tag: m[2], attrs: m[3], children: [] };
      top.children.push(node);
      if (!m[4] && !VOID.has(m[2])) stack.push(node);
    }
  }
  return root;
}

const cls = (n: Node) => /class="([^"]*)"/.exec(n.attrs)?.[1] ?? '';
const attr = (n: Node, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(n.attrs)?.[1];
const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');

function walk(n: Node, visit: (n: Node) => boolean | void): void {
  for (const c of n.children) {
    if (typeof c === 'string') continue;
    if (visit(c) !== false) walk(c, visit);
  }
}
const find = (n: Node, test: (n: Node) => boolean): Node[] => {
  const out: Node[] = [];
  walk(n, (c) => {
    if (test(c)) out.push(c);
  });
  return out;
};

/** The text of a node with the equations (KaTeX) removed, as the gate reads a paragraph. */
function text(n: Node | string, withMath = false): string {
  if (typeof n === 'string') return decode(n);
  if (!withMath && /\bkatex\b/.test(cls(n))) return '';
  return n.children.map((c) => text(c, withMath)).join('');
}
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

interface Measured {
  area: string | undefined;
  title: string;
  dense: string[];
  equations: number;
  captionlessEquations: number;
  figures: number;
  callouts: Record<string, number>;
  tables: number;
  codes: number;
  refs: string | undefined;
  noRefsReason: string | undefined;
}

function measure(section: Node): Measured {
  const inside = (pred: (n: Node) => boolean) => find(section, pred);
  const paragraphs = inside((n) => n.tag === 'p' && !/callout-title/.test(cls(n)));
  const dense = [...new Set(
    paragraphs
      .filter((p) => {
        // Not inside a callout, a figure, a table or an equation.
        let inBlock = false;
        walk(section, (c) => {
          if (c !== p && /\b(callout|equation)\b/.test(cls(c)) || c.tag === 'figure' || c.tag === 'table') {
            if (find(c, (x) => x === p).length) inBlock = true;
          }
        });
        return !inBlock;
      })
      .map((p) => text(p).replace(/\s+/g, ' ').trim())
      .filter((t) => words(t) >= DENSE_WORDS),
  )];
  const equations = inside((n) => cls(n).split(/\s+/).includes('equation'));
  const callouts: Record<string, number> = {};
  for (const c of inside((n) => attr(n, 'data-callout') !== undefined)) callouts[attr(c, 'data-callout')!] = (callouts[attr(c, 'data-callout')!] ?? 0) + 1;
  return {
    area: attr(section, 'data-area'),
    title: text(find(section, (n) => n.tag === 'h2')[0] ?? '').trim(),
    dense,
    equations: equations.filter((e) => find(e, (n) => /equation-caption/.test(cls(n))).some((c) => text(c).trim().length > 0)).length,
    captionlessEquations: equations.filter((e) => !find(e, (n) => /equation-caption/.test(cls(n))).some((c) => text(c).trim().length > 0)).length,
    figures: inside((n) => n.tag === 'figure').filter((f) => find(f, (n) => n.tag === 'figcaption').some((c) => text(c).trim()) && find(f, (n) => n.tag === 'svg').length).length,
    callouts,
    tables: inside((n) => n.tag === 'table').length,
    codes: inside((n) => n.tag === 'pre').length,
    refs: attr(section, 'data-refs'),
    noRefsReason: attr(section, 'data-no-refs-reason'),
  };
}

const wrap = (el: ReturnType<typeof createElement>) =>
  createElement(MemoryRouter, null, createElement(CitationsProvider, { items: CITATIONS, children: el }));

/** One topic rendered in one language with the committed documents (or with none, as when the files are absent). */
function setLang(lang: 'en' | 'es'): void {
  // A server render reads zustand's initial state; the test's language is its current state.
  useLangStore.setState({ lang });
  Object.assign(useLangStore.getInitialState(), { lang });
}

function renderTopic(id: string, lang: 'en' | 'es', loaded = true): Node {
  setLang(lang);
  const topic = TOPICS.find((t) => t.id === id)!;
  const html = renderToStaticMarkup(
    wrap(createElement(topic.Component, { es: lang === 'es', b: loaded ? benchmark : null, index: loaded ? index : null })),
  );
  return parse(html);
}

const sectionsOf = (root: Node) => find(root, (n) => n.tag === 'section' && /caos-doc-section/.test(cls(n)));

// ---------------------------------------------------------------------------------------------------- the page

const MAPPED = ['metrics', 'protocol', 'datasets', 'transfer', 'protocol-sensitivity', 'per-site', 'response', 'diagnostics'];

test('the page has at least six topics, the topics of the mapping, in at most six groups of at most six', () => {
  assert.ok(TOPICS.length >= EXP_TOPICS, `${TOPICS.length} topics`);
  assert.deepEqual(TOPICS.map((t) => t.id), MAPPED);
  assert.ok(GROUPS.length >= 1 && GROUPS.length <= 6, `${GROUPS.length} groups`);
  for (const g of GROUPS) {
    const n = TOPICS.filter((t) => t.group === g.id).length;
    assert.ok(n >= 1 && n <= 6, `group ${g.id} holds ${n} topics`);
  }
  for (const t of TOPICS) assert.ok(GROUPS.some((g) => g.id === t.group), `${t.id} names an unknown group`);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length, 'topic ids are unique');
});

test('every area of the table is declared by some topic, and at least three topics are questions', () => {
  const declared = new Set<string>(TOPICS.flatMap((t) => t.areas));
  for (const area of Object.keys(FLOORS)) assert.ok(declared.has(area), `no topic declares ${area}`);
  assert.ok(TOPICS.filter((t) => t.areas.includes('question')).length >= 3, 'three or more question topics');
});

for (const lang of LANGS) {
  test(`the page renders in ${lang} with a lede of at least ${LEDE_WORDS} words, its title, and one tab per group`, () => {
    setLang(lang);
    const root = parse(renderToStaticMarkup(wrap(createElement(Experiments))));
    const lede = find(root, (n) => n.tag === 'p' && /\blede\b/.test(cls(n)))[0];
    assert.ok(lede, 'a lede');
    assert.ok(words(text(lede, true)) >= LEDE_WORDS + MARGIN, `lede of ${words(text(lede, true))} words`);
    assert.equal(find(root, (n) => attr(n, 'data-doc-page') !== undefined).length, 1, 'one DocPage');
    assert.equal(text(find(root, (n) => n.tag === 'h1')[0]).trim(), lang === 'es' ? 'Experimentos' : 'Experiments');
    const tablist = find(root, (n) => attr(n, 'role') === 'tablist')[0];
    assert.ok(tablist, 'a tab list of groups');
    assert.equal(find(tablist, (n) => attr(n, 'role') === 'tab').length, GROUPS.length, 'one tab per group');
  });
}

// ---------------------------------------------------------------------------------------------------- the topics

for (const topic of TOPICS) {
  for (const lang of LANGS) {
    test(`${topic.id} (${lang}): its areas, and the floor of each`, () => {
      const root = renderTopic(topic.id, lang);
      const sections = sectionsOf(root);
      assert.ok(sections.length >= 1, 'a DocSection');
      const measured = sections.map(measure);
      const areas = measured.map((m) => m.area).filter(Boolean);
      assert.deepEqual([...new Set(areas)].sort(), [...topic.areas].sort(), `areas of ${topic.id}`);
      assert.equal(measured.filter((m) => m.area === 'question').length, topic.areas.includes('question') ? 1 : 0, 'one section per question');
      for (const m of measured) {
        assert.equal(m.captionlessEquations, 0, `${m.title}: an equation without a caption`);
        assert.ok(m.refs !== undefined && Number(m.refs) >= 1, `${m.title}: at least one reference declared`);
        const floor = FLOORS[m.area!];
        assert.ok(floor, `${m.title}: unknown area ${m.area}`);
        const label = `${topic.id} ${lang}, ${m.area}, "${m.title}"`;
        if (floor.dense) assert.ok(m.dense.length >= floor.dense, `${label}: ${m.dense.length} dense paragraphs, the floor is ${floor.dense}`);
        if (floor.equations) assert.ok(m.equations >= floor.equations, `${label}: ${m.equations} captioned equations`);
        if (floor.figures) assert.ok(m.figures >= floor.figures, `${label}: ${m.figures} captioned figures`);
        if (floor.tables) assert.ok(m.tables >= floor.tables, `${label}: no table`);
        assert.ok(m.dense.length >= 2, `${label}: ${m.dense.length} dense paragraphs, every topic carries at least two`);
        assert.equal(m.callouts.honest ?? 0, 1, `${label}: exactly one honest callout`);
        for (const p of m.dense) {
          assert.ok(words(p) >= DENSE_WORDS + MARGIN, `${label}: a dense paragraph of ${words(p)} words sits on the floor: "${p.slice(0, 60)}"`);
        }
      }
    });
  }

  test(`${topic.id}: the Spanish text is Spanish, not the English text shown twice`, () => {
    const english = /\b(?:the|and|of|which|with|is|are|that|this|from|on)\b/gi;
    const en = sectionsOf(renderTopic(topic.id, 'en')).map(measure);
    const es = sectionsOf(renderTopic(topic.id, 'es')).map(measure);
    assert.equal(es.length, en.length, 'the same sections in both languages');
    for (let i = 0; i < en.length; i++) {
      assert.equal(es[i].dense.length, en[i].dense.length, `${en[i].title}: the same dense paragraphs in both languages`);
      for (const p of es[i].dense) {
        assert.ok(!en[i].dense.includes(p), `${es[i].title}: a Spanish paragraph equal to the English one`);
        const plain = p.replace(/\([^()]*\d{4}[^()]*\)/g, ' ');
        const share = (plain.match(english) ?? []).length / words(plain);
        assert.ok(share < 0.04, `${topic.id}: ${Math.round(share * 100)} percent English function words in: ${p.slice(0, 60)}`);
      }
    }
  });

  test(`${topic.id}: with the documents absent it still renders its sections (no empty chart, no throw)`, () => {
    for (const lang of LANGS) {
      const root = renderTopic(topic.id, lang, false);
      assert.ok(sectionsOf(root).length >= 1);
    }
  });
}

// ---------------------------------------------------------------------------------------------------- the carried content

const plainText = (id: string, lang: 'en' | 'es') => text(renderTopic(id, lang), true).replace(/\s+/g, ' ');
const fmt = (v: number, d: number, lang: 'en' | 'es') => (lang === 'es' ? v.toFixed(d).replace('.', ',') : v.toFixed(d));

test('the protocols and metrics of the removed Methodology tab are carried: equations, the figure, the criterion, the callout', () => {
  const metrics = renderTopic('metrics', 'en');
  const eq = find(metrics, (n) => /\bequation\b/.test(cls(n))).length;
  assert.ok(eq >= 7, `${eq} equations on the metrics topic`);
  const tex = find(metrics, (n) => n.tag === 'annotation').map((n) => text(n, true)).join(' ');
  for (const needle of ['R^2_{\\mathrm{id}}', 'R^2_{\\mathrm{LOSO}}', 'RMSE', 'MAPE', 'q_{0.025}', '\\text{generalises}']) assert.ok(tex.includes(needle), `the equation ${needle}`);
  for (const lang of LANGS) {
    const protocol = renderTopic('protocol', lang);
    const figures = find(protocol, (n) => n.tag === 'figure');
    assert.ok(figures.length >= 3, `${lang}: ${figures.length} figures on the protocol topic`);
    assert.ok(find(protocol, (n) => n.tag === 'svg' && /data-figure/.test(n.attrs)).length >= 1, `${lang}: a drawn anti-pattern figure`);
    const transfer = plainText('transfer', lang);
    assert.ok(transfer.includes(lang === 'en' ? 'What ten sites can separate' : 'Lo que diez sitios pueden separar'), `${lang}: the honest callout`);
    assert.ok(transfer.includes(benchmark.kill_criterion.slice(0, 80)), `${lang}: the criterion, verbatim`);
  }
});

for (const lang of LANGS) {
  test(`the numbers on the page are read from the committed documents and formatted for ${lang}`, () => {
    const v = benchmark.verdict;
    const dup = benchmark.duplicate_groups.flat().length;
    assert.equal(dup, 17);
    const protocol = plainText('protocol', lang);
    assert.ok(protocol.includes(String(dup)), 'the duplicated rows, counted from the duplicate groups');
    assert.ok(protocol.includes(String(benchmark.duplicate_groups.length)), 'the duplicate groups');
    assert.ok(protocol.includes(String(Math.max(...Object.values(benchmark.site_counts)))), 'the largest campaign');
    const transfer = plainText('transfer', lang);
    assert.ok(transfer.includes(fmt(v.supports.all.best_learned_r2_identity, 3, lang)), 'best learned score, all blasts');
    assert.ok(transfer.includes(fmt(v.supports.geometry.best_learned_r2_identity, 3, lang)), 'best learned score, geometry');
    assert.ok(transfer.includes(fmt(v.supports.all.null_pearson_r!, 2, lang)), 'the null correlation');
    const sens = plainText('protocol-sensitivity', lang);
    const figs = v.published_random_split_figures.stacking;
    assert.ok(sens.includes(fmt(figs.published, 3, lang)), 'the published 0.943');
    assert.ok(sens.includes(fmt(figs.median_draw, 3, lang)), 'the median of the reproduced draws');
    const metrics = plainText('metrics', lang);
    assert.ok(metrics.includes(fmt(benchmark.published_reproduction.published_holdout_arms.classical.pearson_r2 as number, 3, lang)), 'the squared correlation on the hold-out');
    assert.ok(metrics.includes(String(benchmark.n_boot)), 'the number of site resamples');
  });
}

test('the datasets topic lists every dataset with its redistribution class and its status, and the cases link to the App', () => {
  for (const lang of LANGS) {
    const root = renderTopic('datasets', lang);
    const tables = find(root, (n) => n.tag === 'table');
    assert.ok(tables.length >= 2, `${lang}: ${tables.length} tables`);
    const first = text(tables[0]);
    for (const needle of lang === 'en' ? ['Hudaverdi', 'Kulatilake', 'Sui', 'CC BY', 'live', 'roadmap'] : ['Hudaverdi', 'Kulatilake', 'Sui', 'CC BY', 'vivo', 'hoja de ruta']) {
      assert.ok(first.includes(needle), `${lang}: the dataset table names ${needle}`);
    }
    const links = find(root, (n) => n.tag === 'a' && /href="\/app\?case=/.test(n.attrs));
    assert.equal(links.length, index.n_cases, `${lang}: one chip per case`);
  }
});

// ---------------------------------------------------------------------------------------------------- citations

const pageDir = join(import.meta.dirname, '..', 'src', 'pages');
const topicDir = join(pageDir, 'experiments');
const topicFiles = readdirSync(topicDir).filter((f) => /\.tsx?$/.test(f));
const sources = ['Experiments.tsx', ...topicFiles.map((f) => join('experiments', f))].map((f) => [f, readFileSync(join(pageDir, f), 'utf8')] as const);

test('every id a topic lists is defined, each topic lists at least one, and every inline cite is listed in the topic', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  for (const [key, ids] of Object.entries(EXPERIMENTS_REFS)) {
    assert.ok(key.startsWith('e-'), `${key} is not an Experiments key`);
    for (const id of ids) assert.ok(defined.has(id), `${key} lists ${id}, which is not defined`);
    assert.equal(new Set(ids).size, ids.length, `${key}: a duplicate reference`);
  }
  for (const t of TOPICS) assert.ok((EXPERIMENTS_REFS[t.refsKey] ?? []).length >= 1, `${t.id}: references`);
  for (const c of EXPERIMENTS_CITATIONS) assert.ok(defined.has(c.id), `${c.id} is not in CITATIONS`);
  for (const [file, src] of sources) {
    const key = /EXPERIMENTS_REFS\['([^']+)'\]/.exec(src)?.[1];
    for (const m of src.matchAll(/<Cite id="([^"]+)"/g)) {
      assert.ok(defined.has(m[1]), `${file} cites ${m[1]}, which is not defined`);
      if (key) assert.ok(EXPERIMENTS_REFS[key].includes(m[1]), `${file} cites ${m[1]} without listing it under ${key}`);
    }
  }
});

test('every section key the topics use exists in EXPERIMENTS_REFS, and every key is used', () => {
  const used = new Set<string>();
  for (const [, src] of sources) for (const m of src.matchAll(/EXPERIMENTS_REFS\['([^']+)'\]/g)) used.add(m[1]);
  for (const key of used) assert.ok(key in EXPERIMENTS_REFS, `${key} is not a key of EXPERIMENTS_REFS`);
  for (const key of Object.keys(EXPERIMENTS_REFS)) assert.ok(used.has(key), `${key} is defined and no section uses it`);
});

// ---------------------------------------------------------------------------------------------------- content standards

test('no visible string holds an internal reference, an em-dash or a local path; no source holds a raw toFixed', () => {
  for (const topic of TOPICS) {
    for (const lang of LANGS) {
      const t = text(renderTopic(topic.id, lang), true);
      assert.doesNotMatch(t, /\u2014|\u2013|\u2192|\u2190/, `${topic.id} ${lang}: a dash or an arrow`);
      assert.doesNotMatch(t, /\b(?:BL|F|U|ADR|EN|RS|WB|NC|SDD)-\d{2,4}\b/, `${topic.id} ${lang}: a backlog, finding or decision id`);
      assert.doesNotMatch(t, /[A-Z]:[\\/]|CAOS_MANAGE|plans\/|wip\//, `${topic.id} ${lang}: a local path or a coordination path`);
    }
  }
  for (const [file, src] of sources) {
    assert.doesNotMatch(src, /\.toFixed\(/, `${file}: raw toFixed`);
    assert.doesNotMatch(src, /[\u2014\u2192\u2190\u{1F300}-\u{1FAFF}]/u, `${file}: em-dash, arrow or emoji`);
  }
});

test('numbers follow the language: no decimal point in a Spanish number', () => {
  for (const topic of TOPICS) {
    const root = renderTopic(topic.id, 'es');
    walk(root, (n) => {
      // Code, and anything marked translate="no" (the engine's English criterion), are read verbatim by the gate too.
      if (n.tag === 'pre' || n.tag === 'code' || attr(n, 'translate') === 'no') n.children = [];
    });
    const t = text(root);
    const bad = [...t.matchAll(/(?<![\d.\w])\d+(?:\.\d+)+(?![\d.])/g)].find((m) => m[0].split('.').length === 2 && !/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(m[0])) ?? null;
    assert.equal(bad, null, `${topic.id} es: a number with a decimal point: "${bad ? t.slice(Math.max(0, (bad.index ?? 0) - 30), (bad.index ?? 0) + 30) : ''}"`);
  }
});
