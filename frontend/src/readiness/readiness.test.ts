/**
 * The consumer and swap test of readiness 1.0.0 (docs/contracts/catalog.md, Missing-data states): the committed
 * document and the provider tree's document conform to the schema, every view's note comes from the document (never
 * from a state typed in a view), each of the six states maps to the behavior the catalog names, a case the document
 * lists as absent is refused as unavailable with its reason instead of drawn empty, and the build's copy step accepts
 * an absent file only when a partial row lists it.
 *
 * The copy-step tests write a temp copy of the provider tree under CAOS_TEST_TMP (a temp root of the device; the
 * system temp when unset) and remove it afterwards.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, afterEach, beforeEach, describe, it, mock } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ArtifactUnavailable, loadBenchmark, loadCase, loadIndex, loadModels, resetArtifactCache } from '../lib/artifacts';
import { conform } from '../lib/contract.conform';
import type { ContractState, Readiness, ReadinessEntry } from '../lib/contract.types';
import { NoteLine } from './ReadinessNote';
import { behavior, caseAbsent, WORKBENCH_ROWS, entryFor, isUnavailable, loadReadiness, resetReadiness, SEVERITY, viewState } from './readiness';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const read = (rel: string): Readiness => JSON.parse(readFileSync(join(repo, rel), 'utf8'));
const VERSION = readFileSync(join(repo, 'VERSION'), 'utf8').trim();
const committed = read('data/derived/readiness.json');
const fixture = read('docs/contracts/fixtures/data/derived/readiness.json');

/** The catalog rows each view consumes: the App reads the case, its manifest and the models file; the Benchmark
 * page the benchmark; the Implementation page lists every row. */
const VIEWS: Record<string, string[]> = {
  workbench: WORKBENCH_ROWS,
  benchmark: ['case-index', 'benchmark'],
  implementation: committed.contracts.map((c) => c.id),
};

const entry = (id: string, state: ContractState, over: Partial<ReadinessEntry> = {}): ReadinessEntry => ({
  id,
  version: '1.0.0',
  status: 'real',
  provenance: state === 'missing' ? null : 'real',
  state,
  reason: state === 'available' ? null : { en: `${id} is ${state}`, es: `${id} está ${state}` },
  missing: state === 'partial' ? ['x/y.json'] : [],
  ...over,
});
const doc = (...entries: ReadinessEntry[]): Readiness => ({
  schema: 'fragmenta.readiness/v1',
  product_version: VERSION,
  catalog_sha256: '0'.repeat(64),
  contracts: entries,
});

describe('the committed documents', () => {
  for (const [name, d] of [['committed bake', committed], ['provider tree', fixture]] as const) {
    it(`${name} conforms to the readiness schema`, () => {
      assert.deepEqual(conform(d, 'readiness'), []);
    });
    it(`${name} gives each view the state its rows say`, () => {
      for (const [view, ids] of Object.entries(VIEWS)) {
        const rows = ids.map((id) => entryFor(d, id)).filter((e): e is ReadinessEntry => !!e);
        const worst = SEVERITY.find((s) => rows.some((r) => r.state === s)) ?? 'available';
        const got = viewState(d, ids);
        assert.strictEqual(String(got.state), worst, view);
        if (got.state !== 'unknown' && got.state !== 'available') {
          assert.ok(got.rows.every((r) => r.state !== 'available' && r.reason !== null), view);
        }
      }
    });
  }
  it('no change on an available build: the committed bake shows no note on the App or the Benchmark page', () => {
    for (const view of ['workbench', 'benchmark']) {
      const v = viewState(committed, VIEWS[view]);
      assert.deepEqual(v, { state: 'available', rows: [] }, view);
      assert.equal(renderToStaticMarkup(createElement(NoteLine, { view: v, lang: 'en' })), '', view);
      assert.equal(renderToStaticMarkup(createElement(NoteLine, { view: v, lang: 'es' })), '', view);
    }
  });
  it('the provider tree says provider on every artifact row (its api row is missing, by the catalog); the note names the provider from the document', () => {
    for (const view of ['workbench', 'benchmark']) assert.equal(viewState(fixture, VIEWS[view]).state, 'provider', view);
    assert.equal(viewState(fixture, VIEWS.implementation).state, 'missing');
    const html = renderToStaticMarkup(createElement(NoteLine, { view: viewState(fixture, VIEWS.workbench), lang: 'en' }));
    assert.match(html, /data-readiness="provider"/);
    assert.ok(html.includes(fixture.contracts.find((c) => c.id === 'case-index')!.reason!.en));
  });
});

