/**
 * The citations, one file per page (data/citations/<page>.ts) and a shared file for what several pages use: unique
 * ids, every id a page refers to defined, nothing defined that no page refers to, and each page's own file holding
 * only what that page uses.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CITATIONS, SECTION_REFS } from '../src/data/citations';
import { BENCHMARK_CITATIONS, BENCHMARK_REFS } from '../src/data/citations/benchmark';
import { EXPERIMENTS_CITATIONS, EXPERIMENTS_REFS } from '../src/data/citations/experiments';
import { IMPLEMENTATION_CITATIONS, IMPLEMENTATION_REFS } from '../src/data/citations/implementation';
import { INTRODUCTION_CITATIONS, INTRODUCTION_REFS } from '../src/data/citations/introduction';
import { METHODOLOGY_CITATIONS, METHODOLOGY_REFS } from '../src/data/citations/methodology';

const root = join(import.meta.dirname, '..', 'src');
const PAGES = [
  { file: 'Introduction', prefix: 'intro-', own: INTRODUCTION_CITATIONS, refs: INTRODUCTION_REFS },
  { file: 'Methodology', prefix: 'm-', own: METHODOLOGY_CITATIONS, refs: METHODOLOGY_REFS },
  { file: 'Implementation', prefix: 'i-', own: IMPLEMENTATION_CITATIONS, refs: IMPLEMENTATION_REFS },
  { file: 'Experiments', prefix: 'e-', own: EXPERIMENTS_CITATIONS, refs: EXPERIMENTS_REFS },
  { file: 'Benchmark', prefix: 'b-', own: BENCHMARK_CITATIONS, refs: BENCHMARK_REFS },
];

/** The ids a page file names in an inline `<Cite id="...">`. */
const inlineCites = (file: string) =>
  [...readFileSync(join(root, 'pages', `${file}.tsx`), 'utf8').matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1]);

test('citation ids are unique across the six files', () => {
  const ids = CITATIONS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 21);
});

test('every id a section lists, and every inline Cite, is defined', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  for (const [section, ids] of Object.entries(SECTION_REFS)) {
    for (const id of ids) assert.ok(defined.has(id), `${section} lists ${id}, which is not defined`);
  }
  for (const p of PAGES) {
    for (const id of inlineCites(p.file)) assert.ok(defined.has(id), `${p.file} cites ${id}, which is not defined`);
  }
});

test('no citation is defined and never referenced', () => {
  const used = new Set<string>(Object.values(SECTION_REFS).flat());
  for (const p of PAGES) for (const id of inlineCites(p.file)) used.add(id);
  for (const c of CITATIONS) assert.ok(used.has(c.id), `${c.id} is defined and nothing refers to it`);
});

test('a page file holds only its own prefix of section keys', () => {
  for (const p of PAGES) {
    for (const key of Object.keys(p.refs)) assert.ok(key.startsWith(p.prefix), `${key} is not a ${p.file} key`);
  }
  assert.equal(
    Object.keys(SECTION_REFS).length,
    PAGES.reduce((n, p) => n + Object.keys(p.refs).length, 0),
  );
});

test('the citations a page file defines are used by that page only', () => {
  for (const p of PAGES) {
    for (const c of p.own) {
      const users = PAGES.filter(
        (q) => inlineCites(q.file).includes(c.id) || Object.values(q.refs).some((ids) => ids.includes(c.id)),
      ).map((q) => q.file);
      assert.deepEqual(users, [p.file], `${c.id} sits in ${p.file}.ts but ${users.join(', ')} use it`);
    }
  }
});

test('the six files are the whole directory', () => {
  assert.deepEqual(readdirSync(join(root, 'data', 'citations')).sort(), [
    'benchmark.ts',
    'experiments.ts',
    'implementation.ts',
    'introduction.ts',
    'methodology.ts',
  ]);
});
