/**
 * Data contract: what a row must be to get in, what happens to a row outside the data, and the integrity gate that reads
 * the corpus against its source (area `contract`). The corpus and the hold-outs themselves are described under
 * Experiments, datasets; they appear here only as far as the contract explains them.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { notAvailable, num } from '../../lib/format';
import { ContractsDiagram } from '../../viz/Diagrams';
import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { count, tr, type TopicProps } from './shared';

/** The five cells the integrity gate found wrong in the corpus as first assembled (the engine's corpus page, section 5). */
const DEFECTS: [string, 'pf' | 'x50', number, number][] = [
  ['Db5', 'pf', 0.39, 0.33],
  ['Sm4', 'x50', 0.22, 0.24],
  ['Ad15', 'x50', 0.15, 0.22],
  ['Ad17', 'pf', 1.24, 1.07],
  ['Ad19', 'pf', 1.26, 1.47],
];

export function DataContract({ es, b }: TopicProps) {
  const t = tr(es);
  const corpus = b?.corpus_rows?.length;
  const holdout = b?.holdout_rows?.filter((r) => r.set.startsWith('published')).length;
  const field = b?.holdout_rows?.filter((r) => r.set.startsWith('field')).length;
  return (
    <DocSection
      title={{ en: 'The data contract and the integrity gate', es: 'El contrato de datos y la compuerta de integridad' }}
      area="contract"
      refs={IMPLEMENTATION_REFS['i-data-contract']}
    >
      <p>
        {t(
          `Three real sets load through one contract: the ${count(corpus)} corpus blasts, the ${count(holdout)} published hold-out blasts and the ${count(field)} field blasts. A blast is seven inputs, optionally the measured size, and its identity. The contract rejects what cannot be a blast (a powder factor outside 0.05 to 3 kg/m³, for example: a Young modulus of 60000 is MPa entered as GPa, not an unusual rock) and flags, without clipping, what lies outside the training envelope; every prediction on a flagged row carries the extrapolation stamp. The bounds live in the engine, next to the models, so a model and its admissible inputs are versioned together.`,
          `Tres conjuntos reales se cargan por el mismo contrato: los ${count(corpus)} tiros del corpus, los ${count(holdout)} de validación publicados y los ${count(field)} de campo. Un tiro son siete entradas, opcionalmente el tamaño medido, y su identidad. El contrato rechaza lo que no puede ser una voladura (un factor de carga fuera de 0,05 a 3 kg/m³, por ejemplo: un módulo de Young de 60000 es MPa escritos como GPa, no una roca inusual) y marca, sin recortar, lo que queda fuera de la envolvente de entrenamiento; toda predicción sobre una fila marcada lleva el sello de extrapolación. Los límites viven en el motor, junto a los modelos, de modo que un modelo y sus entradas admisibles se versionan juntos.`,
        )}{' '}
        <Cite id="hudaverdi2010" />{' '}
        <Cite id="sui2025" />
      </p>
      <p>
        {t(
          'Nothing is clipped and nothing is imputed. A clipped input produces a confident prediction for a design nobody entered, and it looks the same as a prediction for one that was. A missing input is rejected, because imputing it from the corpus would make a prediction look evidenced when part of it was guessed. A missing measurement is allowed: a row with no measured size is a design, every arm predicts it and nothing scores it. A missing pattern makes the classical arms abstain with the reason, while the arms that use only the ratios still answer, which is the situation of the Miami campaign.',
          'Nada se recorta y nada se imputa. Una entrada recortada produce una predicción confiada para un diseño que nadie ingresó, y se ve igual que la de uno que sí se ingresó. Una entrada faltante se rechaza, porque imputarla desde el corpus haría que una predicción pareciera respaldada cuando parte de ella fue adivinada. Una medición faltante se admite: una fila sin tamaño medido es un diseño, todo brazo la predice y nada la puntúa. Una malla faltante hace que los brazos clásicos se abstengan con la razón, mientras los brazos que usan solo las razones siguen respondiendo, que es la situación de la campaña de Miami.',
        )}
      </p>
      <p>
        {t(
          'Loading the corpus runs a two-part gate. The first recomputes, from the rows, the descriptive-statistics table the paper itself prints (minimum, maximum, mean and deviation of all seven variables) and compares it at the precision it was printed to. The second compares a cryptographic digest of the content with a pinned value, because a mean over 97 rows detects a one-cell change poorly: correcting one powder factor by 0.06 moves the mean by 0.0006, inside any rounding step.',
          'Cargar el corpus corre una compuerta de dos partes. La primera recalcula, desde las filas, la tabla de estadísticas descriptivas que el propio artículo imprime (mínimo, máximo, media y desviación de las siete variables) y la compara a la precisión con que se imprimió. La segunda compara un resumen criptográfico del contenido con un valor fijado, porque una media sobre 97 filas detecta mal el cambio de una celda: corregir un factor de carga en 0,06 mueve la media en 0,0006, dentro de cualquier paso de redondeo.',
        )}
      </p>
      <Equation
        tex={String.raw`\left|\,\hat\theta - \theta^{\mathrm{pub}}\right| \le u_k,\qquad \theta \in \{\min, \max, \bar x, s\},\quad u_k = 10^{-k}\ \text{for the mean and the deviation}`}
        caption={t(
          'The check at printed precision: the hat marks the statistic recomputed from the shipped rows, pub the one the source prints, and k the decimals the source prints it to; minima and maxima are gated exactly.',
          'La comprobación a la precisión impresa: el sombrero marca el estadístico recalculado de las filas publicadas, pub el que imprime la fuente y k los decimales con que lo imprime; los mínimos y máximos se comprueban exactamente.',
        )}
      />
      <p>
        {t(
          'The gate found five transcription errors in the corpus as first assembled, two of them on the measured size. The tell was the powder-factor maximum, 1.47 against the 1.26 the paper prints; row Ad19 had its own block size copied into the neighbouring column. Two independent copies of the paper, read separately, agree with each other and disagree with the file in exactly these five cells. The engine tests the gate itself, including a test that reintroduces the original defect and requires the gate to fail.',
          'La compuerta encontró cinco errores de transcripción en el corpus tal como se ensambló al principio, dos sobre el tamaño medido. La señal fue el máximo del factor de carga, 1,47 frente al 1,26 que imprime el artículo; la fila Ad19 tenía su propio tamaño de bloque copiado en la columna vecina. Dos copias independientes del artículo, leídas por separado, coinciden entre sí y discrepan del archivo exactamente en estas cinco celdas. El motor prueba la compuerta misma, incluida una prueba que reintroduce el defecto original y exige que la compuerta falle.',
        )}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('blast', 'tiro')}</th>
              <th>{t('column', 'columna')}</th>
              <th>{t('published', 'publicado')}</th>
              <th>{t('as found', 'como se encontró')}</th>
            </tr>
          </thead>
          <tbody>
            {DEFECTS.map(([id, column, published, found]) => (
              <tr key={id}>
                <td><code>{id}</code></td>
                <td>{column === 'pf' ? t('powder factor', 'factor de carga') : 'x50'}</td>
                <td>{num(published, 2)}</td>
                <td className="fr-bad">{num(found, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ContractsDiagram />
      <Callout variant="note" title={t('Where it holds and where it does not', 'Dónde vale y dónde no')}>
        {t(
          'The gate catches any difference between the file and the published table. It cannot catch an error already in the paper, because it compares against it, and the statistics of a column do not detect two errors that cancel, which is what the pinned digest is for. The contract checks that each value could be a blast; it cannot tell a wrong digit from a right one, and the integrity gate sits behind it for that reason. The corpus digest recorded in the benchmark is ' + (b?.corpus_digest ? b.corpus_digest.slice(0, 12) : notAvailable()) + ', the first twelve characters of the value the release gate checks against the installed engine.',
          'La compuerta atrapa cualquier diferencia entre el archivo y la tabla publicada. No puede atrapar un error que ya esté en el artículo, porque compara contra él, y las estadísticas de una columna no detectan dos errores que se compensen, que es para lo que está el resumen fijado. El contrato comprueba que cada valor podría ser un tiro; no distingue un dígito errado de uno correcto, y por eso detrás de él está la compuerta de integridad. El resumen del corpus registrado en el benchmark es ' + (b?.corpus_digest ? b.corpus_digest.slice(0, 12) : notAvailable()) + ', los primeros doce caracteres del valor que la compuerta de publicación contrasta con el motor instalado.',
        )}
      </Callout>
    </DocSection>
  );
}
