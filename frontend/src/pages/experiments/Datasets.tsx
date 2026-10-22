/**
 * The datasets and the cases (area `datasets`): every dataset the product holds, its source, its redistribution class and
 * whether it is live or on the roadmap; the campaigns of the corpus; the sixteen cases and why each is in the matrix; and
 * the controls. The counts are read from the committed benchmark and case index; the transcription defects are quoted from
 * the data documentation of the engine, which found them.
 */

import { Callout, Cite, DocSection } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { CATEGORY_LABEL } from '../../lib/artifacts';
import type { CaseIndex } from '../../lib/contract.types';
import { f } from '../../lib/facts';
import { notAvailable, num } from '../../lib/format';
import { tr, type Bi, type TopicProps } from './shared';

const PURPOSE: Record<string, Bi> = {
  'real-campaign': { en: 'a real campaign, its learned arms trained without it', es: 'una campaña real, con sus predictores aprendidos entrenados sin ella' },
  'extrapolation-control': { en: 'the only real set outside the training envelope', es: 'el único conjunto real fuera de la envolvente de entrenamiento' },
  'parameter-sweep': { en: 'one lever moved alone, which no real campaign shows', es: 'una palanca movida sola, que ninguna campaña real muestra' },
  'structural-control': { en: 'the coarse tail against the joint structure', es: 'la cola gruesa contra la estructura de juntas' },
  'negative-control': { en: 'the product must refuse rather than answer', es: 'el producto debe negarse en vez de responder' },
  'positive-control': { en: 'the harness itself, recovered at zero error', es: 'el andamiaje mismo, recuperado con error cero' },
};

/** The five cells of the corpus that disagreed with the published tables, as the engine's data documentation lists them. */
const DEFECTS: { blast: string; column: string; published: string; found: string; what: Bi }[] = [
  { blast: 'Db5', column: 'Pf_kg_m3', published: '0.39', found: '0.33', what: { en: 'wrong digit', es: 'dígito equivocado' } },
  { blast: 'Sm4', column: 'x50_m', published: '0.22', found: '0.24', what: { en: 'wrong digit, on the target', es: 'dígito equivocado, en el objetivo' } },
  { blast: 'Ad15', column: 'x50_m', published: '0.15', found: '0.22', what: { en: 'wrong digit, on the target', es: 'dígito equivocado, en el objetivo' } },
  { blast: 'Ad17', column: 'Pf_kg_m3', published: '1.24', found: '1.07', what: { en: 'wrong digit', es: 'dígito equivocado' } },
  { blast: 'Ad19', column: 'Pf_kg_m3', published: '1.26', found: '1.47', what: { en: 'the row’s own block size copied into the powder-factor column', es: 'el tamaño de bloque de la propia fila copiado en la columna del factor de carga' } },
];

const decimal = (value: string, es: boolean) => (es ? value.replace('.', ',') : value);

