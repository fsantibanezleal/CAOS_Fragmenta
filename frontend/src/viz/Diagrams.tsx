/**
 * Hand-authored, theme-aware SVG diagrams.
 *
 * Inline JSX rather than files loaded through an `<img>`. An SVG behind an `<img>` is a separate
 * document and cannot read the page's CSS custom properties, so every `var(--fg)` inside it resolves
 * to black and the whole figure disappears in a dark theme. Inline is the only way these repaint
 * with the toggle.
 *
 * Every label names a real quantity or a real file. A diagram of boxes with generic nouns tells a
 * reader nothing they could not have guessed.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import type { ReactNode } from 'react';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const ACCENT = 'var(--color-accent, #4f8ef7)';
const OK = 'var(--color-good, #3aa675)';
const WARN = 'var(--color-warn, #d19a2b)';
const DANGER = 'var(--color-bad, #cc4b4b)';
const BORDER = 'var(--color-border, rgba(128,128,128,0.3))';
const SURFACE = 'var(--color-surface-2, transparent)';

function Figure({
  children,
  caption,
  viewBox,
  label,
}: {
  children: ReactNode;
  caption: string;
  viewBox: string;
  label: string;
}) {
  return (
    <figure className="fr-figure">
      <svg viewBox={viewBox} role="img" aria-label={label} className="fr-svg">
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Box({
  x,
  y,
  w,
  h,
  title,
  lines = [],
  stroke = BORDER,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  stroke?: string;
  accent?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={SURFACE} stroke={accent ?? stroke} strokeWidth={accent ? 2 : 1} />
      <text x={x + 10} y={y + 19} fill={FG} fontSize={12} fontWeight={600}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 10} y={y + 37 + i * 14} fill={MUTED} fontSize={10.5} fontFamily="ui-monospace, monospace">
          {line}
        </text>
      ))}
    </g>
  );
}

function Arrow({ from, to, label }: { from: [number, number]; to: [number, number]; label?: string }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  return (
    <g>
      <defs>
        <marker id="fr-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={MUTED} strokeWidth={1.4} markerEnd="url(#fr-arrow)" />
      {label ? (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} fill={MUTED} fontSize={10} textAnchor="middle">
          {label}
        </text>
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------------------------------------- */

export function OverviewDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 250"
      label={es ? 'De la malla a la curva y al puntaje' : 'From pattern to curve to score'}
      caption={
        es
          ? 'El camino completo. Todo a la izquierda de la línea punteada es dato real; todo a la derecha es un modelo que debe ganarse la confianza.'
          : 'The whole path. Everything left of the dotted line is real data; everything right of it is a model that has to earn trust.'
      }
    >
      <Box x={10} y={40} w={170} h={78} title={es ? '97 tiros reales' : '97 real blasts'} lines={['10 campaigns', '7 ratios each', 'x50 by image analysis']} accent={OK} />
      <Arrow from={[184, 79]} to={[220, 79]} />
      <Box x={224} y={40} w={170} h={78} title={es ? 'Geometría recuperada' : 'Geometry recovered'} lines={['B = (B/D) x D', 'V = B x S x H', 'Q = Pf x V']} />
      <Arrow from={[398, 79]} to={[434, 79]} />
      <Box x={438} y={16} w={190} h={60} title={es ? 'Doce modelos' : 'Twelve models'} lines={['classical to ensemble', '4 tiers, 2 controls']} accent={ACCENT} />
      <Box x={438} y={92} w={190} h={60} title={es ? 'Tres protocolos' : 'Three protocols'} lines={['random, dedup,', 'leave one site out']} accent={WARN} />
      <Arrow from={[632, 46]} to={[672, 70]} />
      <Arrow from={[632, 122]} to={[672, 98]} />
      <Box x={676} y={40} w={200} h={78} title={es ? 'El veredicto' : 'The verdict'} lines={['0 of 6 learned arms', 'positive across sites', 'the 2 fixed ones hold']} accent={DANGER} />

      <line x1={416} y1={8} x2={416} y2={200} stroke={MUTED} strokeDasharray="4 4" strokeWidth={1} />
      <text x={300} y={196} fill={MUTED} fontSize={10.5} textAnchor="middle">
        {es ? 'medido y verificado' : 'measured and verified'}
      </text>
      <text x={660} y={196} fill={MUTED} fontSize={10.5} textAnchor="middle">
        {es ? 'modelado, y puesto a prueba' : 'modelled, and put to the test'}
      </text>
      <text x={10} y={228} fill={MUTED} fontSize={10}>
        {es
          ? 'La reconstrucción se verifica contra 15 restricciones dimensionales que la propia fuente declara en prosa.'
          : 'The reconstruction is checked against 15 dimensional constraints the source states in its own prose.'}
      </text>
    </Figure>
  );
}

