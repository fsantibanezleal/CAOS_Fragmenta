/**
 * The route table (shell 0.15.0, ADR-0016): the App at /app, the landing at / and at every unknown path, the five
 * documentation routes, and the old links of the product forwarded: /?case=<id> (through the shell's Landing) and
 * /focus/<id> (the product's own focus page, retired for the shell's Focus mode).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { STANDARD_ROUTES } from '@fasl-work/caos-app-shell';
import { matchRoutes } from 'react-router';

import { FOCUS_FORWARD_PATH, focusForwardTarget, ROUTE_TABLE } from '../src/routes';

const page = (path: string) => matchRoutes(ROUTE_TABLE.map((r) => ({ path: r.path })), path)?.[0].route.path;

test('the header order is the shell standard: App, Introduction, Methodology, Implementation, Experiments, Benchmark', () => {
  assert.deepEqual(
    STANDARD_ROUTES.map((r) => r.path),
    ['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark'],
  );
});

test('every standard route has its own entry in the table, and the App is /app', () => {
  for (const r of STANDARD_ROUTES) assert.equal(page(r.path), r.path);
  assert.equal(ROUTE_TABLE.find((r) => r.path === '/app')?.page, 'app');
});

test('the root and an unknown path render the landing', () => {
  assert.equal(ROUTE_TABLE.find((r) => r.path === '/')?.page, 'landing');
  assert.equal(page('/'), '/');
  assert.equal(page('/nowhere'), '*');
  assert.equal(ROUTE_TABLE.find((r) => r.path === '*')?.page, 'landing');
});

test('/focus/:caseId is the forward, not a page', () => {
  assert.equal(FOCUS_FORWARD_PATH, '/focus/:caseId');
  assert.equal(page('/focus/B2'), FOCUS_FORWARD_PATH);
  assert.equal(ROUTE_TABLE.find((r) => r.path === FOCUS_FORWARD_PATH)?.page, 'focus-forward');
});

test('the forward opens the App on that case in Focus mode, on the Predict group the old page showed', () => {
  assert.equal(focusForwardTarget('B2'), '/app?case=B2&focus=1');
  // The workbench holds its group itself and opens Predict; the target names no other group.
  assert.ok(!focusForwardTarget('B2').includes('view='));
});

test('a case id is encoded, so an odd id cannot add a parameter', () => {
  assert.equal(focusForwardTarget('a&focus=0'), '/app?case=a%26focus%3D0&focus=1');
});

test('the product no longer carries its own focus page or its rules', () => {
  const src = join(import.meta.dirname, '..', 'src');
  assert.throws(() => readFileSync(join(src, 'pages', 'Focus.tsx')));
  assert.ok(!/fr-focus/.test(readFileSync(join(src, 'fragmenta.css'), 'utf8')));
});

test('the App sets the shell Focus prop (ADR-0070) and no view links to the old route', () => {
  const src = join(import.meta.dirname, '..', 'src');
  assert.match(readFileSync(join(src, 'workbench', 'Workbench.tsx'), 'utf8'), /^\s+focus\s*$/m);
  assert.ok(!/\/focus\//.test(readFileSync(join(src, 'workbench', 'views.tsx'), 'utf8')));
  assert.ok(!/to=\{`\/\?case=/.test(readFileSync(join(src, 'pages', 'Experiments.tsx'), 'utf8')));
});
