/**
 * Every source this product actually read, with a real DOI.
 *
 * Inline `<Cite>` at the point of use plus a per-section `<Refs>` list, never a bibliography dump at
 * the bottom that nobody can connect to a claim.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const CITATIONS: Citation[] = [
  {
    id: 'hudaverdi2010',
    label: 'Hudaverdi et al. 2010',
    citation:
      'Hudaverdi, T., Kulatilake, P. H. S. W. and Kuzu, C. (2010). Prediction of blast fragmentation ' +
      'using multivariate analysis procedures. International Journal for Numerical and Analytical ' +
      'Methods in Geomechanics 35:1318-1333. The 97-blast corpus, the cluster and discriminant ' +
      'analysis, the two group regressions, and the per-site prose from which the absolute geometry ' +
      'was recovered.',
    doi: '10.1002/nag.957',
  },
  {
    id: 'kulatilake2012',
    label: 'Kulatilake et al. 2012',
    citation:
      'Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). New prediction models for mean ' +
      'particle size in rock blast fragmentation. Geotechnical and Geological Engineering. The ' +
      'published neural network, fully specified, and the twelve-blast validation table carrying ' +
      'three competing predictions on the same rows.',
    doi: '10.1007/s10706-012-9496-3',
  },
  {
    id: 'amoako2022',
    label: 'Amoako et al. 2022',
    citation:
      'Amoako, R., Jha, A. and Zhong, S. (2022). Rock fragmentation prediction using an artificial ' +
      'neural network and support vector regression hybrid approach. Mining 2:233-247. Open access, ' +
      'CC BY. The classical equations as printed, the uniformity index, the Swebrec form, the ' +
      'description of the two-branch crush-zone mechanism, and the support-vector hyperparameters.',
    doi: '10.3390/mining2020013',
  },
  {
    id: 'sui2025',
    label: 'Sui et al. 2025',
    citation:
      'Sui, Y., Zhou, Z., Zhao, R., Yang, Z. and Zou, Y. (2025). Open-pit bench blasting ' +
      'fragmentation prediction based on stacking integrated strategy. Applied Sciences 15:1254. ' +
      'Open access, CC BY. The stacking ensemble on this same corpus, its final hyperparameters, its ' +
      'removed cross-validation, and the five field blasts that serve here as the extrapolation control.',
    doi: '10.3390/app15031254',
  },
  {
    id: 'babaeian2019',
    label: 'Babaeian et al. 2019',
    citation:
      'Babaeian, M., Ataei, M., Sereshki, F., Sotoudeh, F. and Mohammadi, S. (2019). A new framework ' +
      'for evaluation of rock fragmentation in open pit mines. Journal of Rock Mechanics and ' +
      'Geotechnical Engineering 11:325-336. The second rating table for the blastability index, which ' +
      'disagrees with the first, and the counter-example where the two-parameter distribution fitted ' +
      'better than the three-parameter one.',
    doi: '10.1016/j.jrmge.2018.11.006',
  },
  {
    id: 'huan2025',
    label: 'Huan et al. 2025',
    citation:
      'Huan, B., Li, X., Wang, J., Hu, T. and Tao, Z. (2025). An interpretable deep learning model for ' +
      'the accurate prediction of mean fragmentation size in blasting operations. Scientific Reports. ' +
      'Cited as prior art with its published figures and deliberately NOT reproduced: its optimiser is ' +
      'not transcribable with confidence from the copy available, and an approximation under that name ' +
      'would be a fabricated method.',
    doi: '10.1038/s41598-025-96005-7',
  },
  {
    id: 'li2023',
    label: 'Li et al. 2023',
    citation:
      'Li, P., Xie, S., Xia, H., Wang, D. and Xu, Z. (2023). Advanced analysis of blast pile ' +
      'fragmentation in open-pit mining utilizing 3D point cloud technology. Traitement du Signal ' +
      '40:6. Open access, CC BY. The modern alternative to two-dimensional image analysis for ' +
      'producing the ground truth this product is scored against. A measurement channel, not a ' +
      'prediction model.',
    doi: '10.18280/ts.400615',
  },
];

/** The sources each page leans on, so a Refs list is per section rather than one dump at the end. */
export const SECTION_REFS: Record<string, string[]> = {
  introduction: ['hudaverdi2010', 'kulatilake2012', 'sui2025', 'amoako2022'],
  methodology: ['amoako2022', 'hudaverdi2010', 'kulatilake2012', 'babaeian2019', 'sui2025', 'huan2025'],
  implementation: ['hudaverdi2010', 'sui2025', 'li2023'],
  experiments: ['hudaverdi2010', 'sui2025', 'amoako2022'],
  benchmark: ['kulatilake2012', 'hudaverdi2010', 'sui2025'],
};