export function ClassicalFlowDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 200"
      label={es ? 'El modelo clásico, término a término' : 'The classical model, term by term'}
      caption={
        es
          ? 'Las tres piezas del modelo clásico. El factor de roca entra multiplicando, así que el tamaño predicho es lineal en el.'
          : 'The three pieces of the classical model. The rock factor enters multiplicatively, so predicted size is linear in it.'
      }
    >
      <Box x={10} y={20} w={180} h={72} title={es ? 'Malla absoluta' : 'Absolute pattern'} lines={['B, S, H, T, d', 'V = B x S x H', 'Q = Pf x V']} />
      <Box x={10} y={106} w={180} h={62} title={es ? 'Factor de roca' : 'Rock factor'} lines={['3 published schemes', '+ 1 recovered']} accent={WARN} />
      <Arrow from={[194, 56]} to={[236, 66]} />
      <Arrow from={[194, 137]} to={[236, 90]} />
      <Box x={240} y={44} w={210} h={68} title={es ? 'Tamaño medio' : 'Mean size'} lines={['A (V/Q)^0.8 Q^(1/6)', 'x (RWS/115)^(-19/30)']} accent={ACCENT} />
      <Arrow from={[454, 78]} to={[496, 78]} />
      <Box x={500} y={20} w={200} h={62} title={es ? 'Índice de uniformidad' : 'Uniformity index'} lines={['2.2 - 14 B/d', 'B in m, d in mm']} accent={DANGER} />
      <Box x={500} y={96} w={200} h={62} title={es ? 'Curva' : 'Curve'} lines={['two-parameter', 'three-parameter', 'two-branch']} />
      <Arrow from={[704, 51]} to={[746, 70]} />
      <Arrow from={[704, 127]} to={[746, 94]} />
      <Box x={750} y={52} w={140} h={62} title="P20 P50 P80" lines={['oversize %', 'fines %']} accent={OK} />
      <text x={500} y={180} fill={DANGER} fontSize={10}>
        {es
          ? 'Trampa: el bordo va en metros y el diámetro en milímetros. Leerlo como la razón tabulada rompe el índice.'
          : 'Trap: the burden is in metres and the diameter in millimetres. Reading it as the tabulated ratio breaks the index.'}
      </text>
    </Figure>
  );
}

export function RockFactorDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 210"
      label={es ? 'Cuatro caminos al factor de roca' : 'Four routes to the rock factor'}
      caption={
        es
          ? 'Cuatro caminos, tres publicados y uno recuperado. Los dos esquemas de calificación llevan la misma atribución y diferentes tablas.'
          : 'Four routes, three published and one recovered. The two rating schemes carry the same attribution and different tables.'
      }
    >
      <Box x={10} y={14} w={200} h={76} title={es ? 'Esquema A' : 'Scheme A'} lines={['BI = 0.5(RMD+JPS+', 'JPO+RDI+0.05 UCS)', 'A = 0.06 BI']} />
      <Box x={10} y={102} w={200} h={76} title={es ? 'Esquema B' : 'Scheme B'} lines={['same sum, strength', '= UCS/3 or UCS/5', 'by modulus']} accent={WARN} />
      <Box x={240} y={14} w={190} h={76} title={es ? 'Búsqueda de cinco bandas' : 'Five-band lookup'} lines={['Protodyakonov index', '3 to 13']} />
      <Box x={240} y={102} w={190} h={76} title={es ? 'Recuperado' : 'Recovered'} lines={['invert x50 on the', 'published prediction']} accent={OK} />
      <Arrow from={[434, 96]} to={[486, 96]} />
      <Box x={490} y={54} w={190} h={82} title="A" lines={['0.8 to 22', 'linear in x50', 'spread 0.6 to 3.7%', 'within a site']} accent={ACCENT} />
      <Arrow from={[684, 95]} to={[726, 95]} />
      <Box x={730} y={62} w={160} h={66} title={es ? 'Desacuerdo' : 'Disagreement'} lines={['up to 0.85 in A', 'on the same rock']} accent={DANGER} />
      <text x={10} y={200} fill={MUTED} fontSize={10}>
        {es
          ? 'Los valores recuperados apenas se mueven dentro de un sitio, lo que a su vez valida la reconstrucción geométrica.'
          : 'The recovered values barely move within a site, which in turn validates the geometry reconstruction.'}
      </text>
    </Figure>
  );
}

