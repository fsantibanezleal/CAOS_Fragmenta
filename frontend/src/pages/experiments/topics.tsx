/**
 * The topics of the Experiments page, in the two groups a reader's questions make (ADR-0071 rule 5: at most six groups,
 * at most six peers in a list): how the experiment is built, and what it answers. A topic is a leaf panel; the registry
 * says which group it sits in, which areas of ADR-0017 section 2.1 its section declares and which reference list it
 * shows, and is read by the page and by its contract test.
 */

import { Datasets } from './Datasets';
import { Diagnostics } from './Diagnostics';
import { Metrics } from './Metrics';
import { PerSite } from './PerSite';
import { Protocol } from './Protocol';
import { ProtocolSensitivity } from './ProtocolSensitivity';
import { Response } from './Response';
import type { Bi, TopicSpec } from './shared';
import { Transfer } from './Transfer';

export const GROUPS: { id: string; label: Bi }[] = [
  { id: 'design', label: { en: 'How is it built?', es: '¿Cómo se construye?' } },
  { id: 'questions', label: { en: 'What does it answer?', es: '¿Qué responde?' } },
];

export const TOPICS: TopicSpec[] = [
  { id: 'metrics', group: 'design', label: { en: 'Metrics', es: 'Métricas' }, areas: ['metrics'], refsKey: 'e-metrics', Component: Metrics },
  { id: 'protocol', group: 'design', label: { en: 'Protocol', es: 'Protocolo' }, areas: ['protocol'], refsKey: 'e-protocol', Component: Protocol },
  { id: 'datasets', group: 'design', label: { en: 'Datasets and cases', es: 'Datos y casos' }, areas: ['datasets'], refsKey: 'e-datasets', Component: Datasets },
  { id: 'transfer', group: 'questions', label: { en: 'A site it has not seen', es: 'Un sitio que no vio' }, areas: ['question'], refsKey: 'e-transfer', Component: Transfer },
  { id: 'protocol-sensitivity', group: 'questions', label: { en: 'Protocol sensitivity', es: 'Sensibilidad al protocolo' }, areas: ['question'], refsKey: 'e-sensitivity', Component: ProtocolSensitivity },
  { id: 'per-site', group: 'questions', label: { en: 'By site', es: 'Por sitio' }, areas: ['question'], refsKey: 'e-sites', Component: PerSite },
  { id: 'response', group: 'questions', label: { en: 'Design response', es: 'Respuesta del diseño' }, areas: ['question'], refsKey: 'e-response', Component: Response },
  { id: 'diagnostics', group: 'questions', label: { en: 'Diagnostics', es: 'Diagnósticos' }, areas: ['question'], refsKey: 'e-diagnostics', Component: Diagnostics },
];
