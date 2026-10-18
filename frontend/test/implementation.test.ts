/**
 * The Implementation page on the shell's DocPage and DocSection (ADR-0017 section 2.1, shell 0.15.0).
 *
 * The shell gate (`caos-shell-gate`, check ADR-0017.2) measures the rendered page in a browser; this test holds the
 * floors that can be counted without layout, on the product's side: every topic is rendered in both languages with the
 * committed documents it reads, and each section that declares an area is checked against the area's row of the table
 * (dense paragraphs by word count, captioned equations, captioned figures, callouts, tables or code), the lede, the
 * topic count, the group limits of ADR-0071 rule 5, the references of every section and the ids it cites.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS } from '../src/data/citations';
import { IMPLEMENTATION_CITATIONS, IMPLEMENTATION_REFS } from '../src/data/citations/implementation';
import type { BenchmarkArtifact, CaseIndex } from '../src/lib/contract.types';
import Implementation from '../src/pages/Implementation';
import { GROUPS, TOPICS } from '../src/pages/implementation/topics';

const ROOT = join(import.meta.dirname, '..', '..');
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, 'data', 'derived', path), 'utf8')) as T;
const benchmark = read<BenchmarkArtifact>('benchmark.json');
const index = read<CaseIndex>('manifests/index.json');
const LANGS = ['en', 'es'] as const;

/** The floors of the six areas of the Implementation page: a copy of `PAGES['/implementation']` of the shell's gate/areas.mjs. */
const FLOORS: Record<string, { dense?: number; equations?: number; figures?: number; callouts?: number; tableOrCode?: number }> = {
  architecture: { figures: 1 },
  reproducibility: { callouts: 1, dense: 1 },
  engine: { dense: 2, equations: 1, callouts: 1 },
  lanes: { dense: 2 },
  contract: { tableOrCode: 1, dense: 1 },
  deployment: { dense: 1 },
};
const DENSE_WORDS = 40;
const LEDE_WORDS = 35;
const IMPL_TOPICS = 8;
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

test('the page has at least eight topics, in at most six groups of at most six', () => {
  assert.ok(TOPICS.length >= IMPL_TOPICS, `${TOPICS.length} topics`);
  assert.ok(GROUPS.length >= 2 && GROUPS.length <= 6, `${GROUPS.length} groups`);
  for (const g of GROUPS) {
    const n = TOPICS.filter((t) => t.group === g.id).length;
    assert.ok(n >= 1 && n <= 6, `group ${g.id} holds ${n} topics`);
  }
  for (const t of TOPICS) assert.ok(GROUPS.some((g) => g.id === t.group), `${t.id} names an unknown group`);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length, 'topic ids are unique');
});

test('the topics of the mapping are all there, and every area of the table is declared by some topic', () => {
  const ids = TOPICS.map((t) => t.id);
  for (const id of ['architecture', 'reproducibility', 'engine-geometry', 'engine-bake', 'engine-portable-models', 'engine-leakage', 'lanes', 'contract', 'deployment']) {
    assert.ok(ids.includes(id), `no topic ${id}`);
  }
  const declared = new Set(TOPICS.flatMap((t) => t.areas));
  for (const area of Object.keys(FLOORS)) assert.ok((declared as Set<string>).has(area), `no topic declares ${area}`);
});

for (const lang of LANGS) {
  test(`the page renders in ${lang} with a lede of at least ${LEDE_WORDS} words, its title, and the first group open`, () => {
    setLang(lang);
    const root = parse(renderToStaticMarkup(wrap(createElement(Implementation))));
    const lede = find(root, (n) => n.tag === 'p' && /\blede\b/.test(cls(n)))[0];
    assert.ok(lede, 'a lede');
    assert.ok(words(text(lede, true)) >= LEDE_WORDS, `lede of ${words(text(lede, true))} words`);
    assert.equal(find(root, (n) => attr(n, 'data-doc-page') !== undefined).length, 1, 'one DocPage');
    assert.equal(text(find(root, (n) => n.tag === 'h1')[0]).trim(), lang === 'es' ? 'Implementación' : 'Implementation');
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
      for (const m of measured) {
        assert.equal(m.captionlessEquations, 0, `${m.title}: an equation without a caption`);
        assert.ok(m.refs !== undefined || (m.noRefsReason && m.noRefsReason !== 'missing' && words(m.noRefsReason) >= 4), `${m.title}: refs or a stated reason`);
        if (!m.area) continue;
        const floor = FLOORS[m.area!];
        assert.ok(floor, `${m.title}: unknown area ${m.area}`);
        const label = `${topic.id} ${lang}, ${m.area}, "${m.title}"`;
        if (floor.dense) assert.ok(m.dense.length >= floor.dense, `${label}: ${m.dense.length} dense paragraphs, the floor is ${floor.dense}`);
        if (floor.equations) assert.ok(m.equations >= floor.equations, `${label}: ${m.equations} captioned equations`);
        if (floor.figures) assert.ok(m.figures >= floor.figures, `${label}: ${m.figures} captioned figures`);
        if (floor.callouts) assert.ok(Object.values(m.callouts).reduce((a, b) => a + b, 0) >= floor.callouts, `${label}: no callout`);
        if (floor.tableOrCode) assert.ok(m.tables + m.codes >= floor.tableOrCode, `${label}: no table or code block`);
        for (const p of m.dense) {
          assert.ok(words(p) >= DENSE_WORDS + MARGIN, `${label}: a dense paragraph of ${words(p)} words sits on the floor: "${p.slice(0, 60)}"`);
        }
      }
    });
  }

  test(`${topic.id}: the Spanish text is Spanish, not the English text shown twice`, () => {
    const en = sectionsOf(renderTopic(topic.id, 'en')).map(measure);
    const es = sectionsOf(renderTopic(topic.id, 'es')).map(measure);
    assert.equal(es.length, en.length, 'the same sections in both languages');
    for (let i = 0; i < en.length; i++) {
      assert.equal(es[i].dense.length, en[i].dense.length, `${en[i].title}: the same dense paragraphs in both languages`);
      for (const p of es[i].dense) assert.ok(!en[i].dense.includes(p), `${es[i].title}: a Spanish paragraph equal to the English one`);
    }
  });

  test(`${topic.id}: with the documents absent it still renders its sections (no empty chart, no throw)`, () => {
    const root = renderTopic(topic.id, 'en', false);
    assert.ok(sectionsOf(root).length >= 1);
  });
}