export function GroupRouterDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 190"
      label={es ? 'El enrutador por rigidez' : 'The stiffness router'}
      caption={
        es
          ? 'La función discriminante decide qué ecuación se aplica. Cero errores en los 109 tiros etiquetados, y los dos grupos quedan perfectamente separados.'
          : 'The discriminant function decides which equation fires. Zero errors on all 109 labelled blasts, and the two groups are perfectly separated.'
      }
    >
      <Box x={10} y={54} w={190} h={76} title={es ? 'Siete razones' : 'Seven ratios'} lines={['S/B H/B B/D T/B', 'Pf XB E']} />
      <Arrow from={[204, 92]} to={[250, 92]} />
      <Box x={254} y={54} w={210} h={76} title="L" lines={['4.467 S/B - 0.551 H/B', '- 0.123 B/D + ... + 3.577']} accent={ACCENT} />
      <Arrow from={[468, 78]} to={[520, 50]} label="L > 11.821" />
      <Arrow from={[468, 106]} to={[520, 134]} label="L <= 11.821" />
      <Box x={524} y={16} w={200} h={68} title={es ? 'Grupo 1, módulo alto' : 'Group 1, high modulus'} lines={['35 blasts, mean 51.1 GPa', 'min L = 13.067']} accent={OK} />
      <Box x={524} y={104} w={200} h={68} title={es ? 'Grupo 2, módulo bajo' : 'Group 2, low modulus'} lines={['62 blasts, mean 17.2 GPa', 'max L = 10.318']} accent={OK} />
      <Arrow from={[728, 50]} to={[770, 78]} />
      <Arrow from={[728, 138]} to={[770, 110]} />
      <Box x={774} y={62} w={116} h={64} title={es ? 'Su ecuación' : 'Its equation'} lines={['208 x ...', '0.60 x ...']} />
      <text x={254} y={172} fill={MUTED} fontSize={10}>
        {es
          ? 'Es una compuerta real, no una consulta de etiqueta: enruta diseños que el corpus nunca vio.'
          : 'A real gate rather than a label lookup: it routes designs the corpus has never seen.'}
      </text>
    </Figure>
  );
}

export function LearnedFlowDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 220"
      label={es ? 'El nivel aprendido y sus carriles' : 'The learned tier and its lanes'}
      caption={
        es
          ? 'Los modelos aprendidos se entrenan sin conexión y predicen en el navegador. Cada caso real excluye su propia campaña del entrenamiento, y el sitio excluido viaja en el artefacto.'
          : 'The learned models train offline and predict in the browser. Every real case withholds its own campaign from training, and the withheld site travels on the artifact.'
      }
    >
      <Box x={10} y={20} w={190} h={80} title={es ? 'Corpus menos el sitio' : 'Corpus minus the site'} lines={['e.g. 90 of 97 rows', 'asserted at bake time']} accent={OK} />
      <Arrow from={[204, 60]} to={[248, 60]} />
      <Box x={252} y={14} w={186} h={56} title={es ? 'Red 7-N-1' : '7-N-1 network'} lines={['Levenberg-Marquardt', '8 simulations']} />
      <Box x={252} y={80} w={186} h={56} title={es ? 'Árboles y vectores' : 'Trees and vectors'} lines={['forest, boosting,', 'support vectors']} />
      <Box x={252} y={146} w={186} h={56} title={es ? 'Ensamble apilado' : 'Stacking ensemble'} lines={['linear meta-learner', 'no cross-validation']} />
      <Arrow from={[442, 42]} to={[492, 90]} />
      <Arrow from={[442, 108]} to={[492, 104]} />
      <Arrow from={[442, 174]} to={[492, 118]} />
      <Box x={496} y={72} w={180} h={64} title={es ? 'Artefacto horneado' : 'Baked artifact'} lines={['prediction + reason', 'cv on every cell']} accent={ACCENT} />
      <Arrow from={[680, 104]} to={[724, 104]} />
      <Box x={728} y={40} w={162} h={60} title={es ? 'Navegador' : 'Browser'} lines={['replays the artifact']} />
      <Box x={728} y={112} w={162} h={60} title={es ? 'Carril vivo' : 'Live lane'} lines={['closed forms in TS', 'parity is a gate']} accent={WARN} />
      <text x={10} y={210} fill={DANGER} fontSize={10}>
        {es
          ? 'Un modelo entrenado sobre una campaña y luego mostrado prediciéndola muestra una memoria, no una predicción.'
          : 'A model trained on a campaign and then shown predicting it is displaying a memory, not a prediction.'}
      </text>
    </Figure>
  );
}

