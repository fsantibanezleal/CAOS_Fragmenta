/**
 * The in-app architecture modal.
 *
 * Five tabs, each pairing one hand-authored theme-aware SVG with a bilingual explanation. The SVGs
 * live under `public/svg/tech/` and are fetched and inlined by the shell, so their CSS-variable
 * colours repaint with the theme. One file carries both languages, tagged `l-en` and `l-es`.
 *
 * The depth here is the in-app proof that this is a real system rather than a demo, so every box
 * names a real file or a real quantity.
 */

import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  title_en: 'Architecture and how it works',
  title_es: 'Arquitectura y cómo funciona',
  tabs: [
    {
      id: 'what',
      en: 'What this is',
      es: 'Qué es esto',
      svg: 'svg/tech/01-the-app.svg',
      body_en: `Fragmenta predicts the mean fragment size of a muckpile from a bench-blast design, using twelve
competing models that span the 1973 classical equation to the 2025 stacking ensemble. Every model is
scored against the same 97 real measured blasts from ten campaigns on four continents.

The point is not the prediction. It is the comparison. Two different quantities are called R2 in this
literature and they differ by a factor of two and a half on the same twelve blasts, so every figure
here carries the name of what it is, and a model that predicts a constant runs beside every other arm.

What it is not: there is no mechanistic simulation, no non-ideal detonics, no flyrock, no ground
vibration and no downstream comminution model. Constants that no source prints are exposed as user
parameters rather than invented.`,
      body_es: `Fragmenta predice el tamano medio de fragmento de una pila tronada a partir del diseno de un banco,
usando doce modelos que van desde la ecuacion clasica de 1973 hasta el ensamble apilado de 2025. Cada
modelo se puntua contra los mismos 97 tiros reales medidos, de diez campanas en cuatro continentes.

El punto no es la prediccion sino la comparacion. En esta literatura se llama R2 a dos cantidades
distintas que difieren por un factor de dos y medio sobre los mismos doce tiros, asi que cada cifra
aqui lleva el nombre de lo que es, y un modelo que predice una constante corre junto a todos los demas.

Lo que no es: no hay simulacion mecanicista, ni detonica no ideal, ni proyeccion de rocas, ni
vibracion del terreno, ni modelo de conminucion aguas abajo. Las constantes que ninguna fuente publica
se exponen como parametros del usuario en vez de inventarse.`,
    },
    {
      id: 'lanes',
      en: 'The three lanes',
      es: 'Los tres carriles',
      svg: 'svg/tech/02-lanes.svg',
      body_en: `OFFLINE is canonical. Training, the hidden-width sweep, the seed sweep, the ten-fold
leave-one-site-out matrix and the whole benchmark run before release, in a pinned Python environment,
against a separately published engine package this product consumes.

REPLAY is the default evidence. The web reads committed, content-addressed artifacts: one JSON per
case plus one cross-case benchmark file, about 1.2 MB in total, each with a hash the release gate
re-checks.

LIVE is the workbench. The closed-form models are reimplemented in TypeScript so that changing a
burden moves the curve on screen. Their agreement with the offline engine is a parity gate that fails
the build on a divergence, because two implementations of one equation drift the moment nobody checks.

Deploy copies already-audited artifacts. It never trains, never retunes and never regenerates a
benchmark. A deployment is not an experiment.`,
      body_es: `SIN CONEXION es lo canonico. El entrenamiento, el barrido de ancho oculto, el barrido de semillas,
la matriz de diez pliegues dejando un sitio fuera y todo el benchmark corren antes de publicar, en un
entorno de Python fijado, contra un paquete motor publicado aparte que este producto consume.

REPRODUCCION es la evidencia por defecto. La web lee artefactos comprometidos y direccionados por
contenido: un JSON por caso mas un archivo de benchmark entre casos, cerca de 1.2 MB en total, cada uno
con un resumen criptografico que la compuerta de publicacion vuelve a verificar.

VIVO es el taller. Los modelos de forma cerrada se reimplementan en TypeScript para que cambiar un
bordo mueva la curva en pantalla. Que coincidan con el motor sin conexion es una compuerta de paridad
que hace fallar la compilacion ante una divergencia, porque dos implementaciones de una ecuacion se
separan en cuanto nadie las revisa.

El despliegue copia artefactos ya auditados. Nunca entrena, nunca reajusta y nunca regenera un
benchmark. Un despliegue no es un experimento.`,
    },
    {
      id: 'web',
      en: 'The web flow',
      es: 'El flujo web',
      svg: 'svg/tech/03-web-flow.svg',
      body_en: `The App route is a workbench for ONE selected case. Six tabs, grouped by the question a reader is
asking rather than by the model list, because thirteen models as thirteen tabs is a list rather than an
architecture. The models are reached from a select with option groups inside the tabs that need one.

Anything that summarises ACROSS cases lives on Experiments or Benchmark. A workbench that answers
"across all campaigns" has stopped being a workbench.

The focus route renders outside the shell, because the header and footer are exactly the chrome a
full-screen view exists to escape. It applies the theme itself, so a cold deep link into it does not
boot in the wrong palette.

Every chart reads out values at the cursor and reacts to the case selector. A chart that does not
change when a control changes is broken, and the way that stays invisible is nobody checking.`,
      body_es: `La ruta App es un taller para UN caso seleccionado. Seis pestanas, agrupadas por la pregunta que el
lector se hace y no por la lista de modelos, porque trece modelos como trece pestanas son una lista y
no una arquitectura. Los modelos se alcanzan desde un selector con grupos dentro de las pestanas que lo
necesitan.

Todo lo que resume ENTRE casos vive en Experimentos o Benchmark. Un taller que responde "en todas las
campanas" dejo de ser un taller.

La ruta de pantalla completa se dibuja fuera del armazon, porque el encabezado y el pie son justamente
el marco del que esa vista existe para escapar. Aplica el tema por si misma, de modo que un enlace
directo en frio no arranque con la paleta equivocada.

Cada grafico lee valores bajo el cursor y reacciona al selector de casos. Un grafico que no cambia
cuando cambia un control esta roto, y la forma en que eso permanece invisible es que nadie lo revise.`,
    },
    {
      id: 'science',
      en: 'The science flow',
      es: 'El flujo científico',
      svg: 'svg/tech/04-the-science.svg',
      body_en: `The corpus publishes seven dimensionless ratios and no dimensions, and the classical equation needs a
rock volume and a charge mass per hole. So on the published table alone it could not run at all, which
is plausibly why every recent study on this corpus is a black-box regressor.

The source's own prose gives a hole diameter for eight of its ten sites, and a diameter closes the
system. A ninth falls out by inverting its stated bench height and returns the same 91.2 mm on all six
of its rows. The tenth publishes nothing absolute, so its six blasts are not reconstructable and every
model that needs a volume abstains there with a reason.

What makes that a result rather than an assumption is that the same prose states independent
dimensional constraints. Fifteen of them, across nine sites, all fifteen asserted at bake time and all
fifteen satisfied. One paragraph states a bench height, a burden range and a spacing range, and one
arithmetic rule reproduces all three exactly.

Back-solving the rock factor then recovers a constant both papers say they estimated and neither
printed. It comes out near constant within each site, which validates the reconstruction in turn.`,
      body_es: `El corpus publica siete razones adimensionales y ninguna dimension, y la ecuacion clasica necesita
volumen de roca y masa de carga por barreno. Sobre la tabla publicada no podia correr en absoluto, y
esa es plausiblemente la razon de que todo estudio reciente sobre este corpus sea un regresor de caja
negra.

La prosa de la propia fuente da un diametro de perforacion en ocho de sus diez sitios, y un diametro
cierra el sistema. Un noveno sale invirtiendo su altura de banco declarada y devuelve los mismos
91.2 mm en sus seis filas. El decimo no publica nada absoluto, asi que sus seis tiros no son
reconstruibles y todo modelo que necesite un volumen se abstiene ahi con una razon.

Lo que lo vuelve un resultado y no un supuesto es que la misma prosa declara restricciones
dimensionales independientes. Quince, sobre nueve sitios, las quince comprobadas al hornear y las
quince satisfechas. Un parrafo declara altura de banco, rango de bordo y rango de espaciamiento, y una
sola regla aritmetica reproduce los tres exactamente.

Despejar el factor de roca recupera entonces una constante que ambos articulos dicen haber estimado y
ninguno imprimio. Sale casi constante dentro de cada sitio, lo que a su vez valida la reconstruccion.`,
    },
    {
      id: 'contracts',
      en: 'The two contracts',
      es: 'Los dos contratos',
      svg: 'svg/tech/05-data-contracts.svg',
      body_en: `CONTRACT 1, ingestion, is the bring-your-own-data gate. Two bands, and they are not the same band. A
value outside the contract range is a unit or entry error and is REJECTED. A value outside the fitted
envelope is an extrapolation: admitted only on an explicit opt-in, and every prediction made on it is
stamped. Nothing is ever clipped, because a clipped input produces a confident prediction for a design
nobody entered.

The integrity gate sits behind it and does two independent things. It reproduces the source paper's own
descriptive statistics from the shipped rows, at the precision each was printed to. And it compares a
content digest against a pinned value, because a mean over 97 rows is a weak detector for a single-cell
change. That gate found five transcription defects in the corpus as first assembled, two of them on the
variable being predicted.

CONTRACT 2, the artifact, is what the web reads. Every case file is content-addressed and its hash is
re-checked by the release gate. A TypeScript mirror of the schema fails the build on any drift, so a
field renamed on one side and not the other stops the build rather than rendering an empty chart that
looks exactly like a working one.

Every predicted cell carries a number or a reason. Never neither. The gate fails the bake on a single
unexplained abstention.`,
      body_es: `EL CONTRATO 1, de ingreso, es la compuerta para traer datos propios. Dos bandas, y no son la misma. Un
valor fuera del rango del contrato es un error de unidad o de captura y se RECHAZA. Un valor fuera de la
envolvente ajustada es una extrapolacion: se admite solo con un permiso explicito, y toda prediccion
hecha sobre el queda sellada. Nunca se recorta nada, porque una entrada recortada produce una
prediccion confiada para un diseno que nadie ingreso.

Detras esta la compuerta de integridad, que hace dos cosas independientes. Reproduce las estadisticas
descriptivas del propio articulo fuente a partir de las filas enviadas, con la precision con que cada
una se imprimio. Y compara un resumen criptografico del contenido con un valor fijado, porque una media
sobre 97 filas es un detector debil para el cambio de una sola celda. Esa compuerta encontro cinco
defectos de transcripcion en el corpus tal como se ensamblo primero, dos de ellos sobre la variable que
se predice.

EL CONTRATO 2, el del artefacto, es lo que la web lee. Cada archivo de caso esta direccionado por
contenido y su resumen se vuelve a verificar en la compuerta de publicacion. Un espejo del esquema en
TypeScript hace fallar la compilacion ante cualquier deriva, de modo que un campo renombrado en un lado
y no en el otro detiene la compilacion en vez de dibujar un grafico vacio identico a uno que funciona.

Cada celda predicha lleva un numero o una razon. Nunca ninguna de las dos. La compuerta hace fallar el
horneado ante una sola abstencion sin explicar.`,
    },
  ],
};
