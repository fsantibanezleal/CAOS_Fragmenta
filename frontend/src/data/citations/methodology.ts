/**
 * The Methodology page's references: the citations only this page uses, and the sources each of its topics lists.
 * A source several pages use sits in ../citations.ts. This file belongs to the page's own unit of work.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const METHODOLOGY_CITATIONS: Citation[] = [
  {
    id: 'babaeian2019',
    label: 'Babaeian et al. 2019',
    citation:
      'Babaeian, M., Ataei, M., Sereshki, F., Sotoudeh, F. and Mohammadi, S. (2019). A new framework ' +
      'for evaluation of rock fragmentation in open pit mines. Journal of Rock Mechanics and ' +
      'Geotechnical Engineering 11:325-336. Held. The second blastability rating table, the ' +
      'Protodyakonov lookup, and the site where the two-parameter distribution fitted better.',
    doi: '10.1016/j.jrmge.2018.11.006',
  },
  {
    id: 'ouchterlony2005',
    label: 'Ouchterlony 2005',
    citation:
      'Ouchterlony, F. (2005). The Swebrec function: linking fragmentation by blasting and crushing. ' +
      'Mining Technology 114:29-44. The three-parameter distribution; its form is used as printed in ' +
      'Amoako et al. 2022.',
    doi: '10.1179/037178405X44539',
  },
  {
    id: 'cybenko1989',
    label: 'Cybenko 1989',
    citation:
      'Cybenko, G. (1989). Approximation by superpositions of a sigmoidal function. Mathematics of ' +
      'Control, Signals and Systems 2:303-314. The universal-approximation result the 2012 network ' +
      'cites for its single hidden layer.',
    doi: '10.1007/BF02551274',
  },
  {
    id: 'marquardt1963',
    label: 'Marquardt 1963',
    citation:
      'Marquardt, D. W. (1963). An algorithm for least-squares estimation of nonlinear parameters. ' +
      'Journal of the Society for Industrial and Applied Mathematics 11:431-441. The damped ' +
      'Gauss-Newton step that trains the published network.',
    doi: '10.1137/0111030',
  },
  {
    id: 'wolpert1992',
    label: 'Wolpert 1992',
    citation:
      'Wolpert, D. H. (1992). Stacked generalization. Neural Networks 5:241-259. Stacking, which trains ' +
      'the combiner on out-of-sample predictions of the base learners; the 2025 construction trains it ' +
      'on in-sample ones.',
    doi: '10.1016/S0893-6080(05)80023-1',
  },
];

/** Topic key to the ids its reference list shows, in that order (the keys are `refsKey` of pages/methodology/index.ts). */
export const METHODOLOGY_REFS: Record<string, string[]> = {
  'm-mean-size': ['kuznetsov1973', 'hudaverdi2010', 'amoako2022', 'kulatilake2012'],
  'm-rock-factor': ['hudaverdi2010', 'babaeian2019', 'kulatilake2012', 'sui2025', 'huan2025'],
  'm-distributions': ['amoako2022', 'ouchterlony2005', 'babaeian2019', 'hudaverdi2010'],
  'm-router': ['hudaverdi2010', 'kulatilake2012'],
  'm-network': ['kulatilake2012', 'cybenko1989', 'marquardt1963'],
  'm-ensembles': ['sui2025', 'amoako2022', 'smola2004', 'breiman2001', 'chen2016', 'wolpert1992'],
};