// ---------------------------------------------------------------------------------------------------- the callouts and areas

test('every engine section carries a where-it-works and where-it-fails callout, and no area outside the six is declared', () => {
  for (const topic of TOPICS) {
    for (const lang of LANGS) {
      for (const m of sectionsOf(renderTopic(topic.id, lang)).map(measure)) {
        if (m.area) assert.ok(m.area in FLOORS, `${topic.id}: area ${m.area}`);
        if (m.area === 'engine') assert.ok((m.callouts.note ?? 0) + (m.callouts.honest ?? 0) >= 1, `${topic.id} ${lang}: the engine callout`);
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------------- citations

const pageDir = join(import.meta.dirname, '..', 'src', 'pages');
const pageFiles = [join(pageDir, 'Implementation.tsx'), ...readdirSync(join(pageDir, 'implementation')).filter((f) => /\.tsx?$/.test(f)).map((f) => join(pageDir, 'implementation', f))];
const sources = pageFiles.map((f) => readFileSync(f, 'utf8'));

test('every id the page cites inline or lists in a section is defined, and every inline cite is also listed in a section of its topic', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  for (const [key, ids] of Object.entries(IMPLEMENTATION_REFS)) {
    assert.ok(key.startsWith('i-'), `${key} is not an Implementation key`);
    for (const id of ids) assert.ok(defined.has(id), `${key} lists ${id}, which is not defined`);
  }
  const listed = new Set(Object.values(IMPLEMENTATION_REFS).flat());
  for (const src of sources) {
    for (const m of src.matchAll(/<Cite id="([^"]+)"/g)) {
      assert.ok(defined.has(m[1]), `the page cites ${m[1]}, which is not defined`);
      assert.ok(listed.has(m[1]), `the page cites ${m[1]} and no section lists it`);
    }
  }
  for (const c of IMPLEMENTATION_CITATIONS) assert.ok(defined.has(c.id), `${c.id} is not in CITATIONS`);
});

test('every section key the topics use exists in IMPLEMENTATION_REFS, and every key is used', () => {
  const used = new Set<string>();
  for (const src of sources) for (const m of src.matchAll(/IMPLEMENTATION_REFS\['([^']+)'\]/g)) used.add(m[1]);
  for (const key of used) assert.ok(key in IMPLEMENTATION_REFS, `${key} is not a key of IMPLEMENTATION_REFS`);
  for (const key of Object.keys(IMPLEMENTATION_REFS)) assert.ok(used.has(key), `${key} is defined and no section uses it`);
});

// ---------------------------------------------------------------------------------------------------- content standards

test('no visible string holds an internal reference, an em-dash or a local path', () => {
  for (const topic of TOPICS) {
    for (const lang of LANGS) {
      const t = text(renderTopic(topic.id, lang), true);
      assert.doesNotMatch(t, /—|–/, `${topic.id} ${lang}: a dash`);
      assert.doesNotMatch(t, /\b(?:BL|F|U|ADR|EN|RS|WB|NC|SDD)-\d{2,4}\b/, `${topic.id} ${lang}: a backlog, finding or decision id`);
      assert.doesNotMatch(t, /[A-Z]:[\\/]|CAOS_MANAGE|plans\/|wip\//, `${topic.id} ${lang}: a local path or a coordination path`);
    }
  }
});

test('numbers follow the language: no decimal point in a Spanish number, the engine version read from the benchmark in both', () => {
  for (const topic of TOPICS) {
    const root = renderTopic(topic.id, 'es');
    // Code blocks and inline code are verbatim (versions, file names, constants as the source writes them).
    walk(root, (n) => {
      if (n.tag === 'pre' || n.tag === 'code') n.children = [];
    });
    const t = text(root);
    // A decimal point is wrong in Spanish; a thousands group (1.047) is right: a leading digit 1 to 9 and groups of three.
    // The shell gate (G11) reads any other number written with a decimal point as an error in Spanish.
    const bad = [...t.matchAll(/(?<![\d.\w])\d+(?:\.\d+)+(?![\d.])/g)].find((m) => m[0].split('.').length === 2 && !/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(m[0])) ?? null;
    assert.equal(bad, null, `${topic.id} es: a number with a decimal point: "${bad ? t.slice(Math.max(0, (bad.index ?? 0) - 30), (bad.index ?? 0) + 30) : ''}"`);
  }
  for (const lang of LANGS) assert.ok(text(renderTopic('architecture', lang), true).includes(benchmark.engine_version), `${lang}: the engine version`);
});