export function Datasets({ es, b, index }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const byCategory = new Map<string, CaseIndex['cases']>();
  for (const entry of index?.cases ?? []) byCategory.set(entry.category, [...(byCategory.get(entry.category) ?? []), entry]);
  const inCategory = (c: string) => byCategory.get(c)?.length ?? 0;
  const holdout = (set: string) => b?.holdout_rows?.filter((r) => r.set === set) ?? [];
  const field = holdout('field-2025');
  const nCorpus = b?.corpus_rows?.length;
  const minE = b?.corpus_rows?.length ? Math.min(...b.corpus_rows.map((r) => r.features[6])) : undefined;
  const fieldE = field.length ? field[0].features[6] : undefined;
  const synthetic = (index?.cases ?? []).filter((c) => c.real_or_synthetic === 'synthetic').length;
  const duplicated = b?.duplicate_groups.flat().length;
  const sites = b?.sites ?? [];
  return (
    <DocSection
      title={{ en: 'The datasets and the cases', es: 'Los conjuntos de datos y los casos' }}
      area="datasets"
      refs={EXPERIMENTS_REFS['e-datasets']}
    >
      <p>
        {t(
          `The table lists every dataset the product holds and says for each where it comes from, what of it is published here and whether it is live in the product or on the roadmap. The numeric values are experimental facts reused with citation; the papers themselves are not redistributed, and the one open-access source is used under its own licence. Its last line, a set with measured size distributions, is on the roadmap because no held dataset carries one: every curve shape the product draws is therefore a model output and not a validated one.`,
          `La tabla lista cada conjunto de datos que tiene el producto y dice de cada uno de dónde viene, qué de él se publica aquí y si está vivo en el producto o en la hoja de ruta. Los valores numéricos son hechos experimentales reutilizados con cita; los artículos mismos no se redistribuyen, y la única fuente de acceso abierto se usa bajo su propia licencia. Su última línea, un conjunto con distribuciones de tamaño medidas, está en la hoja de ruta porque ningún conjunto en poder del producto trae una: toda forma de curva que el producto dibuja es entonces una salida de modelo y no una validada.`,
        )}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('dataset', 'conjunto')}</th>
              <th>{t('rows', 'filas')}</th>
              <th>{t('source', 'fuente')}</th>
              <th>{t('redistribution class', 'clase de redistribución')}</th>
              <th>{t('status', 'estado')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('training corpus', 'corpus de entrenamiento')}</td>
              <td>{nCorpus ?? notAvailable()}</td>
              <td>Hudaverdi et al. 2010 <Cite id="hudaverdi2010" /></td>
              <td>{t('numeric values with citation; the article is not redistributed', 'valores numéricos con cita; el artículo no se redistribuye')}</td>
              <td>{t('live: training, the three protocols, the real cases', 'vivo: entrenamiento, los tres protocolos, los casos reales')}</td>
            </tr>
            <tr>
              <td>{t('published hold-out, 2012', 'validación publicada, 2012')}</td>
              <td>{b ? holdout('published-2012').length : notAvailable()}</td>
              <td>Kulatilake et al. 2012 <Cite id="kulatilake2012" /></td>
              <td>{t('values and published predictions, with citation', 'valores y predicciones publicadas, con cita')}</td>
              <td>{t('live: the published reproductions and the browser live check', 'vivo: las reproducciones publicadas y la comprobación en vivo del navegador')}</td>
            </tr>
            <tr>
              <td>{t('published hold-out, 2010 only', 'validación publicada, solo 2010')}</td>
              <td>{b ? holdout('published-2010-only').length : notAvailable()}</td>
              <td>Hudaverdi et al. 2010 <Cite id="hudaverdi2010" /></td>
              <td>{t('values and published predictions, with citation', 'valores y predicciones publicadas, con cita')}</td>
              <td>{t('live: the 2010 regression reproduction', 'vivo: la reproducción de la regresión de 2010')}</td>
            </tr>
            <tr>
              <td>{t('field blasts, 2025', 'tiros de campo, 2025')}</td>
              <td>{b ? field.length : notAvailable()}</td>
              <td>Sui et al. 2025, CC BY <Cite id="sui2025" /></td>
              <td>{t('open licence: values with citation and licence', 'licencia abierta: valores con cita y licencia')}</td>
              <td>{t('live: the extrapolation control', 'vivo: el control de extrapolación')}</td>
            </tr>
            <tr>
              <td>{t('synthetic designs', 'diseños sintéticos')}</td>
              <td>{index ? t(`${synthetic} cases, no measurement`, `${synthetic} casos, sin medición`) : notAvailable()}</td>
              <td>{t('generated here, labelled synthetic', 'generados aquí, rotulados como sintéticos')}</td>
              <td>{t('ours: everything is published', 'propios: se publica todo')}</td>
              <td>{t('live: sweeps and controls, never scored as real', 'vivo: barridos y controles, nunca puntuados como reales')}</td>
            </tr>
            <tr>
              <td>{t('measured size distributions', 'distribuciones de tamaño medidas')}</td>
              <td>0</td>
              <td>{t('none held', 'ninguno en poder del producto')}</td>
              <td>{t('not applicable until a set is obtained', 'no aplica hasta obtener un conjunto')}</td>
              <td>{t('roadmap: the full-distribution metric needs it', 'hoja de ruta: la métrica de distribución completa lo necesita')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {t(
          `The corpus is ${nCorpus ?? notAvailable()} bench blasts in ${sites.length || notAvailable()} campaigns across five countries, from the source’s Tables I and II, dimensionless by design so that blasts at very different scales sit in one table, and every blast used ANFO. Rows are not independent: ${duplicated ?? notAvailable()} rows duplicate another row’s input vector, and the rows of a campaign share a rock, a rig, an explosive supply and a measurement method. Image analysis carries its own scatter, which bounds how much variance any model can explain on this table, and the table of campaigns shows the scale of each.`,
          `El corpus son ${nCorpus ?? notAvailable()} tiros de banco en ${sites.length || notAvailable()} campañas de cinco países, tomados de las Tablas I y II de la fuente, sin dimensiones por diseño para que tiros de escalas muy distintas convivan en una tabla, y todos los tiros usaron ANFO. Las filas no son independientes: ${duplicated ?? notAvailable()} filas repiten el vector de entrada de otra, y las filas de una campaña comparten roca, equipo, suministro de explosivo y método de medición. El análisis de imágenes trae su propia dispersión, que acota cuánta varianza puede explicar cualquier modelo sobre esta tabla, y la tabla de campañas muestra la escala de cada una.`,
        )}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      {b ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('campaign', 'campaña')}</th>
                <th>{t('blasts', 'tiros')}</th>
                <th>{t('E, GPa', 'E, GPa')}</th>
                <th>{t('hole diameter, mm', 'diámetro, mm')}</th>
                <th>{t('mean measured x50, m', 'x50 medio medido, m')}</th>
                <th>{t('measurement method', 'método de medición')}</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const m = b.site_meta[site];
                return (
                  <tr key={site}>
                    <td>{site}</td>
                    <td>{b.site_counts[site]}</td>
                    <td>{m.E_GPa.map((e) => num(e, 2)).join(', ')}</td>
                    <td>{m.hole_diameter_mm === null ? t('not published', 'no publicado') : num(m.hole_diameter_mm, 1)}</td>
                    <td>{f(m.mean_x50_m)}</td>
                    <td className="fr-fine">{m.measurement ? t('stated by the source', 'declarado por la fuente') : t('not stated', 'no declarado')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p>
        {t(
          `Two published validation sets come from the same sites as the corpus, so a score on them measures how a model does on new blasts at known sites, a weaker question than a new mine. One of those blasts, Rc1, is also a training blast, with the same measured size of 0.46 m, and the 2012 paper states that another, En13, has the same seven inputs as the training blast En4; fixed hold-out numbers are not moved by this, but anything computed from a random split is. The five field blasts, from a granite mine in north-east China, have a Young modulus of ${f(fieldE, 1)} GPa against a corpus minimum of ${f(minE, 2)} GPa, so every prediction on them is an extrapolation and carries the stamp.`,
          `Dos conjuntos de validación publicados vienen de los mismos sitios que el corpus, así que un puntaje sobre ellos mide cómo le va a un modelo con tiros nuevos de sitios conocidos, una pregunta más débil que una mina nueva. Uno de esos tiros, Rc1, es también un tiro de entrenamiento, con el mismo tamaño medido de 0,46 m, y el artículo de 2012 afirma que otro, En13, tiene las mismas siete entradas que el tiro de entrenamiento En4; los números fijos de la validación no se mueven por esto, pero todo lo calculado desde una partición aleatoria sí. Los cinco tiros de campo, de una mina de granito del noreste de China, tienen un módulo de Young de ${f(fieldE, 1)} GPa frente a un mínimo del corpus de ${f(minE, 2)} GPa, así que toda predicción sobre ellos es una extrapolación y lleva el sello.`,
        )}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="sui2025" />
      </p>
      <p>
        {t(
          `${index?.n_cases ?? notAvailable()} cases in ${byCategory.size || notAvailable()} categories, each with a scientific reason to be in the matrix: ${inCategory('real-campaign')} real campaigns, one per site except Miami, which is a negative control because it publishes no absolute geometry; the 2025 field set; ${inCategory('parameter-sweep')} parameter sweeps and ${inCategory('structural-control')} structural case, all synthetic; and ${inCategory('negative-control')} negative controls and ${inCategory('positive-control')} positive control. A case with no measurement reports a response and never a score, and each case opens in the App from the table.`,
          `${index?.n_cases ?? notAvailable()} casos en ${byCategory.size || notAvailable()} categorías, cada uno con una razón científica para estar en la matriz: ${inCategory('real-campaign')} campañas reales, una por sitio salvo Miami, que es un control negativo porque no publica geometría absoluta; el conjunto de campo de 2025; ${inCategory('parameter-sweep')} barridos de parámetros y ${inCategory('structural-control')} caso estructural, todos sintéticos; y ${inCategory('negative-control')} controles negativos y ${inCategory('positive-control')} control positivo. Un caso sin medición informa una respuesta y nunca un puntaje, y cada caso se abre en la App desde la tabla.`,
        )}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('category', 'categoría')}</th>
              <th>{t('cases', 'casos')}</th>
              <th>{t('what it tests', 'qué prueba')}</th>
            </tr>
          </thead>
          <tbody>
            {[...byCategory.entries()].map(([category, entries]) => (
              <tr key={category}>
                <td>{CATEGORY_LABEL[category]?.[lang] ?? category}</td>
                <td>
                  {entries.map((entry) => (
                    <Link key={entry.case_id} className="fr-chip" to={`/app?case=${entry.case_id}`}>
                      {entry.title[lang]}
                    </Link>
                  ))}
                </td>
                <td className="fr-fine">{PURPOSE[category]?.[lang] ?? category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="fr-list">
        <li><b>{t('Geometry negative', 'Negativo de geometría')}</b>{t(': six blasts whose scale no source publishes; every arm that needs a volume abstains with the reason, and a test checks that none answered.', ': seis tiros cuya escala no publica ninguna fuente; todo predictor que necesita volumen se abstiene con la razón, y una prueba verifica que ninguno respondió.')}</li>
        <li><b>{t('Degenerate negative', 'Negativo degenerado')}</b>{t(': designs where the stemming exceeds the bench; every arm refuses, including the ratio-only ones, because the guard sits at the design level.', ': diseños donde el taco excede el banco; todo predictor se niega, incluidos los que solo ven razones, porque la guarda está a nivel del diseño.')}</li>
        <li><b>{t('Extrapolation', 'Extrapolación')}</b>{t(`: five field blasts at ${f(fieldE, 1)} GPa, below the corpus minimum; every prediction carries the stamp.`, `: cinco tiros de campo con módulo de ${f(fieldE, 1)} GPa, bajo el mínimo del corpus; cada predicción lleva el sello.`)}</li>
        <li><b>{t('Positive', 'Positivo')}</b>{t(': a truth generated by a known model, which that model recovers at zero error; it tests the harness, not the science.', ': una verdad generada por un modelo conocido, que ese modelo recupera con error cero; prueba el andamiaje, no la ciencia.')}</li>
      </ul>
      <p>
        {t(
          'The corpus as first assembled disagreed with the published tables in five cells, two of them on the target, and a gate found them: the corpus’s powder-factor maximum read 1.47 against the 1.26 the source prints in its own summary table, and nothing had been reading that checksum. Two independent copies of the paper, parsed separately, agree with each other and disagree with the file in exactly these places. The integrity gate now reproduces the source’s summary statistics and compares a content digest on every load of the corpus.',
          'El corpus tal como se armó primero discrepaba de las tablas publicadas en cinco celdas, dos de ellas en el objetivo, y una compuerta las encontró: el máximo del factor de carga del corpus decía 1,47 frente al 1,26 que la fuente imprime en su propia tabla resumen, y nada estaba leyendo ese control. Dos copias independientes del artículo, leídas por separado, coinciden entre sí y discrepan del archivo en exactamente estos lugares. La compuerta de integridad ahora reproduce los estadísticos resumen de la fuente y compara un resumen de contenido en cada carga del corpus.',
        )}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('blast', 'tiro')}</th>
              <th>{t('column', 'columna')}</th>
              <th>{t('published', 'publicado')}</th>
              <th>{t('as found', 'como se encontró')}</th>
              <th>{t('what happened', 'qué pasó')}</th>
            </tr>
          </thead>
          <tbody>
            {DEFECTS.map((d) => (
              <tr key={d.blast}>
                <td>{d.blast}</td>
                <td><code>{d.column}</code></td>
                <td>{decimal(d.published, es)}</td>
                <td>{decimal(d.found, es)}</td>
                <td className="fr-fine">{d.what[lang]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout variant="honest" title={t('What the gate cannot see', 'Lo que la compuerta no puede ver')}>
        {t(
          'The integrity gate compares the file with the paper, so it cannot catch an error that is already in the paper. Two such cases are known and carried with their published inputs: the two papers print different predictions for the same blasts on five regression rows and ten classical rows, and the sizes themselves come from image analysis whose scatter no gate can remove. The redistribution class is a statement about what this repository may publish, not a claim that the values are error free.',
          'La compuerta de integridad compara el archivo con el artículo, así que no puede detectar un error que ya está en el artículo. Se conocen dos casos así y se llevan con sus entradas publicadas: los dos artículos imprimen predicciones distintas para los mismos tiros en cinco filas de la regresión y diez filas del modelo clásico, y los tamaños mismos vienen de un análisis de imágenes cuya dispersión ninguna compuerta puede quitar. La clase de redistribución es una afirmación sobre lo que este repositorio puede publicar, no una afirmación de que los valores estén libres de error.',
        )}
      </Callout>
    </DocSection>
  );
}
