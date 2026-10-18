/** Architecture: two repositories, the direction of flow and what each lane is for (area `architecture`). */

import { Callout, DocSection } from '@fasl-work/caos-app-shell';

import { ArchitectureDiagram } from '../../viz/Diagrams';
import { notAvailable } from '../../lib/format';
import { count, kb, mb, tr, type TopicProps } from './shared';

export function Architecture({ es, b, index }: TopicProps) {
  const t = tr(es);
  const caseBytes = index?.cases.reduce((s, c) => s + c.bytes, 0);
  const modelBytes = index?.models?.reduce((s, m) => s + m.bytes, 0);
  const live = index?.cases.filter((c) => c.lane === 'live').length;
  return (
    <DocSection
      title={{ en: 'Where each thing runs', es: 'Dónde corre cada cosa' }}
      area="architecture"
      noRefsReason={{ en: 'Describes how this product is built; it rests on no outside source.', es: 'Describe cómo está construido este producto; no se apoya en ninguna fuente externa.' }}
    >
      <p>
        {t(
          `Two repositories. The engine, published as a package (version ${b?.engine_version ?? notAvailable()}), holds everything a third party would use to predict fragmentation without caring about this application: the models, the corpora with their integrity gate, the geometry reconstruction, the protocols, the metrics, the diagnostics and the portable export of fitted models. This repository holds the product: the case matrix, the staged bake, the two data contracts, the artifacts and the web application. The boundary test is simple: anything a third party could use without this product belongs to the engine.`,
          `Dos repositorios. El motor, publicado como paquete (versión ${b?.engine_version ?? notAvailable()}), contiene todo lo que un tercero usaría para predecir fragmentación sin que le importe esta aplicación: los modelos, los corpus con su compuerta de integridad, la reconstrucción de la geometría, los protocolos, las métricas, los diagnósticos y la exportación portátil de los modelos ajustados. Este repositorio contiene el producto: la matriz de casos, el horneado por etapas, los dos contratos de datos, los artefactos y la aplicación web. La prueba del límite es simple: lo que un tercero podría usar sin este producto pertenece al motor.`,
        )}
      </p>
      <ArchitectureDiagram />
      <p>
        {t(
          `The flow has one direction. An offline bake, run deliberately against pinned versions on a developer machine, writes ${count(index?.n_cases)} case artifacts (${kb(caseBytes)}), the benchmark (${kb(index?.benchmark?.bytes)}) and ${count(index?.models?.length)} models files (${mb(modelBytes)}), and the repository commits them. The build copies them into the site, and the browser fetches one case and one models file at a time. Nothing the reader sees is computed on a machine the reader does not hold, and the deploy never trains, never re-bakes and never recomputes a benchmark.`,
          `El flujo tiene un solo sentido. Un horneado sin conexión, corrido a propósito con versiones fijadas en una máquina de desarrollo, escribe ${count(index?.n_cases)} artefactos de caso (${kb(caseBytes)}), el benchmark (${kb(index?.benchmark?.bytes)}) y ${count(index?.models?.length)} archivos de modelos (${mb(modelBytes)}), y el repositorio los versiona. La compilación los copia al sitio y el navegador pide un caso y un archivo de modelos a la vez. Nada de lo que ve el lector se calcula en una máquina que el lector no tenga, y el despliegue nunca entrena, nunca vuelve a hornear y nunca recalcula un benchmark.`,
        )}
      </p>
      <p>
        {t(
          `Four lanes follow from that flow, each with the check that holds it to the bake: offline for everything that fits or measures, replay for the committed files, and two live lanes in the browser, one for the closed-form equations and one for the fitted models. The lane of a case is recorded in its manifest rather than chosen by hand, and ${count(live)} of the ${count(index?.n_cases)} cases come out live. The Lanes topic gives each lane, its check and what admits a feature to the live lane.`,
          `Cuatro carriles siguen de ese flujo, cada uno con la comprobación que lo ata a lo horneado: sin conexión, para todo lo que ajusta o mide; reproducción, para los archivos versionados; y dos carriles en vivo en el navegador, uno para las ecuaciones de forma cerrada y otro para los modelos ajustados. El carril de un caso queda registrado en su manifiesto en vez de elegirse a mano, y ${count(live)} de los ${count(index?.n_cases)} casos resultan en vivo. El tema Carriles da cada carril, su comprobación y qué admite una función en el carril en vivo.`,
        )}
      </p>
      <Callout variant="note" title={t('Where it holds and where it does not', 'Dónde vale y dónde no')}>
        {t(
          'The drawing says where each piece of code runs and what each lane reads. It does not say that a number is right: a number is right because of the tests against the source, the controls and the benchmark, and each of those has its own topic. It also describes the shipped site; a design the reader builds in the App is computed live, in the browser, with no baked number behind it.',
          'El dibujo dice dónde corre cada pieza de código y qué lee cada carril. No dice que un número sea correcto: un número es correcto por las pruebas contra la fuente, los controles y el benchmark, y cada uno tiene su propio tema. Además describe el sitio publicado; un diseño que el lector construye en la App se calcula en vivo, en el navegador, sin un número horneado detrás.',
        )}
      </Callout>
    </DocSection>
  );
}
