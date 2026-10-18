/**
 * Deployment: what is published, where and why there, what the deploy workflow does and the two settings a custom domain
 * needs (area `deployment`). The sizes and versions are read from the index and the benchmark; the host facts are those of
 * the product's deploy record, written without any local path.
 */

import { Callout, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { notAvailable } from '../../lib/format';
import { DeployGateFigure } from '../../viz/figures/implementation';
import { count, kb, mb, tr, type TopicProps } from './shared';

export function Deployment({ es, b, index }: TopicProps) {
  const t = tr(es);
  const caseBytes = index?.cases.reduce((s, c) => s + c.bytes, 0);
  const modelBytes = index?.models?.reduce((s, m) => s + m.bytes, 0);
  const payload = index ? (caseBytes ?? 0) + (modelBytes ?? 0) + (index.benchmark?.bytes ?? 0) : undefined;
  const commands = [
    `python data-pipeline/run.py            # ${t('bake the cases, the models and the benchmark', 'hornea los casos, los modelos y el benchmark')}`,
    `python data-pipeline/run.py --validate # ${t('re-check what is on disk', 'vuelve a comprobar lo que está en disco')}`,
    `pytest                                 # ${t('tests against the committed artifacts', 'pruebas contra los artefactos versionados')}`,
    `cd frontend && npm test                # ${t('parity of equations and models', 'paridad de ecuaciones y modelos')}`,
  ].join('\n');
  return (
    <DocSection
      title={{ en: 'Artifacts and deploy', es: 'Artefactos y despliegue' }}
      area="deployment"
      noRefsReason={{ en: 'Describes how this product is deployed; it rests on no outside source.', es: 'Describe cómo se despliega este producto; no se apoya en ninguna fuente externa.' }}
    >
      <p>
        {t(
          `What is published: ${count(index?.n_cases)} case artifacts (${kb(caseBytes)}), the benchmark (${kb(index?.benchmark?.bytes)}), ${count(index?.models?.length)} models files (${kb(modelBytes)}) and an index listing every file with its digest. Every artifact records the application version that baked it (${b?.app_version ?? notAvailable()}) and the engine version (${b?.engine_version ?? notAvailable()}). The payload is about ${mb(payload)} of JSON and a bundle, and the browser loads one case and one models file at a time, so no disk-heavy host is needed.`,
          `Lo que se publica: ${count(index?.n_cases)} artefactos de caso (${kb(caseBytes)}), el benchmark (${kb(index?.benchmark?.bytes)}), ${count(index?.models?.length)} archivos de modelos (${kb(modelBytes)}) y un índice que lista cada archivo con su resumen. Cada artefacto registra la versión de la aplicación que lo horneó (${b?.app_version ?? notAvailable()}) y la del motor (${b?.engine_version ?? notAvailable()}). La carga es de unos ${mb(payload)} de JSON y un paquete, y el navegador pide un caso y un archivo de modelos a la vez, así que no hace falta un servidor con mucho disco.`,
        )}
      </p>
      <p>
        {t(
          'The deploy is a static site on GitHub Pages with a custom domain, published from the main branch by one workflow. Pages fits the shape of the product: the repository is public, the closed forms and model walks run in the browser, everything else is precomputed, and there is no server state, no authentication and no request-time compute, so a backend would add cost and an abuse surface for nothing. A rollback is a revert on the main branch, which redeploys the previous artifact.',
          'El despliegue es un sitio estático en GitHub Pages con dominio propio, publicado desde la rama principal por un solo flujo. Pages calza con la forma del producto: el repositorio es público, las formas cerradas y los recorridos de modelos corren en el navegador, todo lo demás está precalculado, y no hay estado de servidor, ni autenticación, ni cómputo en el momento de la petición, así que un servidor agregaría costo y una superficie de abuso para nada. Una reversión es un revert en la rama principal, que vuelve a desplegar el artefacto anterior.',
        )}
      </p>
      <DeployGateFigure />
      <p>
        {t(
          'The workflow verifies, builds, measures and only then publishes. It re-reads the committed artifacts with the pipeline’s own release gate after installing only the pinned engine and numpy, which takes about a second. It runs the parity and model tests, the type check and the build, whose copy step fails if a declared case or models file did not ship. It runs the browser gate on a local preview of the build it is about to publish. It never trains, never re-bakes and never recomputes a benchmark; continuous integration does not install the training stack either.',
          'El flujo verifica, compila, mide y solo entonces publica. Relee los artefactos versionados con la propia compuerta de publicación del pipeline después de instalar solo el motor fijado y numpy, lo que toma cerca de un segundo. Corre las pruebas de paridad y de modelos, la comprobación de tipos y la compilación, cuyo paso de copia falla si un caso o un archivo de modelos declarado no se publicó. Corre la compuerta de navegador sobre una vista previa local de la compilación que va a publicar. Nunca entrena, nunca vuelve a hornear y nunca recalcula un benchmark; la integración continua tampoco instala la pila de entrenamiento.',
        )}
      </p>
      <pre className="fr-code">
        <code>{commands}</code>
      </pre>
      <Equation
        tex={String.raw`\text{publish} \iff \text{gate}(\text{artifacts}) \wedge \text{tests} \wedge \text{build} \wedge \text{browser gate}(\text{site})`}
        caption={t(
          'The deploy workflow’s condition for publishing: the artifact gate, the tests, the build and the browser gate on the built site must all pass, and any one failing stops the publish.',
          'La condición de publicación del flujo de despliegue: la compuerta de artefactos, las pruebas, la compilación y la compuerta de navegador sobre el sitio compilado deben pasar todas, y una sola que falle detiene la publicación.',
        )}
      />
      <p>
        {t(
          'The custom domain is two separate settings. A DNS record sends the subdomain to the Pages host, overriding the wildcard record that would otherwise send the name to another machine; and the custom domain is set on the Pages configuration itself, because on a workflow build a CNAME file in the public directory does not bind it. Doing only the first leaves the site unreachable, and the symptom looks like a DNS problem. A static host also answers 404 for an unknown path while a client-routed app still renders, so the build writes a real page at each route, including each focus route, read from the case index so the list cannot drift when a case is added.',
          'El dominio propio son dos ajustes separados. Un registro DNS envía el subdominio al servidor de Pages, anulando el registro comodín que de otro modo enviaría el nombre a otra máquina; y el dominio propio se fija en la configuración de Pages misma, porque en una compilación por flujo un archivo CNAME en el directorio público no lo asocia. Hacer solo lo primero deja el sitio inalcanzable, y el síntoma parece un problema de DNS. Un servidor estático además responde 404 para una ruta desconocida mientras una app con rutas del lado del cliente igual se dibuja, así que la compilación escribe una página real en cada ruta, incluida cada ruta de enfoque, leída del índice de casos para que la lista no se desvíe al agregar un caso.',
        )}
      </p>
      <Callout variant="note" title={t('Where it works and where it fails', 'Dónde funciona y dónde falla')}>
        {t(
          'A site that answers 200 on every route can be blank: this one was, from its first publish to its first patch release, with two copies of the routing library. That is why a deploy is verified by the browser gate on the site and not by a status code. The workflow cannot vouch for the science, only for what was committed: a wrong number that is committed and correctly hashed publishes.',
          'Un sitio que responde 200 en cada ruta puede estar en blanco: este lo estuvo desde su primera publicación hasta su primera versión de corrección, con dos copias de la biblioteca de rutas. Por eso la verificación de un despliegue es la compuerta de navegador sobre el sitio, y no un código de estado. El flujo no puede respaldar la ciencia, solo lo que se versionó: un número errado que está versionado y bien resumido se publica.',
        )}
      </Callout>
    </DocSection>
  );
}
