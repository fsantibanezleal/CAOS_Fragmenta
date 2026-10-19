/**
 * Every source this product cites, each with a DOI resolved against Crossref on 2026-10-04.
 *
 * Inline `<Cite>` at the point of use plus a per-section `<Refs>` list scoped to that section, never a
 * bibliography dump at the bottom that nobody can connect to a claim.
 *
 * One file per page (citations/<page>.ts) holds the sources only that page uses and its sections' reference lists;
 * this file holds the sources several pages use and composes the whole.
 *
 * The eight sources marked "held" are in the private vault and were read for this work; claims about
 * their content are transcribed from them. The methods references (forests, boosting, kernels,
 * stacking, the bootstrap, the isolation forest) are cited for the method they define.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

import { BENCHMARK_CITATIONS, BENCHMARK_REFS } from './citations/benchmark';
import { EXPERIMENTS_CITATIONS, EXPERIMENTS_REFS } from './citations/experiments';
import { IMPLEMENTATION_CITATIONS, IMPLEMENTATION_REFS } from './citations/implementation';
import { INTRODUCTION_CITATIONS, INTRODUCTION_REFS } from './citations/introduction';
import { METHODOLOGY_CITATIONS, METHODOLOGY_REFS } from './citations/methodology';

/** The sources more than one page uses, each defined once. A source only one page uses sits in that page's file. */
const SHARED_CITATIONS: Citation[] = [
  {
    id: 'hudaverdi2010',
    label: 'Hudaverdi et al. 2010',
    citation:
      'Hudaverdi, T., Kulatilake, P. H. S. W. and Kuzu, C. (2010). Prediction of blast fragmentation ' +
      'using multivariate analysis procedures. International Journal for Numerical and Analytical ' +
      'Methods in Geomechanics 35:1318-1333. Held. The 97-blast corpus, the downstream consequences of ' +
      'fragmentation, the cluster and discriminant analysis, the two group regressions, and the per-site ' +
      'prose from which the absolute geometry was recovered.',
    doi: '10.1002/nag.957',
  },
  {
    id: 'kulatilake2012',
    label: 'Kulatilake et al. 2012',
    citation:
      'Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). New prediction models for mean ' +
      'particle size in rock blast fragmentation. Geotechnical and Geological Engineering. Held. The ' +
      'published neural network, fully specified, and the twelve-blast validation table carrying three ' +
      'competing predictions on the same rows.',
    doi: '10.1007/s10706-012-9496-3',
  },
  {
    id: 'amoako2022',
    label: 'Amoako et al. 2022',
    citation:
      'Amoako, R., Jha, A. and Zhong, S. (2022). Rock fragmentation prediction using an artificial ' +
      'neural network and support vector regression hybrid approach. Mining 2:233-247. Open access, ' +
      'CC BY. Held. Controllable and uncontrollable blast parameters, the classical equations as ' +
      'printed, the uniformity index, the Swebrec form, the two-branch crush-zone mechanism, and the ' +
      'support-vector hyperparameters.',
    doi: '10.3390/mining2020013',
  },
  {
    id: 'sui2025',
    label: 'Sui et al. 2025',
    citation:
      'Sui, Y., Zhou, Z., Zhao, R., Yang, Z. and Zou, Y. (2025). Open-pit bench blasting ' +
      'fragmentation prediction based on stacking integrated strategy. Applied Sciences 15:1254. ' +
      'Open access, CC BY. Held. The stacking ensemble on this same corpus, its two parameter sets, its ' +
      'cancelled cross-validation, its feature-importance ranking, and the five field blasts used here ' +
      'as the extrapolation control.',
    doi: '10.3390/app15031254',
  },
  {
    id: 'huan2025',
    label: 'Huan et al. 2025',
    citation:
      'Huan, B., Li, X., Wang, J., Hu, T. and Tao, Z. (2025). An interpretable deep learning model for ' +
      'the accurate prediction of mean fragmentation size in blasting operations. Scientific Reports. ' +
      'Held. Its Isolation Forest screen of a 105-sample superset of this corpus; its hybrid model is ' +
      'cited and not reproduced, because its optimiser is not transcribable with confidence from the ' +
      'copy available.',
    doi: '10.1038/s41598-025-96005-7',
  },
  {
    id: 'kuznetsov1973',
    label: 'Kuznetsov 1973',
    citation:
      'Kuznetsov, V. M. (1973). The mean diameter of the fragments formed by blasting rock. Soviet ' +
      'Mining Science 9:144-148. The original mean-size equation; the form used here is the one ' +
      'printed with Cunningham’s correction in the held sources.',
    doi: '10.1007/BF02506177',
  },
  {
    id: 'smola2004',
    label: 'Smola and Schölkopf 2004',
    citation:
      'Smola, A. J. and Schölkopf, B. (2004). A tutorial on support vector regression. Statistics and ' +
      'Computing 14:199-222. The epsilon-insensitive regression and its kernel expansion.',
    doi: '10.1023/B:STCO.0000035301.49549.88',
  },
  {
    id: 'breiman2001',
    label: 'Breiman 2001',
    citation:
      'Breiman, L. (2001). Random forests. Machine Learning 45:5-32. The forest as an average of ' +
      'trees grown on bootstrap samples with random feature subsets, and the impurity importance.',
    doi: '10.1023/A:1010933404324',
  },
  {
    id: 'chen2016',
    label: 'Chen and Guestrin 2016',
    citation:
      'Chen, T. and Guestrin, C. (2016). XGBoost: a scalable tree boosting system. Proceedings of the ' +
      '22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, 785-794. The ' +
      'boosted additive tree model and its gain importance.',
    doi: '10.1145/2939672.2939785',
  },
  {
    id: 'roberts2017',
    label: 'Roberts et al. 2017',
    citation:
      'Roberts, D. R. et al. (2017). Cross-validation strategies for data with temporal, spatial, ' +
      'hierarchical, or phylogenetic structure. Ecography 40:913-929. Why grouped data needs a split ' +
      'that holds out whole groups.',
    doi: '10.1111/ecog.02881',
  },
  {
    id: 'kapoor2023',
    label: 'Kapoor and Narayanan 2023',
    citation:
      'Kapoor, S. and Narayanan, A. (2023). Leakage and the reproducibility crisis in ' +
      'machine-learning-based science. Patterns 4:100804. How leakage between training and test rows ' +
      'inflates reported performance.',
    doi: '10.1016/j.patter.2023.100804',
  },
  {
    id: 'efron1979',
    label: 'Efron 1979',
    citation:
      'Efron, B. (1979). Bootstrap methods: another look at the jackknife. The Annals of Statistics ' +
      '7:1-26. The bootstrap.',
    doi: '10.1214/aos/1176344552',
  },
  {
    id: 'field2007',
    label: 'Field and Welsh 2007',
    citation:
      'Field, C. A. and Welsh, A. H. (2007). Bootstrapping clustered data. Journal of the Royal ' +
      'Statistical Society, Series B 69:369-390. Resampling clusters, here campaigns, rather than rows.',
    doi: '10.1111/j.1467-9868.2007.00593.x',
  },
];

/** Every citation the shell resolves a `<Cite>` or a `<Refs>` against: the shared sources, then each page's own. */
export const CITATIONS: Citation[] = [
  ...SHARED_CITATIONS,
  ...INTRODUCTION_CITATIONS,
  ...METHODOLOGY_CITATIONS,
  ...IMPLEMENTATION_CITATIONS,
  ...EXPERIMENTS_CITATIONS,
  ...BENCHMARK_CITATIONS,
];

/** Section key to the ids its reference list shows, composed from the five page files. */
export const SECTION_REFS: Record<string, string[]> = {
  ...INTRODUCTION_REFS,
  ...METHODOLOGY_REFS,
  ...IMPLEMENTATION_REFS,
  ...EXPERIMENTS_REFS,
  ...BENCHMARK_REFS,
};
