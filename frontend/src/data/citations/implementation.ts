/**
 * The Implementation page's references: the citations only this page uses, and the sources each of its sections lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const IMPLEMENTATION_CITATIONS: Citation[] = [
];

/** Section key to the ids its reference list shows, in that order. */
export const IMPLEMENTATION_REFS: Record<string, string[]> = {
  'i-architecture': ['hudaverdi2010'],
  'i-data': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'i-geometry': ['hudaverdi2010'],
  'i-bake': ['hudaverdi2010'],
  'i-leakage': ['roberts2017', 'kapoor2023'],
  'i-live': ['amoako2022', 'hudaverdi2010'],
  'i-models': ['breiman2001', 'chen2016', 'smola2004'],
  'i-deploy': ['hudaverdi2010'],
};