export function ProtocolDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 230"
      label={es ? 'Los tres protocolos' : 'The three protocols'}
      caption={
        es
          ? 'La misma tabla, tres formas de partirla. Solo la tercera responde la pregunta de si un modelo llega a una mina que no ha visto.'
          : 'One table, three ways to split it. Only the third answers whether a model reaches a mine it has not seen.'
      }
    >
      <Box x={10} y={92} w={160} h={70} title={es ? '97 filas' : '97 rows'} lines={['10 sites', '17 duplicated vectors', 'one site has 22']} />
      <Arrow from={[174, 110]} to={[218, 44]} />
      <Arrow from={[174, 127]} to={[218, 118]} />
      <Arrow from={[174, 144]} to={[218, 192]} />

      <Box x={222} y={14} w={240} h={60} title={es ? 'Aleatorio 80/20' : 'Random 80/20'} lines={['duplicates land on both sides']} accent={DANGER} />
      <Box x={222} y={88} w={240} h={60} title={es ? 'Deduplicado' : 'Deduplicated'} lines={['collapse, then split randomly']} accent={WARN} />
      <Box x={222} y={162} w={240} h={60} title={es ? 'Dejar un sitio fuera' : 'Leave one site out'} lines={['10 folds, a whole campaign each']} accent={OK} />

      <Arrow from={[466, 44]} to={[512, 44]} />
      <Arrow from={[466, 118]} to={[512, 118]} />
      <Arrow from={[466, 192]} to={[512, 192]} />

      <Box x={516} y={14} w={190} h={60} title="0.667" lines={['stacking ensemble']} />
      <Box x={516} y={88} w={190} h={60} title="0.885" lines={['stacking ensemble']} />
      <Box x={516} y={162} w={190} h={60} title="-0.951" lines={['stacking ensemble']} accent={DANGER} />

      <Arrow from={[710, 118]} to={[752, 118]} />
      <Box x={756} y={78} w={134} h={80} title={es ? 'La brecha' : 'The gap'} lines={['median 0.88', 'across every', 'learned model']} accent={DANGER} />
      <text x={10} y={216} fill={MUTED} fontSize={10}>
        {es ? 'Deduplicar SUBE los puntajes. El sitio compartido es lo que los sostenía.' : 'Deduplicating RAISES the scores. The shared site is what was holding them up.'}
      </text>
    </Figure>
  );
}

