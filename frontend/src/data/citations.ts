/**
 * Every source this product cites, each with a DOI resolved against Crossref on 2026-10-04.
 *
 * Inline `<Cite>` at the point of use plus a per-section `<Refs>` list scoped to that section, never a
 * bibliography dump at the bottom that nobody can connect to a claim.
 *
 * The eight sources marked "held" are in the private vault and were read for this work; claims about
 * their content are transcribed from them. The methods references (forests, boosting, kernels,
 * stacking, the bootstrap, the isolation forest) are cited for the method they define.
 */

import type { Citation } from '@fasl-work/caos-app-shell';

export const CITATIONS: Citation[] = [
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
    id: 'kuznetsov1973',
    label: 'Kuznetsov 1973',
    citation:
      'Kuznetsov, V. M. (1973). The mean diameter of the fragments formed by blasting rock. Soviet ' +
      'Mining Science 9:144-148. The original mean-size equation; the form used here is the one ' +
      'printed with Cunningham’s correction in the held sources.',
    doi: '10.1007/BF02506177',
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
    id: 'ouchterlony2019',
    label: 'Ouchterlony and Sanchidrián 2019',
    citation:
      'Ouchterlony, F. and Sanchidrián, J. A. (2019). A review of development of better prediction ' +
      'equations for blast fragmentation. Journal of Rock Mechanics and Geotechnical Engineering ' +
      '11:1094-1109. A review of the equation family this product starts from.',
    doi: '10.1016/j.jrmge.2019.03.001',
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
    id: 'wolpert1992',
    label: 'Wolpert 1992',
    citation:
      'Wolpert, D. H. (1992). Stacked generalization. Neural Networks 5:241-259. Stacking, which trains ' +
      'the combiner on out-of-sample predictions of the base learners; the 2025 construction trains it ' +
      'on in-sample ones.',
    doi: '10.1016/S0893-6080(05)80023-1',
  },
  {
    id: 'liu2008',
    label: 'Liu et al. 2008',
    citation:
      'Liu, F. T., Ting, K. M. and Zhou, Z.-H. (2008). Isolation forest. Eighth IEEE International ' +
      'Conference on Data Mining, 413-422. The outlier screen reported on the Experiments page.',
    doi: '10.1109/ICDM.2008.17',
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

/** The sources each page section leans on, so a Refs list is per section, never one dump. */
export const SECTION_REFS: Record<string, string[]> = {
  'intro-why': ['hudaverdi2010', 'amoako2022'],
  'intro-controls': ['hudaverdi2010', 'amoako2022'],
  'intro-math': ['kuznetsov1973', 'hudaverdi2010', 'amoako2022'],
  'intro-question': ['sui2025', 'kulatilake2012', 'ouchterlony2019', 'roberts2017'],
  'intro-path': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'intro-data': ['hudaverdi2010', 'kulatilake2012', 'sui2025', 'li2023'],
  'intro-scope': ['amoako2022', 'huan2025'],
  'm-classical': ['kuznetsov1973', 'hudaverdi2010', 'amoako2022', 'kulatilake2012'],
  'm-rock': ['hudaverdi2010', 'babaeian2019', 'sui2025'],
  'm-distributions': ['amoako2022', 'ouchterlony2005', 'babaeian2019'],
  'm-statistical': ['hudaverdi2010', 'kulatilake2012'],
  'm-network': ['kulatilake2012', 'cybenko1989', 'marquardt1963'],
  'm-ensembles': ['sui2025', 'amoako2022', 'smola2004', 'breiman2001', 'chen2016', 'wolpert1992'],
  'm-protocols': ['sui2025', 'roberts2017', 'kapoor2023', 'efron1979', 'field2007'],
  'i-architecture': ['hudaverdi2010'],
  'i-data': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'i-geometry': ['hudaverdi2010'],
  'i-bake': ['hudaverdi2010'],
  'i-leakage': ['roberts2017', 'kapoor2023'],
  'i-live': ['amoako2022', 'hudaverdi2010'],
  'i-models': ['breiman2001', 'chen2016', 'smola2004'],
  'i-deploy': ['hudaverdi2010'],
  'e-design': ['sui2025', 'roberts2017', 'kapoor2023'],
  'e-metrics': ['efron1979', 'field2007'],
  'e-coverage': ['hudaverdi2010', 'kulatilake2012', 'sui2025'],
  'e-spread': ['sui2025'],
  'e-sites': ['hudaverdi2010'],
  'e-response': ['kuznetsov1973', 'hudaverdi2010'],
  'e-diagnostics': ['liu2008', 'huan2025', 'breiman2001', 'chen2016', 'sui2025'],
  'b-verdict': ['roberts2017', 'field2007'],
  'b-protocols': ['sui2025'],
  'b-sites': ['hudaverdi2010'],
  'b-published': ['hudaverdi2010', 'kulatilake2012'],
  'b-network': ['kulatilake2012'],
  'b-live': ['kulatilake2012', 'sui2025'],
};