describe('the six states', () => {
  it('adversarial: the order is missing, partial, training, provider, stale, available, and the most severe wins', () => {
    assert.deepEqual(SEVERITY, ['missing', 'partial', 'training', 'provider', 'stale', 'available']);
    const d = doc(entry('a', 'stale'), entry('b', 'partial'), entry('c', 'available'));
    assert.equal(viewState(d, ['a', 'b', 'c']).state, 'partial');
    assert.deepEqual(viewState(doc(entry('a', 'available')), ['a']), { state: 'available', rows: [] });
  });
  const table: [ContractState, boolean, boolean][] = [
    ['available', true, false],
    ['partial', true, true],
    ['stale', true, true],
    ['provider', true, true],
    ['training', true, true],
    ['missing', false, true],
  ];
  for (const [state, showsResult, note] of table) {
    it(`${state}: shows the result ${showsResult}, with a note ${note}, in both languages`, () => {
      assert.deepEqual(behavior(state), { showsResult, note });
      const view = viewState(doc(entry('a', state)), ['a']);
      for (const lang of ['en', 'es'] as const) {
        const html = renderToStaticMarkup(createElement(NoteLine, { view, lang }));
        if (note) {
          assert.ok(html.includes(`data-readiness="${state}"`), html);
          assert.ok(html.includes(lang === 'es' ? `a está ${state}` : `a is ${state}`), html);
        } else {
          assert.equal(html, '');
        }
      }
    });
  }
  it('a row of the view that is not in the document is ignored; a view with none of its rows is unknown', () => {
    assert.equal(viewState(doc(entry('a', 'stale')), ['a', 'zzz']).state, 'stale');
    assert.equal(viewState(doc(entry('a', 'stale')), ['zzz']).state, 'unknown');
  });
});

describe('a missing readiness document', () => {
  beforeEach(() => {
    resetReadiness();
    resetArtifactCache();
  });
  afterEach(() => mock.restoreAll());

  it('adversarial: a null document is readiness unknown, in both languages', () => {
    const view = viewState(null, VIEWS.workbench);
    assert.equal(view.state, 'unknown');
    assert.match(renderToStaticMarkup(createElement(NoteLine, { view, lang: 'en' })), /data-readiness="unknown".*Readiness unknown/);
    assert.match(renderToStaticMarkup(createElement(NoteLine, { view, lang: 'es' })), /data-readiness="unknown".*Disponibilidad desconocida/);
  });
  it('a fetch that fails resolves to null, names the cause on the console, and is asked for once', async () => {
    const fetch = mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404, text: async () => '' }) as Response);
    const err = mock.method(console, 'error', () => undefined);
    assert.equal(await loadReadiness(), null);
    assert.equal(await loadReadiness(), null);
    assert.equal(fetch.mock.callCount(), 1);
    assert.match(String(err.mock.calls.flatMap((c) => c.arguments).join(' ')), /readiness\.json returned 404/);
  });
  it('a document without contracts is treated as unreadable', async () => {
    mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, text: async () => '{"nope":1}' }) as Response);
    mock.method(console, 'error', () => undefined);
    assert.equal(await loadReadiness(), null);
  });
});

