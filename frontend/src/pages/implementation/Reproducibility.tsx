/**
 * Reproducibility: what a bake is a function of, what two bakes share in one environment and across two, why hashes are
 * not compared across machines, the one-thread pin and what a re-bake must leave unchanged (area `reproducibility`).
 * The measured differences are quoted from the bake's documentation and the recorded findings of the cross-environment
 * runs; the versions are read from the benchmark and the index.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { notAvailable } from '../../lib/format';
import { tr, type TopicProps } from './shared';

export function Reproducibility({ es, b, index }: TopicProps) {
  const t = tr(es);
  const engine = b?.engine_version ?? index?.engine_version ?? notAvailable();
  const app = b?.app_version ?? index?.app_version ?? notAvailable();
  const commands = [
    `python scripts/compare_bakes.py                           # ${t('every case against the committed artifacts', 'cada caso contra los artefactos versionados')}`,
    `python scripts/compare_bakes.py real-murgul --repeat 2    # ${t('byte identity within this environment', 'identidad byte a byte dentro de este entorno')}`,
  ].join('\n');
  return (
    <DocSection
      title={{ en: 'Reproducibility', es: 'Reproducibilidad' }}
      area="reproducibility"
      refs={IMPLEMENTATION_REFS['i-reproducibility']}
    >
      <p>
        {t(
          `A bake is a function of the case registry, the pinned environment (the engine at ${engine}, and numpy, scikit-learn and xgboost pinned exactly) and the seed. That supports two different claims, measured with two instruments. Within one environment the bake is byte-identical: two bakes on the same machine write the same bytes, and a test bakes one case twice into a sandbox and compares them. Four things could break this and each is handled: dictionary ordering, so keys are sorted; a wall clock in a manifest, so budgets and a verdict are recorded and not a measured runtime; a stopping rule that depends on CPU speed, so the learned arms stop on numerical criteria; and newline translation, so every file goes through one writer that fixes line feeds.`,
          `Un horneado es una función del registro de casos, del entorno fijado (el motor en ${engine}, y numpy, scikit-learn y xgboost fijados exactamente) y de la semilla. Eso respalda dos afirmaciones distintas, medidas con dos instrumentos. Dentro de un mismo entorno el horneado es idéntico byte a byte: dos horneados en la misma máquina escriben los mismos bytes, y una prueba hornea un caso dos veces en un directorio aislado y los compara. Cuatro cosas podrían romperlo y cada una está resuelta: el orden de los diccionarios, así que las claves se ordenan; un reloj en un manifiesto, así que se registran presupuestos y un veredicto y no un tiempo medido; una regla de parada que dependa de la velocidad de la CPU, así que los brazos aprendidos paran por criterios numéricos; y la traducción de saltos de línea, así que todo archivo pasa por un único escritor que fija los saltos de línea.`,
        )}{' '}
        <Cite id="peng2011" />
      </p>
      <p>
        {t(
          'Across environments the claim is weaker and it is measured differently. Two builds of the same pinned numpy can reduce a dot product in a different order, the last bits differ at about 1e-16, an iterative solver amplifies that, and no pin removes it. So the cross-environment check compares numbers, not hashes, with a relative tolerance of 1e-6. At version 0.04.000 all sixteen cases were baked on Windows and on Linux and the worst relative difference was 2.7e-08, on the underground Reocin case; the degenerate control, where every arm abstains, was byte-identical, which is the control on the explanation, because a case with no arithmetic does not drift.',
          'Entre entornos la afirmación es más débil y se mide de otra manera. Dos compilaciones del mismo numpy fijado pueden sumar un producto punto en otro orden, los últimos bits difieren en cerca de 1e-16, un solucionador iterativo lo amplifica y ningún fijado lo elimina. Por eso la comprobación entre entornos compara números, no resúmenes, con una tolerancia relativa de 1e-6. En la versión 0.04.000 se hornearon los dieciséis casos en Windows y en Linux y la peor diferencia relativa fue 2,7e-08, en el caso de Reocin subterránea; el control degenerado, donde todo brazo se abstiene, resultó idéntico byte a byte, que es el control de la explicación, porque un caso sin aritmética no se desvía.',
        )}{' '}
        <Cite id="goldberg1991" />
      </p>
      <Equation
        tex={String.raw`\frac{|a - b|}{\max(|a|, |b|)} \le 10^{-6}\quad \text{for every number in every artifact}`}
        caption={t(
          'The cross-environment comparison, number by number and not file by file: a and b are the same number written by the two environments.',
          'La comparación entre entornos, número a número y no archivo a archivo: a y b son el mismo número escrito por los dos entornos.',
        )}
      />
      <p>
        {t(
          'The comparison was measured again at 0.06.000, Windows 11 against Ubuntu 24.04 under WSL2, with the same pins: every case and its models file reproduces. The worst difference in a case is 2.7e-08 again; the models files, compared for the first time, differ in about 1400 to 1600 fields each, the worst at 7.0e-07 on a network weight of magnitude 2.8e-4 that moved by 2.0e-10, because a relative difference inflates near zero. That run also found that the comparison could not pass across environments at all since 0.05.000: each case carries the digest of its training scope’s models file, a hash that moves with the last bit of any number in it, and the tool compared it as a string. The tool now compares the numbers that digest covers, and only the corpus digest, a hash of the input, is compared exactly.',
          'La comparación se midió de nuevo en 0.06.000, Windows 11 contra la versión LTS de Ubuntu de abril de 2024 bajo WSL2, con los mismos fijados: cada caso y su archivo de modelos se reproducen. La peor diferencia en un caso es otra vez 2,7e-08; los archivos de modelos, comparados por primera vez, difieren en cerca de 1400 a 1600 campos cada uno, la peor en 7,0e-07 sobre un peso de red de magnitud 2,8e-4 que se movió 2,0e-10, porque una diferencia relativa se infla cerca de cero. Esa corrida también encontró que la comparación no podía pasar entre entornos desde 0.05.000: cada caso lleva el resumen del archivo de modelos de su alcance de entrenamiento, un hash que se mueve con el último bit de cualquier número que contiene, y la herramienta lo comparaba como texto. Ahora compara los números que ese resumen cubre, y solo el resumen del corpus, un hash de la entrada, se compara exactamente.',
        )}
      </p>
      <p>
        {t(
          `The bake pins the BLAS libraries to one thread before numpy loads. The network’s matrices are small, and a multi-threaded BLAS spun on them: one fit at width 15 took more than six minutes on a loaded workstation against about two seconds on one thread. A field-by-field diff against the unpinned bake found no score, prediction or interval that moved, and a test holds the pin. Re-baking is part of every release: each artifact records the application version that baked it (${app}) and the engine version (${engine}), a test re-bakes a case and requires the same numbers and the same versions, and so a new release re-bakes its artifacts even when only the site changed, and the numbers must come back unchanged, with zero changed numbers.`,
          `El horneado fija las bibliotecas BLAS a un solo hilo antes de que cargue numpy. Las matrices de la red son pequeñas, y un BLAS con varios hilos giraba sobre ellas: un ajuste con ancho 15 tomó más de seis minutos en una estación cargada contra unos dos segundos con un hilo. Una comparación campo por campo contra el horneado sin fijar no encontró ningún puntaje, predicción ni intervalo que se moviera, y una prueba sostiene el fijado. Volver a hornear es parte de cada versión: cada artefacto registra la versión de la aplicación que lo horneó (${app}) y la del motor (${engine}), una prueba vuelve a hornear un caso y exige los mismos números y las mismas versiones, así que cada versión nueva vuelve a hornear sus artefactos aunque solo cambie el sitio, y los números deben salir iguales, con cero números cambiados.`,
        )}
      </p>
      <pre className="fr-code">
        <code>{commands}</code>
      </pre>
      <Callout variant="honest" title={t('What is exact and what is not', 'Qué es exacto y qué no')}>
        {t(
          'Byte identity is claimed only within one environment, and it is checked on every test run. Across environments the claim is a relative tolerance of 1e-6, measured twice and met with the worst case at 7.0e-07 in a models file, which leaves little room: a near-zero weight is where a future run would reach the tolerance first. Both bake commands write into a sandbox, never the canonical tree, so a check cannot overwrite the artifacts it checks; they run on a developer machine before a release, not in continuous integration, which is why the cross-environment run went unrepeated between 0.04.000 and 0.06.000.',
          'La identidad byte a byte se afirma solo dentro de un entorno, y se comprueba en cada corrida de las pruebas. Entre entornos la afirmación es una tolerancia relativa de 1e-6, medida dos veces y cumplida con el peor caso en 7,0e-07 en un archivo de modelos, lo que deja poco margen: un peso cercano a cero es donde una corrida futura alcanzaría primero la tolerancia. Ambos comandos escriben en un directorio aislado, nunca en el árbol canónico, así que una comprobación no puede sobrescribir los artefactos que comprueba; corren en una máquina de desarrollo antes de una versión y no en la integración continua, y por eso la corrida entre entornos quedó sin repetirse entre 0.04.000 y 0.06.000.',
        )}
      </Callout>
    </DocSection>
  );
}