export function PipelineDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 260"
      label={es ? 'La tubería sin conexión' : 'The offline pipeline'}
      caption={
        es
          ? 'Nueve etapas, ninguna vacía. El horneado es una operación de versión deliberada; el despliegue copia artefactos ya auditados y nunca entrena.'
          : 'Nine stages, none of them empty. The bake is a deliberate versioned operation; the deploy copies already-audited artifacts and never trains.'
      }
    >
      {[
        ['ingest', 'contract 1', 'integrity gate'],
        ['preprocess', 'geometry', 'rock factor'],
        ['split', '3 protocols', 'leakage guards'],
        ['features', '7 ratios', '+ absolutes'],
        ['train', 'site withheld', 'per case'],
      ].map((box, i) => (
        <Box key={box[0]} x={10 + i * 178} y={20} w={166} h={70} title={box[0]} lines={[box[1], box[2]]} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Arrow key={i} from={[180 + i * 178, 55]} to={[184 + i * 178, 55]} />
      ))}
      <Arrow from={[880, 94]} to={[880, 118]} />
      {[
        ['infer', 'every arm', 'abstain + reason'],
        ['evaluate', 'both statistics', 'null beside it'],
        ['export', 'content-addressed', 'hash per case'],
        ['validate', 're-read, re-hash', 'fail on a hole'],
      ].map((box, i) => (
        <Box key={box[0]} x={188 + i * 178 - 178} y={128} w={166} h={70} title={box[0]} lines={[box[1], box[2]]} accent={i === 3 ? OK : undefined} />
      ))}
      {[0, 1, 2].map((i) => (
        <Arrow key={i} from={[180 + i * 178, 163]} to={[184 + i * 178, 163]} />
      ))}
      <text x={10} y={232} fill={MUTED} fontSize={10}>
        {es
          ? 'Las pruebas escriben en un directorio temporal. Un test que puede sobrescribir los artefactos canónicos puede hacerse pasar en silencio.'
          : 'Tests write to a sandbox. A test that can overwrite the canonical artifacts can silently make itself pass.'}
      </text>
      <text x={10} y={250} fill={MUTED} fontSize={10}>
        {es
          ? '1824 celdas de predicción, 282 de ellas negativas, cada negativa con su razón.'
          : '1824 prediction cells, 282 of them refusals, every refusal with a reason.'}
      </text>
    </Figure>
  );
}

export function ContractsDiagram() {
  const es = useShellLang() === 'es';
  return (
    <Figure
      viewBox="0 0 900 220"
      label={es ? 'Los dos contratos de datos' : 'The two data contracts'}
      caption={
        es
          ? 'Uno decide qué entra; el otro decide qué sale y cómo el navegador puede confiar en ello.'
          : 'One decides what gets in; the other decides what goes out and how the browser can trust it.'
      }
    >
      <Box x={10} y={20} w={230} h={92} title={es ? 'Contrato 1, ingreso' : 'Contract 1, ingest'} lines={['reject: out of contract', 'flag: out of envelope', 'never clip']} accent={WARN} />
      <Arrow from={[244, 66]} to={[290, 66]} />
      <Box x={294} y={20} w={230} h={92} title={es ? 'Compuerta de integridad' : 'Integrity gate'} lines={['reproduce the paper’s', 'own summary table', '+ a pinned digest']} accent={OK} />
      <Arrow from={[528, 66]} to={[574, 66]} />
      <Box x={578} y={20} w={230} h={92} title={es ? 'Contrato 2, artefacto' : 'Contract 2, artifact'} lines={['content-addressed', 'TS mirror fails the build', 'on any drift']} accent={ACCENT} />
      <text x={10} y={144} fill={MUTED} fontSize={11} fontWeight={600}>
        {es ? 'Por que existe la compuerta de integridad' : 'Why the integrity gate exists'}
      </text>
      <text x={10} y={164} fill={MUTED} fontSize={10}>
        {es
          ? 'El corpus llegó con cinco errores de transcripción contra las tablas publicadas, dos sobre la variable que se predice.'
          : 'The corpus arrived with five transcription errors against the published tables, two of them on the variable being predicted.'}
      </text>
      <text x={10} y={182} fill={MUTED} fontSize={10}>
        {es
          ? 'La señal fue que el propio artículo imprime sus estadísticas descriptivas y nadie las estaba leyendo.'
          : 'The tell was that the paper prints its own descriptive statistics and nothing was reading them.'}
      </text>
      <text x={10} y={200} fill={MUTED} fontSize={10}>
        {es
          ? 'Una media sobre 97 filas es un detector débil para un cambio de una celda, así que también hay un resumen criptográfico fijado.'
          : 'A mean over 97 rows is a weak detector for a single-cell change, so there is a pinned digest as well.'}
      </text>
    </Figure>
  );
}
