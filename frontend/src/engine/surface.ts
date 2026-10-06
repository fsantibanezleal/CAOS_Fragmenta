/**
 * The design response surface: one arm's predicted size over the burden and spacing plane.
 *
 * The What if views move one lever at a time, which cannot show the interaction that makes blast design a design
 * problem: a tighter burden can buy a wider spacing at the same size. Here the grid spans the corpus envelope of the
 * burden-to-diameter and spacing-to-burden ratios, every other ratio and the hole diameter held at the current
 * design, and every cell is `answerOnDesign`, the same engine the What if views run. A cell that is not a blast, or
 * whose prediction leaves the plausible range, is empty and keeps its reason (requirements RS-001 to RS-003, RS-006).
 *
 * Iso-lines are traced by marching squares over the cell values, with linear interpolation along each edge; a level
 * is drawn only where cells straddle it, and a square with an empty corner draws nothing.
 */

import { answerOnDesign, ENVELOPE, p80Of, type DesignContext } from './design';
import type { LiveBlast } from './live';

export type SurfaceQuantity = 'x50' | 'p80';

export interface SurfaceCell {
  bd: number;
  sb: number;
  value: number | null;
  reason: string | null;
}

export interface Surface {
  arm: string;
  quantity: SurfaceQuantity;
  /** Burden-to-diameter values, the columns. */
  bd: number[];
  /** Spacing-to-burden values, the rows. */
  sb: number[];
  /** cells[row][column]: row by spacing, column by burden. */
  cells: SurfaceCell[][];
  drawn: number;
  empty: number;
  min: number | null;
  max: number | null;
}

export const SURFACE_N = 41;

const linspace = (lo: number, hi: number, n: number) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

/** Evaluate one arm over the envelope of B/D and S/B, the rest of the design fixed. Undefined while models load. */
export function evaluateSurface(
  arm: string,
  quantity: SurfaceQuantity,
  design: LiveBlast,
  holeMm: number,
  ctx: DesignContext,
  n = SURFACE_N,
): Surface | undefined {
  const bd = linspace(ENVELOPE.B_over_D[0], ENVELOPE.B_over_D[1], n);
  const sb = linspace(ENVELOPE.S_over_B[0], ENVELOPE.S_over_B[1], n);
  const cells: SurfaceCell[][] = [];
  let drawn = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const s of sb) {
    const row: SurfaceCell[] = [];
    for (const b of bd) {
      const cellDesign = { ...design, B_over_D: b, S_over_B: s };
      const answer = answerOnDesign(arm, cellDesign, holeMm, ctx);
      if (answer === undefined) return undefined;
      let value = answer.value;
      if (value !== null && quantity === 'p80') value = p80Of(value, cellDesign, holeMm);
      if (value !== null && !Number.isFinite(value)) value = null;
      if (value !== null) {
        drawn += 1;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      row.push({ bd: b, sb: s, value, reason: value === null ? answer.reason : null });
    }
    cells.push(row);
  }
  return {
    arm,
    quantity,
    bd,
    sb,
    cells,
    drawn,
    empty: n * n - drawn,
    min: drawn ? min : null,
    max: drawn ? max : null,
  };
}

/** One piece of an iso-line, in grid coordinates: x along the burden columns, y along the spacing rows. */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Marching squares at one level. Each square of four cell values with no empty corner is classified by which corners
 * lie at or above the level; each edge whose ends straddle it gets a crossing by linear interpolation. The two
 * ambiguous saddles are resolved by the square's mean, so the line never crosses itself.
 */
export function isoLines(surface: Surface, level: number): Segment[] {
  const out: Segment[] = [];
  const v = (r: number, c: number) => surface.cells[r][c].value;
  const rows = surface.cells.length;
  const cols = rows ? surface.cells[0].length : 0;
  const t = (a: number, b: number) => (level - a) / (b - a);
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = v(r, c); // bottom-left
      const b = v(r, c + 1); // bottom-right
      const d = v(r + 1, c); // top-left
      const e = v(r + 1, c + 1); // top-right
      if (a === null || b === null || d === null || e === null) continue;
      const index = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (e >= level ? 4 : 0) | (d >= level ? 8 : 0);
      if (index === 0 || index === 15) continue;
      // Crossing points on the four edges.
      const bottom = { x: c + t(a, b), y: r };
      const right = { x: c + 1, y: r + t(b, e) };
      const top = { x: c + t(d, e), y: r + 1 };
      const left = { x: c, y: r + t(a, d) };
      const seg = (p: { x: number; y: number }, q: { x: number; y: number }) => out.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
      switch (index) {
        case 1:
        case 14:
          seg(left, bottom);
          break;
        case 2:
        case 13:
          seg(bottom, right);
          break;
        case 3:
        case 12:
          seg(left, right);
          break;
        case 4:
        case 11:
          seg(right, top);
          break;
        case 6:
        case 9:
          seg(bottom, top);
          break;
        case 7:
        case 8:
          seg(left, top);
          break;
        case 5:
        case 10: {
          const centreAbove = (a + b + d + e) / 4 >= level;
          // 5: bottom-left and top-right above; 10: bottom-right and top-left above.
          if ((index === 5) === centreAbove) {
            seg(left, top);
            seg(bottom, right);
          } else {
            seg(left, bottom);
            seg(right, top);
          }
          break;
        }
      }
    }
  }
  return out;
}

/** The cell nearest a design, as row and column indices. */
export function nearestCell(surface: Surface, bd: number, sb: number): { row: number; col: number } {
  const nearest = (values: number[], x: number) =>
    values.reduce((best, value, i) => (Math.abs(value - x) < Math.abs(values[best] - x) ? i : best), 0);
  return { row: nearest(surface.sb, sb), col: nearest(surface.bd, bd) };
}