describe('a case or a document the readiness lists as absent', () => {
  /** Serves `answers` by the path after /data/, 404 for the rest; records every path asked for. */
  function serve(answers: Record<string, unknown>) {
    return mock.method(globalThis, 'fetch', async (url: string) => {
      const rel = Object.keys(answers).find((k) => String(url).includes(`/data/${k}?`));
      return { ok: !!rel, status: rel ? 200 : 404, text: async () => JSON.stringify(answers[rel ?? '']) } as Response;
    });
  }
  const asked = (fetch: ReturnType<typeof serve>) => fetch.mock.calls.map((c) => String(c.arguments[0]));
  beforeEach(() => {
    resetReadiness();
    resetArtifactCache();
  });
  afterEach(() => mock.restoreAll());

  it('isUnavailable is true for a path a row lists in missing, for every path when case-index is missing, and for benchmark.json when benchmark is', () => {
    const d = doc(entry('case-artifact', 'partial', { missing: ['C1/case.json'] }), entry('case-index', 'available'));
    assert.equal(isUnavailable(d, 'C1/case.json'), true);
    assert.equal(isUnavailable(d, 'C2/case.json'), false);
    assert.equal(isUnavailable(doc(entry('case-index', 'missing')), 'anything.json'), true);
    assert.equal(isUnavailable(doc(entry('benchmark', 'missing')), 'benchmark.json'), true);
    assert.equal(isUnavailable(doc(entry('benchmark', 'missing')), 'C1/case.json'), false);
    assert.equal(isUnavailable(null, 'C1/case.json'), false);
  });
  it('caseAbsent is true when the manifest or anything under the case directory is listed', () => {
    const d = doc(entry('case-manifest', 'partial', { missing: ['manifests/C1.json'] }), entry('case-artifact', 'partial', { missing: ['C2/case.json'] }));
    assert.equal(caseAbsent(d, 'C1', 'manifests/C1.json'), true);
    assert.equal(caseAbsent(d, 'C2', 'manifests/C2.json'), true);
    assert.equal(caseAbsent(d, 'C3', 'manifests/C3.json'), false);
    assert.equal(caseAbsent(null, 'C1', 'manifests/C1.json'), false);
  });
  it('adversarial: loadCase rejects with ArtifactUnavailable naming the path and the reason, and never fetches the artifact', async () => {
    const fetch = serve({ 'readiness.json': doc(entry('case-artifact', 'partial', { missing: ['C1/case.json'] })), 'C1/case.json': { case: { id: 'C1' } } });
    const e = await loadCase('C1').catch((x: unknown) => x);
    assert.ok(e instanceof ArtifactUnavailable);
    assert.ok(e.reason.en.includes('C1/case.json') && e.reason.es.includes('C1/case.json'));
    assert.ok(e.reason.en.includes('case-artifact is partial'), 'the reason is the document’s');
    assert.equal(asked(fetch).some((u) => u.includes('C1/case.json')), false);
  });
  it('adversarial: loadCase refuses a case whose manifest is listed, though its artifact is there, and reads the other cases', async () => {
    const fetch = serve({
      'readiness.json': doc(entry('case-manifest', 'partial', { missing: ['manifests/C1.json'] })),
      'C1/case.json': { case: { id: 'C1' } },
      'C2/case.json': { case: { id: 'C2' } },
    });
    const e = await loadCase('C1').catch((x: unknown) => x);
    assert.ok(e instanceof ArtifactUnavailable);
    assert.ok(e.reason.en.includes('manifests/C1.json') && e.reason.en.includes('case-manifest is partial'));
    assert.equal(asked(fetch).some((u) => u.includes('C1/case.json')), false);
    assert.deepEqual(await loadCase('C2'), { case: { id: 'C2' } });
  });
  it('loadIndex rejects with ArtifactUnavailable when case-index is missing, and loadBenchmark when benchmark is', async () => {
    serve({ 'readiness.json': doc(entry('case-index', 'missing'), entry('benchmark', 'missing')) });
    await assert.rejects(loadIndex(), ArtifactUnavailable);
    await assert.rejects(loadBenchmark(), ArtifactUnavailable);
  });
  it('loadModels rejects for a scope listed as absent and reads the scope that exists', async () => {
    serve({ 'readiness.json': doc(entry('models-file', 'partial', { missing: ['models/Soma.json'] })), 'models/Mrica.json': { scope: 'Mrica' } });
    await assert.rejects(loadModels('Soma'), ArtifactUnavailable);
    assert.deepEqual(await loadModels('Mrica'), { scope: 'Mrica' });
  });
  it('loadCase reads the case when the document lists nothing absent, and when the document is unreadable', async () => {
    serve({ 'readiness.json': doc(entry('case-artifact', 'stale')), 'C1/case.json': { case: { id: 'C1' } } });
    assert.deepEqual(await loadCase('C1'), { case: { id: 'C1' } });
    mock.restoreAll();
    resetReadiness();
    resetArtifactCache();
    serve({ 'readiness.json': { nope: 1 }, 'C1/case.json': { case: { id: 'C1' } } });
    mock.method(console, 'error', () => undefined);
    assert.deepEqual(await loadCase('C1'), { case: { id: 'C1' } });
  });
});

