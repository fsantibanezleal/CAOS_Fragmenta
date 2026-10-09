/**
 * The design response surface (docs/design/features/response-surface/): the live engine on a grid, empty cells with
 * their reasons, iso-lines that separate the cells above a level from the cells below, and learned surfaces walked
 * on the case's own training-scope models.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { answerOnDesign, designOf, type DesignContext } from '../src/engine/design';
import { fittedArms, predictModel } from '../src/engine/learned';
import { evaluateSurface, isoLines, SURFACE_N, type SurfaceCell } from '../src/engine/surface';
import type { CaseArtifact, ModelsFile } from '../src/lib/contract.types';

const DERIVED = join(process.cwd(), '..', 'data', 'derived');
const read = <T>(path: string): T => JSON.parse(readFileSync(join(DERIVED, path), 'utf8')) as T;

const artifact = read<CaseArtifact>('real-murgul/case.json');
const blast = artifact.blasts.find((b) => b.blast_id === artifact.representative_blast_id) ?? artifact.blasts[0];
const models = read<ModelsFile>(artifact.live_models!.path);
const holeMm = blast.pattern!.hole_diameter_mm;
const ctx: DesignContext = { rockFactor: blast.rock_factor, models, lang: 'en' };

test('the surface is the live engine evaluated on its grid', () => {
  for (const arm of ['kuznetsov', 'published-regression', 'xgboost', 'published-neural-net']) {
    const surface = evaluateSurface(arm, 'x50', designOf(blast), holeMm, ctx);
    assert.ok(surface, arm);
    assert.equal(surface.cells.length, SURFACE_N);
    assert.equal(surface.drawn + surface.empty, SURFACE_N * SURFACE_N);
    for (const [r, c] of [[0, 0], [20, 20], [40, 40], [7, 33]]) {
      const cell: SurfaceCell = surface.cells[r][c];
      const expected = answerOnDesign(arm, { ...designOf(blast), B_over_D: cell.bd, S_over_B: cell.sb }, holeMm, ctx);
      assert.equal(cell.value, expected?.value ?? null, `${arm} at ${r},${c}`);
    }
  }
});

test('the iso-lines separate the cells above their level from the cells below', () => {
  const surface = evaluateSurface('kuznetsov', 'x50', designOf(blast), holeMm, ctx)!;
  const values = surface.cells.flat().map((cell) => cell.value).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const level = values[Math.floor(values.length / 2)];
  const segments = isoLines(surface, level);
  assert.ok(segments.length > 0, 'a level inside the range draws a line');
  const value = (row: number, col: number) => surface.cells[row][col].value as number;
  for (const s of segments) {
    for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
      // Every crossing lies on a grid edge whose two ends are on opposite sides of the level.
      const onColumn = Number.isInteger(x);
      const r0 = Math.floor(y);
      const c0 = Math.floor(x);
      const [a, b] = onColumn ? [value(r0, x), value(Math.min(r0 + 1, SURFACE_N - 1), x)] : [value(y, c0), value(y, Math.min(c0 + 1, SURFACE_N - 1))];
      assert.ok((a >= level) !== (b >= level) || a === level || b === level, `crossing at ${x},${y} is not between the two sides`);
    }
  }
  // A level outside the range draws nothing.
  assert.equal(isoLines(surface, values[values.length - 1] * 2).length, 0);
});

test('a cell that is not a blast is left empty with its reason', () => {
  const noCharge = { ...designOf(blast), T_over_B: designOf(blast).H_over_B };
  const surface = evaluateSurface('kuznetsov', 'x50', noCharge, holeMm, ctx)!;
  assert.equal(surface.drawn, 0);
  assert.equal(surface.empty, SURFACE_N * SURFACE_N);
  assert.match(surface.cells[0][0].reason ?? '', /no charge column/);
  const es = evaluateSurface('kuznetsov', 'x50', noCharge, holeMm, { ...ctx, lang: 'es' })!;
  assert.match(es.cells[5][5].reason ?? '', /no hay columna de carga/);
  // P80 cells are empty exactly where the mean size is.
  const x50 = evaluateSurface('xgboost', 'x50', designOf(blast), holeMm, ctx)!;
  const p80 = evaluateSurface('xgboost', 'p80', designOf(blast), holeMm, ctx)!;
  assert.equal(p80.drawn, x50.drawn);
  assert.ok((p80.max ?? 0) > (x50.max ?? 0), 'the 80 percent size exceeds the mean size');
});

test('a learned surface uses the models of the case’s own training scope', () => {
  assert.equal(artifact.provenance.held_out_site, 'Murgul');
  assert.equal(models.scope, 'Murgul');
  const own = fittedArms(models).xgboost;
  const corpus = read<ModelsFile>('models/corpus.json');
  const everything = fittedArms(corpus).xgboost;
  const surface = evaluateSurface('xgboost', 'x50', designOf(blast), holeMm, ctx)!;
  let differs = 0;
  for (const [r, c] of [[0, 0], [10, 30], [20, 20], [40, 40]]) {
    const cell = surface.cells[r][c];
    const x = ['S_over_B', 'H_over_B', 'B_over_D', 'T_over_B', 'Pf_kg_m3', 'XB_m', 'E_GPa'].map((k) =>
      k === 'B_over_D' ? cell.bd : k === 'S_over_B' ? cell.sb : designOf(blast)[k as keyof ReturnType<typeof designOf>],
    );
    assert.equal(cell.value, predictModel(own, x).value);
    if (predictModel(everything, x).value !== cell.value) differs += 1;
  }
  assert.ok(differs > 0, 'the held-out scope is not the corpus scope');
});
