/**
 * Loading the committed artifacts, and the vocabulary every screen shares.
 *
 * Everything on this site is a projection of files the offline bake wrote. Nothing is computed at
 * deploy time. The live lane recomputes the closed-form arms in the browser so a reader can change a
 * design, and its agreement with these numbers is a gate rather than an assumption.
 */

import type { BenchmarkArtifact, CaseArtifact, CaseIndex, Lang } from './contract.types';

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

/**
 * Cache-busted with the app version.
 *
 * GitHub Pages serves index.html from a CDN cache, so a fresh bundle can pair with a stale data
 * file. Stamping the version onto every data URL makes the pairing explicit.
 */
const bust = (path: string) => `${path}${path.includes('?') ? '&' : '?'}v=${APP_VERSION}`;

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const existing = cache.get(path);
  if (existing) return existing as Promise<T>;
  const pending = (async () => {
    const response = await fetch(bust(path));
    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}`);
    }
    // A missing artifact on Pages comes back as the SPA fallback page with a 200, so the status
    // alone proves nothing. Parsing is what actually distinguishes data from an HTML apology.
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `${path} returned ${text.length} bytes that are not JSON. On a static host this usually ` +
          `means the file is absent and the router served the app shell instead.`,
      );
    }
  })();
  cache.set(path, pending);
  return pending;
}

export const loadIndex = () => fetchJson<CaseIndex>('data/manifests/index.json');
export const loadCase = (caseId: string) => fetchJson<CaseArtifact>(`data/${caseId}/case.json`);
export const loadBenchmark = () => fetchJson<BenchmarkArtifact>('data/benchmark.json');

/* ------------------------------------------------------------------------------------------- */
/* The shared vocabulary                                                                        */
/* ------------------------------------------------------------------------------------------- */

export type Tier = 'control' | 'classical' | 'semi-mechanistic' | 'statistical' | 'learned';

export interface ArmMeta {
  id: string;
  tier: Tier;
  label: Record<Lang, string>;
  /** One line on what it is. Shown on the method card, not only in a tooltip. */
  blurb: Record<Lang, string>;
  /** Whether it predicts a full size distribution or only a mean size. */
  distribution: boolean;
  source: string;
}

export const ARMS: ArmMeta[] = [
  {
    id: 'null',
    tier: 'control',
    label: { en: 'Null: predict the mean', es: 'Nulo: predecir la media' },
    blurb: {
      en: 'Predicts the training mean for every blast. The comparison every other arm is measured against.',
      es: 'Predice la media de entrenamiento para todo tiro. La comparacion contra la que se mide todo lo demas.',
    },
    distribution: false,
    source: 'the mean measured size of the training blasts',
  },
  {
    id: 'kuznetsov',
    tier: 'classical',
    label: { en: 'Classical mean size', es: 'Tamano medio clasico' },
    blurb: {
      en: 'The 1973 equation with the explosive-strength correction. Needs a rock volume and a charge mass, so it abstains where the scale is unpublished.',
      es: 'La ecuacion de 1973 con la correccion por potencia del explosivo. Necesita volumen de roca y masa de carga, asi que se abstiene donde no se publica la escala.',
    },
    distribution: false,
    source: 'Hudaverdi, Kulatilake and Kuzu 2010, doi:10.1002/nag.957, Eq. 1',
  },
  {
    id: 'kuz-ram',
    tier: 'classical',
    label: { en: 'Classical distribution', es: 'Distribucion clasica' },
    blurb: {
      en: 'The classical mean size with a two-parameter Rosin-Rammler curve around it, shaped by the Cunningham uniformity index.',
      es: 'El tamano medio clasico con una curva Rosin-Rammler de dos parametros, moldeada por el indice de uniformidad de Cunningham.',
    },
    distribution: true,
    source: 'Amoako, Jha and Zhong 2022, doi:10.3390/mining2020013, Eqs. 3, 5 and 7',
  },
  {
    id: 'swebrec',
    tier: 'classical',
    label: { en: 'Three-parameter distribution', es: 'Distribucion de tres parametros' },
    blurb: {
      en: 'Adds an explicit upper size limit, which fixes the coarse tail the two-parameter form gets wrong and predicts a heavier fines branch.',
      es: 'Agrega un limite superior explicito, que corrige la cola gruesa que la forma de dos parametros equivoca y predice mas finos.',
    },
    distribution: true,
    source: 'Ouchterlony 2005, as printed in Amoako 2022 Eqs. 10 and 11',
  },
  {
    id: 'crush-zone',
    tier: 'semi-mechanistic',
    label: { en: 'Two-branch crush zone', es: 'Zona triturada de dos ramas' },
    blurb: {
      en: 'Splits the curve: tensile fracturing makes the coarse fragments, compressive-shear fracturing around the hole makes the fines. Its branch constants are not published anywhere and are set here.',
      es: 'Separa la curva: la fractura por traccion produce los fragmentos gruesos y la fractura por corte alrededor del barreno produce los finos. Sus constantes de rama no estan publicadas y aqui se fijan.',
    },
    distribution: true,
    source: 'structure from Amoako 2022 section 3; branch constants not published',
  },
  {
    id: 'group-discriminant',
    tier: 'statistical',
    label: { en: 'Rock-stiffness router', es: 'Enrutador por rigidez de roca' },
    blurb: {
      en: 'Assigns a blast to the high or low modulus group, which decides which regression fires. Exact on all 109 labelled blasts. It predicts a group, not a size.',
      es: 'Asigna un tiro al grupo de modulo alto o bajo, lo que decide que regresion se usa. Exacto en los 109 tiros etiquetados. Predice un grupo, no un tamano.',
    },
    distribution: false,
    source: 'Hudaverdi et al. 2010, Eq. 8',
  },
  {
    id: 'published-regression',
    tier: 'statistical',
    label: { en: 'Published regression', es: 'Regresion publicada' },
    blurb: {
      en: 'Two power laws, one per stiffness group, with the exponents taken verbatim from the source. The only arm here that holds up on a site it has never seen.',
      es: 'Dos leyes de potencia, una por grupo de rigidez, con los exponentes tomados literalmente de la fuente. El unico modelo aqui que resiste en un sitio que nunca vio.',
    },
    distribution: false,
    source: 'Hudaverdi et al. 2010, Eqs. 9 and 10',
  },
  {
    id: 'refitted-regression',
    tier: 'statistical',
    label: { en: 'Refitted regression', es: 'Regresion reajustada' },
    blurb: {
      en: 'The same functional form, refitted to the training rows instead of taken as constants. It collapses when a whole site is held out, which is the point.',
      es: 'La misma forma funcional, reajustada a las filas de entrenamiento en vez de tomada como constantes. Se derrumba al excluir un sitio completo, y ese es el punto.',
    },
    distribution: false,
    source: 'the published form, coefficients refitted here',
  },
  {
    id: 'published-neural-net',
    tier: 'learned',
    label: { en: 'Published neural network', es: 'Red neuronal publicada' },
    blurb: {
      en: 'Seven inputs, one hidden layer, trained per group by Levenberg-Marquardt, eight simulations averaged. Reproduced to its published specification; its published score is not reachable across seeds.',
      es: 'Siete entradas, una capa oculta, entrenada por grupo con Levenberg-Marquardt, ocho simulaciones promediadas. Reproducida segun su especificacion publicada; su puntaje publicado no se alcanza en ninguna semilla.',
    },
    distribution: false,
    source: 'Kulatilake, Hudaverdi and Wu 2012, doi:10.1007/s10706-012-9496-3, section 5',
  },
  {
    id: 'svr-rbf',
    tier: 'learned',
    label: { en: 'Support vector regression', es: 'Regresion por vectores de soporte' },
    blurb: {
      en: 'Radial kernel with the hyperparameters one 2025 study chose from a 2700-combination search. A second study chose a polynomial kernel and reported this arm as its worst.',
      es: 'Nucleo radial con los hiperparametros que un estudio de 2025 eligio en una busqueda de 2700 combinaciones. Otro estudio eligio nucleo polinomial y lo reporto como su peor modelo.',
    },
    distribution: false,
    source: 'Amoako, Jha and Zhong 2022, section 4.2.1',
  },
  {
    id: 'random-forest',
    tier: 'learned',
    label: { en: 'Random forest', es: 'Bosque aleatorio' },
    blurb: {
      en: 'Seventy-six trees with the 2025 study final parameters. Strong on a random split and negative on an unseen site.',
      es: 'Setenta y seis arboles con los parametros finales del estudio de 2025. Fuerte en una particion aleatoria y negativo en un sitio no visto.',
    },
    distribution: false,
    source: 'Sui, Zhou, Zhao, Yang and Zou 2025, doi:10.3390/app15031254',
  },
  {
    id: 'xgboost',
    tier: 'learned',
    label: { en: 'Gradient boosting', es: 'Potenciacion por gradiente' },
    blurb: {
      en: 'Reproduced at the published learning rate of 0.5, which its own source reports as overfitting. Left visible rather than tuned away.',
      es: 'Reproducido con la tasa de aprendizaje publicada de 0.5, que su propia fuente reporta como sobreajuste. Se deja visible en vez de corregirlo.',
    },
    distribution: false,
    source: 'Sui et al. 2025, final parameters',
  },
  {
    id: 'stacking',
    tier: 'learned',
    label: { en: 'Stacking ensemble', es: 'Ensamble apilado' },
    blurb: {
      en: 'The 2025 state of the art on this corpus: forest and boosting under a linear meta-learner, with cross-validation removed exactly as published.',
      es: 'El estado del arte 2025 sobre este corpus: bosque y potenciacion bajo un meta-modelo lineal, sin validacion cruzada tal como se publico.',
    },
    distribution: false,
    source: 'Sui et al. 2025, section 4',
  },
];

export const ARM_BY_ID = new Map(ARMS.map((arm) => [arm.id, arm]));

export const TIER_LABEL: Record<Tier, Record<Lang, string>> = {
  control: { en: 'Controls', es: 'Controles' },
  classical: { en: 'Classical', es: 'Clasicos' },
  'semi-mechanistic': { en: 'Semi-mechanistic', es: 'Semi-mecanicistas' },
  statistical: { en: 'Statistical', es: 'Estadisticos' },
  learned: { en: 'Learned', es: 'Aprendidos' },
};

export const TIER_ORDER: Tier[] = ['classical', 'semi-mechanistic', 'statistical', 'learned', 'control'];

export const PROTOCOL_LABEL: Record<string, Record<Lang, string>> = {
  'random-8020': {
    en: 'Random 80/20, the published protocol',
    es: 'Aleatorio 80/20, el protocolo publicado',
  },
  'dedup-random': { en: 'Deduplicated, then random', es: 'Deduplicado y luego aleatorio' },
  'leave-one-site-out': {
    en: 'Leave one site out, the honest protocol',
    es: 'Dejar un sitio fuera, el protocolo honesto',
  },
};

export const CATEGORY_LABEL: Record<string, Record<Lang, string>> = {
  'real-campaign': { en: 'Real campaigns', es: 'Campanas reales' },
  'extrapolation-control': { en: 'Extrapolation control', es: 'Control de extrapolacion' },
  'parameter-sweep': { en: 'Parameter sweeps', es: 'Barridos de parametros' },
  'structural-control': { en: 'Structural control', es: 'Control estructural' },
  'negative-control': { en: 'Negative controls', es: 'Controles negativos' },
  'positive-control': { en: 'Positive control', es: 'Control positivo' },
};

export const FEATURE_LABEL: Record<string, Record<Lang, string>> = {
  S_over_B: { en: 'Spacing / burden', es: 'Espaciamiento / bordo' },
  H_over_B: { en: 'Bench height / burden', es: 'Altura de banco / bordo' },
  B_over_D: { en: 'Burden / hole diameter', es: 'Bordo / diametro' },
  T_over_B: { en: 'Stemming / burden', es: 'Taco / bordo' },
  Pf_kg_m3: { en: 'Powder factor, kg/m3', es: 'Factor de carga, kg/m3' },
  XB_m: { en: 'In situ block size, m', es: 'Tamano de bloque in situ, m' },
  E_GPa: { en: 'Young modulus, GPa', es: 'Modulo de Young, GPa' },
};

/** Format a fragment size for a readout: millimetres below 10 cm, centimetres above. */
export function formatSize(metres: number | null | undefined): string {
  if (metres === null || metres === undefined || !Number.isFinite(metres)) return 'n/a';
  if (metres < 0.1) return `${(metres * 1000).toFixed(0)} mm`;
  return `${(metres * 100).toFixed(1)} cm`;
}

export function formatSigned(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

export function formatScore(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(digits);
}
