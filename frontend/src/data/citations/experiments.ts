/**
 * The Experiments page's references: the citations only this page uses, and the sources each of its topics lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const EXPERIMENTS_CITATIONS: Citation[] = [
  {
    id: 'liu2008',
    label: 'Liu et al. 2008',
    citation:
      'Liu, F. T., Ting, K. M. and Zhou, Z.-H. (2008). Isolation forest. Eighth IEEE International ' +
      'Conference on Data Mining, 413-422. The outlier screen reported on the Experiments page.',
    doi: '10.1109/ICDM.2008.17',
  },
];

/** Topic key to the ids its reference list shows, in that order. */
export const EXPERIMENTS_REFS: Record<string, string[]> = {
  'e-metrics': ['kulatilake2012', 'efron1979', 'field2007', 'roberts2017'],
  'e-protocol': ['roberts2017', 'kapoor2023', 'sui2025', 'hudaverdi2010'],
  'e-datasets': ['hudaverdi2010', 'kulatilake2012', 'sui2025', 'huan2025'],
  'e-transfer': ['roberts2017', 'efron1979', 'field2007', 'hudaverdi2010'],
  'e-sensitivity': ['sui2025', 'roberts2017', 'kapoor2023'],
  'e-sites': ['hudaverdi2010', 'field2007'],
  'e-response': ['kuznetsov1973', 'hudaverdi2010'],
  'e-diagnostics': ['liu2008', 'huan2025', 'breiman2001', 'chen2016', 'sui2025'],
};
