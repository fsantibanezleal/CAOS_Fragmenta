/**
 * The topics of the Implementation page, in the four groups a reader's questions make (ADR-0071 rule 5: at most six
 * groups, at most six peers in a list). A topic is a leaf panel; the registry says which group it sits in, which areas of
 * ADR-0017 section 2.1 its sections declare, and is read by the page and by its contract test.
 */

import { Architecture } from './Architecture';
import { Contract } from './Contract';
import { DataContract } from './DataContract';
import { Deployment } from './Deployment';
import { DeploymentGate } from './DeploymentGate';
import { EngineBake } from './EngineBake';
import { EngineGeometry } from './EngineGeometry';
import { EngineLeakage } from './EngineLeakage';
import { EngineLive } from './EngineLive';
import { EnginePortableModels } from './EnginePortableModels';
import { Lanes } from './Lanes';
import { Reproducibility } from './Reproducibility';
import type { Bi, TopicSpec } from './shared';

export const GROUPS: { id: string; label: Bi }[] = [
  { id: 'built', label: { en: 'How is it built?', es: '¿Cómo está construido?' } },
  { id: 'runs', label: { en: 'What runs where?', es: '¿Qué corre dónde?' } },
  { id: 'trust', label: { en: 'Can it be trusted?', es: '¿Se puede confiar?' } },
  { id: 'ships', label: { en: 'How does it ship?', es: '¿Cómo se entrega?' } },
];

export const TOPICS: TopicSpec[] = [
  { id: 'architecture', group: 'built', label: { en: 'Architecture', es: 'Arquitectura' }, areas: ['architecture'], Component: Architecture },
  { id: 'contract', group: 'built', label: { en: 'Artifact contract', es: 'Contrato de artefactos' }, areas: ['contract'], Component: Contract },
  { id: 'data-contract', group: 'built', label: { en: 'Data contract', es: 'Contrato de datos' }, areas: ['contract'], Component: DataContract },
  { id: 'engine-geometry', group: 'built', label: { en: 'Geometry', es: 'Geometría' }, areas: ['engine'], Component: EngineGeometry },
  { id: 'engine-bake', group: 'built', label: { en: 'The bake', es: 'El horneado' }, areas: ['engine'], Component: EngineBake },
  { id: 'lanes', group: 'runs', label: { en: 'Lanes', es: 'Carriles' }, areas: ['lanes'], Component: Lanes },
  { id: 'engine-live-equations', group: 'runs', label: { en: 'Live equations', es: 'Ecuaciones en vivo' }, areas: ['engine'], Component: EngineLive },
  { id: 'engine-portable-models', group: 'runs', label: { en: 'Portable models', es: 'Modelos portátiles' }, areas: ['engine'], Component: EnginePortableModels },
  { id: 'reproducibility', group: 'trust', label: { en: 'Reproducibility', es: 'Reproducibilidad' }, areas: ['reproducibility'], Component: Reproducibility },
  { id: 'engine-leakage', group: 'trust', label: { en: 'Leakage guards', es: 'Guardas de fuga' }, areas: ['engine'], Component: EngineLeakage },
  { id: 'deployment', group: 'ships', label: { en: 'Deploy', es: 'Despliegue' }, areas: ['deployment'], Component: Deployment },
  { id: 'deployment-gate', group: 'ships', label: { en: 'Gates', es: 'Compuertas' }, areas: ['deployment'], Component: DeploymentGate },
];
