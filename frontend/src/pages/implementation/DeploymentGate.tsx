/**
 * Deployment, the gates: what the browser gate and the shell's measured gate check before a site is published, how they
 * are run, and why CI is cheaper than the deploy on purpose (area `deployment`).
 */

import { Callout, DocSection } from '@fasl-work/caos-app-shell';

import { tr, type TopicProps } from './shared';

export function DeploymentGate({ es }: TopicProps) {
  const t = tr(es);
  const commands = [
    `npm run build && npx vite preview --port 4173 --strictPort`,
    `npm run gate:browser -- --url http://localhost:4173   # ${t('the product gate, as the deploy runs it', 'la compuerta del producto, como la corre el despliegue')}`,
    `npm run gate -- --routes /implementation              # ${t('the shell gate, measured, on one route', 'la compuerta del shell, medida, sobre una ruta')}`,
    `GATE_FONTS=dejavu npm run gate:browser -- --url ...   # ${t('the runner’s fonts, on any machine', 'las tipografías del ejecutor, en cualquier máquina')}`,
  ].join('\n');
  return (
    <DocSection
      title={{ en: 'The gates before publishing', es: 'Las compuertas antes de publicar' }}
      area="deployment"
      noRefsReason={{ en: 'Describes this product’s own gates; it rests on no outside source.', es: 'Describe las compuertas propias de este producto; no se apoya en ninguna fuente externa.' }}
    >
      <p>
        {t(
          'The browser gate drives the built site in a real browser before it is allowed to become the site. It opens every route in both of its forms, every App tab, both themes and both languages at three viewport sizes, and fails on a console error or a failed request, on a document that scrolls sideways, on a panel that fell into its error boundary, and on a chart that does not declare what it drew. It declares the drawn content of every chart and does not sample pixels, because pixels cannot tell an empty canvas from one that never mounted.',
          'La compuerta de navegador maneja el sitio compilado en un navegador real antes de que pueda convertirse en el sitio. Abre cada ruta en sus dos formas, cada pestaña de la App, ambos temas y ambos idiomas en tres tamaños de ventana, y falla ante un error de consola o una petición fallida, un documento que se desplaza hacia el costado, un panel que cayó en su límite de error y un gráfico que no declara lo que dibujó. Declara el contenido dibujado de cada gráfico y no muestrea píxeles, porque los píxeles no distinguen un lienzo vacío de uno que nunca se montó.',
        )}
      </p>
      <p>
        {t(
          'On every documentation page it also walks the tabs, the groups of topics and their sub-tabs with a real pointer click, and measures what a reader would meet: no tab strip cut, no table wider than its container, no text cut by an ellipsis without its whole text as a title, no two citations run together, the footer on one row with every separator between two items, and, in every figure, no text on another text, no text leaving its box or the drawing and no drawn line crossing text. The shell’s own measured gate does the same at five sizes with its documentation floors, including the areas and the counts that this page is built to.',
          'En cada página de documentación además recorre las pestañas, los grupos de temas y sus subpestañas con un clic real del puntero, y mide lo que encontraría un lector: ninguna franja de pestañas cortada, ninguna tabla más ancha que su contenedor, ningún texto cortado por una elipsis sin su texto completo como título, ninguna cita pegada a otra, el pie de página en una fila con cada separador entre dos elementos, y, en cada figura, ningún texto sobre otro texto, ninguno que salga de su caja o del dibujo y ninguna línea dibujada que cruce un texto. La compuerta medida del propio shell hace lo mismo en cinco tamaños con sus pisos de documentación, incluidas las áreas y los conteos con que se construye esta página.',
        )}
      </p>
      <p>
        {t(
          'Continuous integration is cheaper than the deploy, on purpose. On a push it runs only cheap checks: the linter, the parity tests and the build, the guards of the shared base, the content standards, the Spanish accent guard and a budget guard that fails a workflow which installs the training stack, runs the pipeline or runs the Python test suite. The Python tests run on a developer machine before a push, against the committed artifacts. The expensive browser gate runs once, in the deploy, where its failure can stop a broken site from being published.',
          'La integración continua es más barata que el despliegue, a propósito. En un push corre solo comprobaciones baratas: el linter, las pruebas de paridad y la compilación, las guardas de la base compartida, los estándares de contenido, la guarda de tildes en español y una guarda de presupuesto que hace fallar un flujo que instale la pila de entrenamiento, corra el pipeline o corra la suite de pruebas de Python. Las pruebas de Python corren en una máquina de desarrollo antes de un push, contra los artefactos versionados. La costosa compuerta de navegador corre una vez, en el despliegue, donde su falla puede impedir que se publique un sitio roto.',
        )}
      </p>
      <pre className="fr-code">
        <code>{commands}</code>
      </pre>
      <Callout variant="honest" title={t('What the gates do not say', 'Lo que las compuertas no dicen')}>
        {t(
          'The runner is Linux, where the shell’s system font stack resolves to a wider font than on Windows or macOS. Release 0.05.000 passed every check on Windows and failed 36 in the deploy because the documentation footer wrapped and a table overflowed its column; a Linux visitor sees the same, so the gate runs with the runner’s fonts. The gates measure what a reader meets, not whether a paragraph is rigorous or an equation’s symbols are defined: a reviewer reads those against the rubric before a release is called ready.',
          'El ejecutor es Linux, donde la pila de tipografías del sistema del shell resuelve a una letra más ancha que en Windows o macOS. La versión 0.05.000 pasó todas las comprobaciones en Windows y falló 36 en el despliegue porque el pie de página de la documentación se partió y una tabla desbordó su columna; un visitante en Linux ve lo mismo, así que la compuerta corre con las tipografías del ejecutor. Las compuertas miden lo que encuentra un lector, no si un párrafo es riguroso ni si los símbolos de una ecuación están definidos: un revisor lee eso contra la rúbrica antes de dar una versión por lista.',
        )}
      </Callout>
    </DocSection>
  );
}
