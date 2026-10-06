/**
 * Labels that fit the drawing they label (frontend/src/viz/text.ts). Outside a browser the text metric falls back
 * to 0.6 of the font size per character, which is what these cases are computed with.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { fitLabel, ticksFor } from '../src/viz/text';

test('a label that fits stays whole on one line', () => {
  assert.deepEqual(fitLabel('Bosque aleatorio', 200, 10), { lines: ['Bosque aleatorio'], shortened: false });
});

test('a long label breaks at the word that makes its widest line narrowest', () => {
  // 38 characters at 6 px is 228 px; split after the comma the lines are 126 and 96 px, and every other split is wider.
  const fitted = fitLabel('Tamaño medio clásico, factor del sitio', 150, 10);
  assert.deepEqual(fitted, { lines: ['Tamaño medio clásico,', 'factor del sitio'], shortened: false });
});

test('a label too long for two lines is shortened with an ellipsis, and says so', () => {
  const fitted = fitLabel('Tamaño medio clásico, limitado al bloque in situ', 60, 10);
  assert.equal(fitted.shortened, true);
  assert.equal(fitted.lines.length, 2);
  for (const line of fitted.lines) assert.ok(line.length * 6 <= 60, line);
  assert.ok(fitted.lines.some((line) => line.endsWith('…')));
  // On one line only, the same label is cut once.
  const single = fitLabel('Tamaño medio clásico, limitado al bloque in situ', 60, 10, 1);
  assert.equal(single.lines.length, 1);
  assert.ok(single.lines[0].endsWith('…'));
});

test('ticks are round, start at zero, stay under the maximum, and never crowd the plot', () => {
  for (const [hi, plot, label] of [
    [56, 160, 20],
    [266, 400, 30],
    [0.83, 300, 25],
    [12000, 900, 40],
  ] as const) {
    const ticks = ticksFor(hi, plot, label);
    assert.equal(ticks[0], 0);
    assert.ok(ticks[ticks.length - 1] <= hi * (1 + 1e-9), `${hi}: ${ticks}`);
    assert.ok(ticks.length >= 2, `${hi}: ${ticks}`);
    assert.ok(ticks.length <= Math.max(2, Math.min(6, Math.floor(plot / (label + 16)) + 1)), `${hi}: ${ticks}`);
    const step = ticks[1] - ticks[0];
    const mantissa = step / 10 ** Math.floor(Math.log10(step));
    assert.ok([1, 2, 2.5, 5].some((m) => Math.abs(mantissa - m) < 1e-9), `${hi}: step ${step}`);
  }
  assert.deepEqual(ticksFor(56, 160, 20), [0, 20, 40]);
});
