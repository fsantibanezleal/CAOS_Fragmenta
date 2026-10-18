/**
 * The six method topics of the Methodology page, one per method family (ADR-0017 section 2.1; the wiki `docs/methods/02`
 * to `07`). Each topic is one `method` section of its kind; at most six peers (ADR-0071 rule 5).
 */

import type { ComponentType } from 'react';

import Distributions from './Distributions';
import Ensembles from './Ensembles';
import MeanSize from './MeanSize';
import Network from './Network';
import RockFactor from './RockFactor';
import Router from './Router';
import type { TopicData } from './shared';

export type { TopicData } from './shared';

export interface Topic {
  id: string;
  kind: 'classical' | 'learned';
  label: { en: string; es: string };
  /** The key of the topic's reference list in `data/citations/methodology.ts`. */
  refsKey: string;
  Body: ComponentType<TopicData>;
}

export const TOPICS: Topic[] = [
  { id: 'mean-size', kind: 'classical', label: { en: 'Kuz-Ram mean size', es: 'Tamaño medio Kuz-Ram' }, refsKey: 'm-mean-size', Body: MeanSize },
  { id: 'rock-factor', kind: 'classical', label: { en: 'Rock factor', es: 'Factor de roca' }, refsKey: 'm-rock-factor', Body: RockFactor },
  { id: 'distributions', kind: 'classical', label: { en: 'Distribution shapes', es: 'Formas de distribución' }, refsKey: 'm-distributions', Body: Distributions },
  { id: 'router', kind: 'classical', label: { en: 'Router and regressions', es: 'Enrutador y regresiones' }, refsKey: 'm-router', Body: Router },
  { id: 'network', kind: 'learned', label: { en: 'Neural network', es: 'Red neuronal' }, refsKey: 'm-network', Body: Network },
  { id: 'ensembles', kind: 'learned', label: { en: 'Kernels and ensembles', es: 'Núcleos y ensambles' }, refsKey: 'm-ensembles', Body: Ensembles },
];
