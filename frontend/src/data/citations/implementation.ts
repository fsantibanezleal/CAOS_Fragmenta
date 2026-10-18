/**
 * The Implementation page's references: the citations only this page uses, and the sources each of its sections lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 *
 * The two sources below were resolved against Crossref on 2026-10-17 (title, journal, volume, pages and year as printed).
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const IMPLEMENTATION_CITATIONS: Citation[] = [
  {
    id: 'goldberg1991',
    label: 'Goldberg 1991',
    citation:
      'Goldberg, D. (1991). What every computer scientist should know about floating-point arithmetic. ' +
      'ACM Computing Surveys 23:5-48. Why a sum depends on the order of its terms, why a relative difference ' +
      'is the right measure between two correct computations, and what rounding to a narrower format does.',
    doi: '10.1145/103162.103163',
  },
  {
    id: 'peng2011',
    label: 'Peng 2011',
    citation:
      'Peng, R. D. (2011). Reproducible research in computational science. Science 334:1226-1227. ' +
      'The code, the data and the stated environment that let a third party obtain the same result.',
    doi: '10.1126/science.1213847',
  },
];

/**
 * Section key to the ids its reference list shows, in that order. A section that cites nothing is not listed: it
 * declares a `noRefsReason` instead.
 */
export const IMPLEMENTATION_REFS: Record<string, string[]> = {
  'i-data-contract': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'i-geometry': ['hudaverdi2010', 'sui2025'],
  'i-reproducibility': ['peng2011', 'goldberg1991'],
  'i-leakage': ['roberts2017', 'kapoor2023'],
  'i-live': ['amoako2022', 'hudaverdi2010'],
  'i-models': ['breiman2001', 'chen2016', 'smola2004', 'goldberg1991'],
};
