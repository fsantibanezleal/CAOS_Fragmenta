/**
 * Lanes: what runs offline, what is replayed and what runs live in the browser, the check that holds each lane to the
 * bake, and what admits a feature to a live lane (area `lanes`). The case counts are read from the index.
 */

import { DocSection } from '@fasl-work/caos-app-shell';

import { count, tr, type TopicProps } from './shared';

export function Lanes({ es, index }: TopicProps) {
  const t = tr(es);
  const live = index?.cases.filter((c) => c.lane === 'live').length;
  const lanes: [string, string, string][] = [
    [
      t('offline', 'sin conexión'),
      t('training, protocols, intervals, diagnostics, the seed sweep', 'entrenamiento, protocolos, intervalos, diagnósticos, el barrido de semillas'),
      t('pinned versions, a seed, the release gate', 'versiones fijadas, semilla, compuerta de publicación'),
    ],
    [t('replay', 'reproducción'), t('the case, benchmark and models files', 'los archivos de caso, benchmark y modelos'), t('a content digest per file', 'un resumen de contenido por archivo')],
    [
      t('live: equations', 'vivo: ecuaciones'),
      t('the classical equation, the curves, the router, the published regression', 'la ecuación clásica, las curvas, el enrutador, la regresión publicada'),
      t('a parity test against every baked blast', 'una prueba de paridad contra cada tiro horneado'),
    ],
    [
      t('live: fitted models', 'vivo: modelos ajustados'),
      t('network, kernels, trees, refit, transfer', 'red, núcleos, árboles, reajuste, transferencia'),
      t('fixtures from the original models', 'fijaciones de los modelos originales'),
    ],
  ];
  return (
    <DocSection
      title={{ en: 'The live and precompute boundary', es: 'El límite entre lo vivo y lo precalculado' }}
      area="lanes"
      noRefsReason={{ en: 'Describes this product’s own lanes; it rests on no outside source.', es: 'Describe los carriles propios de este producto; no se apoya en ninguna fuente externa.' }}
    >
      <p>
        {t(
          'Four lanes, each with the check that holds it to the bake. Offline is canonical: everything that fits or measures runs before a release, in the pinned Python environment, against the published engine, and nothing in this lane runs at deploy time or in a browser. Replay is the default evidence: the web reads the committed artifacts and computes nothing from raw data, and every number on the documentation pages is read from the benchmark or a case file through one module, never typed into the page.',
          'Cuatro carriles, cada uno con la comprobación que lo ata a lo horneado. Sin conexión es lo canónico: todo lo que ajusta o mide corre antes de una versión, en el entorno de Python fijado, contra el motor publicado, y nada de este carril corre al desplegar ni en un navegador. La reproducción es la evidencia por defecto: la web lee los artefactos versionados y no calcula nada desde datos crudos, y cada número de las páginas de documentación se lee del benchmark o de un archivo de caso mediante un solo módulo, nunca se escribe a mano en la página.',
        )}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('lane', 'carril')}</th>
              <th>{t('what runs', 'qué corre')}</th>
              <th>{t('what holds it to the bake', 'qué lo ata a lo horneado')}</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map(([lane, runs, holds]) => (
              <tr key={lane}>
                <td>{lane}</td>
                <td>{runs}</td>
                <td>{holds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {t(
          'What admits a feature to a live lane is a check, not a preference. A closed form goes live when it is rewritten in TypeScript and a parity test holds it to the number the Python engine baked on every blast of every case, so a change to either side that moves the result fails the build. A fitted model goes live when the engine can export it as plain JSON that a small walker evaluates, with fixtures of the original model’s predictions that the walker must reproduce. Anything that needs a training stack, a resampling loop or a search over hyperparameters stays offline, because a browser has neither the libraries nor the time.',
          'Lo que admite una función en un carril en vivo es una comprobación, no una preferencia. Una forma cerrada pasa a vivo cuando se reescribe en TypeScript y una prueba de paridad la sujeta al número que horneó el motor de Python en cada tiro de cada caso, de modo que un cambio en cualquiera de los dos lados que mueva el resultado hace fallar la compilación. Un modelo ajustado pasa a vivo cuando el motor puede exportarlo como JSON plano que un recorredor pequeño evalúa, con fijaciones de las predicciones del modelo original que el recorredor debe reproducir. Todo lo que necesita una pila de entrenamiento, un bucle de remuestreo o una búsqueda de hiperparámetros se queda sin conexión, porque un navegador no tiene ni las bibliotecas ni el tiempo.',
        )}
      </p>
      <p>
        {t(
          `Which lane a case runs in is recorded in its manifest with the numbers behind it, not chosen by hand: the size of the case’s trace against a budget of 256 KiB, whether what it runs is pure Python with numpy as its only wheel, a run-time budget of 1500 ms, the verdict and the reasons for it. The manifest records budgets rather than a measured runtime, because a wall-clock number would make two identical bakes differ. ${count(live)} of the ${count(index?.n_cases)} cases of this product come out live, and a case that failed any budget would be labelled precompute and only replayed.`,
          `En qué carril corre un caso queda registrado en su manifiesto con los números que lo respaldan, no se elige a mano: el tamaño de la traza del caso frente a un presupuesto de 256 KiB, si lo que corre es Python puro con numpy como única rueda, un presupuesto de tiempo de 1500 ms, el veredicto y sus razones. El manifiesto registra presupuestos y no un tiempo medido, porque un número de reloj haría que dos horneados idénticos difirieran. ${count(live)} de los ${count(index?.n_cases)} casos de este producto resultan en vivo, y un caso que fallara algún presupuesto se rotularía precálculo y solo se reproduciría.`,
        )}
      </p>
    </DocSection>
  );
}
