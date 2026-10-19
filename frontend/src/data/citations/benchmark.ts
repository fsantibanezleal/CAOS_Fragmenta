/**
 * The Benchmark page's references: the citations only this page uses (none: every source it cites is shared with another
 * page), and the sources each of its sections lists. A source several pages use sits in ../citations.ts. This file belongs
 * to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const BENCHMARK_CITATIONS: Citation[] = [];

/** Section key to the ids its reference list shows, in that order. */
export const BENCHMARK_REFS: Record<string, string[]> = {
  'b-caveat': ['field2007', 'efron1979'],
  'b-verdict': ['roberts2017'],
  'b-arms': ['efron1979'],
  'b-persite': ['hudaverdi2010'],
  'b-comparison': ['kuznetsov1973'],
  'b-published': ['kulatilake2012', 'hudaverdi2010'],
  'b-network': ['kulatilake2012'],
  'b-robustness': ['sui2025', 'roberts2017'],
  'b-live': ['kulatilake2012', 'sui2025'],
  'b-sites': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'b-arms-provenance': ['kuznetsov1973', 'hudaverdi2010', 'kulatilake2012', 'amoako2022', 'sui2025'],
};
