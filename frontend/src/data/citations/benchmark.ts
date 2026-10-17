/**
 * The Benchmark page's references: the citations only this page uses, and the sources each of its sections lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const BENCHMARK_CITATIONS: Citation[] = [
];

/** Section key to the ids its reference list shows, in that order. */
export const BENCHMARK_REFS: Record<string, string[]> = {
  'b-verdict': ['roberts2017', 'field2007'],
  'b-protocols': ['sui2025'],
  'b-sites': ['hudaverdi2010'],
  'b-published': ['hudaverdi2010', 'kulatilake2012'],
  'b-network': ['kulatilake2012'],
  'b-live': ['kulatilake2012', 'sui2025'],
};