describe('the build’s copy step accepts an absent file only when a partial row lists it', () => {
  const copyData = join(repo, 'frontend', 'copy-data.mjs');
  const scratch = mkdtempSync(join(process.env.CAOS_TEST_TMP?.trim() || tmpdir(), 'fragmenta-copy-'));
  after(() => rmSync(scratch, { recursive: true, force: true }));

  /** A temp copy of the provider tree with its manifest removed, and the readiness document `rows` say. */
  function tree(name: string, rows: ReadinessEntry[]): { root: string; out: string } {
    const root = join(scratch, name, 'derived');
    mkdirSync(dirname(root), { recursive: true });
    cpSync(join(repo, 'docs', 'contracts', 'fixtures', 'data', 'derived'), root, { recursive: true });
    const index = JSON.parse(readFileSync(join(root, 'manifests', 'index.json'), 'utf8')) as { cases: { manifest_path: string }[] };
    rmSync(join(root, index.cases[0].manifest_path));
    writeFileSync(join(root, 'readiness.json'), JSON.stringify(doc(...rows)));
    return { root, out: join(scratch, name, 'public-data') };
  }
  const run = (t: { root: string; out: string }) =>
    spawnSync(process.execPath, [copyData], { env: { ...process.env, CAOS_DATA_ROOT: t.root, CAOS_DATA_OUT: t.out }, encoding: 'utf8' });
  const files = (dir: string): string[] =>
    readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name).slice(dir.length + 1).replace(/\\/g, '/'));

  it('a manifest the readiness lists in a partial row is warned about and left out; the rest is copied', () => {
    const fx = JSON.parse(readFileSync(join(repo, 'docs/contracts/fixtures/data/derived/manifests/index.json'), 'utf8')) as { cases: { manifest_path: string }[] };
    const gone = fx.cases[0].manifest_path;
    const t = tree('partial', [entry('case-manifest', 'partial', { missing: [gone] })]);
    const r = run(t);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /WARN .*manifests\/fx01-fixture\.json is absent, as readiness\.json declares/);
    assert.equal(existsSync(join(t.out, gone)), false);
    assert.ok(files(t.out).includes('manifests/index.json') && files(t.out).includes('readiness.json'));
  });
  it('adversarial: the same absence without a partial row stops the build and names the file', () => {
    const t = tree('undeclared', [entry('case-manifest', 'available')]);
    const r = run(t);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /declared but missing[\s\S]*manifests\/fx01-fixture\.json/);
  });
  it('adversarial: an absence listed by a row that is not partial still stops the build', () => {
    const t = tree('wrong-state', [entry('case-manifest', 'stale', { missing: ['manifests/fx01-fixture.json'] })]);
    assert.equal(run(t).status, 1);
  });
  it('adversarial: a partial row never excuses a file it does not list', () => {
    const t = tree('other-file', [entry('case-manifest', 'partial', { missing: ['manifests/not-this-one.json'] })]);
    assert.equal(run(t).status, 1);
  });
  it('a build without readiness.json stops', () => {
    const t = tree('no-readiness', []);
    rmSync(join(t.root, 'readiness.json'));
    const r = run(t);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /readiness\.json/);
  });
});
