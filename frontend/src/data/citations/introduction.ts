/**
 * The Introduction page's references: the citations only this page uses, and the sources each of its sections lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const INTRODUCTION_CITATIONS: Citation[] = [
  {
    id: 'li2023',
    label: 'Li et al. 2023',
    citation:
      'Li, P., Xie, S., Xia, H., Wang, D. and Xu, Z. (2023). Advanced analysis of blast pile ' +
      'fragmentation in open-pit mining utilizing 3D point cloud technology. Traitement du Signal ' +
      '40:6. Open access, CC BY. Held. Three-dimensional scanning as an alternative to image analysis ' +
      'for measuring a muckpile.',
    doi: '10.18280/ts.400615',
  },
  {
    id: 'ouchterlony2019',
    label: 'Ouchterlony and Sanchidrián 2019',
    citation:
      'Ouchterlony, F. and Sanchidrián, J. A. (2019). A review of development of better prediction ' +
      'equations for blast fragmentation. Journal of Rock Mechanics and Geotechnical Engineering ' +
      '11:1094-1109. A review of the equation family this product starts from.',
    doi: '10.1016/j.jrmge.2019.03.001',
  },
];

/** Section key to the ids its reference list shows, in that order. */
export const INTRODUCTION_REFS: Record<string, string[]> = {
  'intro-why': ['hudaverdi2010', 'amoako2022'],
  'intro-controls': ['hudaverdi2010', 'amoako2022'],
  'intro-math': ['kuznetsov1973', 'hudaverdi2010', 'amoako2022'],
  'intro-question': ['sui2025', 'kulatilake2012', 'ouchterlony2019', 'roberts2017'],
  'intro-path': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'intro-data': ['hudaverdi2010', 'kulatilake2012', 'sui2025', 'li2023'],
  'intro-scope': ['amoako2022', 'huan2025'],
};
