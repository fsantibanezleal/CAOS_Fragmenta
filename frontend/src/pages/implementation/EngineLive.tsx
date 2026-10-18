/**
 * Engine, the live closed forms: the equations rewritten in TypeScript, the parity test that holds them to the baked
 * numbers, and the trap that test is aimed at (area `engine`).
 */

import { Callout, Cite, DocSection, Equation, InlineMath } from '@fasl-work/caos-app-shell';

import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { tr, type TopicProps } from './shared';

export function EngineLive({ es }: TopicProps) {
  const t = tr(es);
  return (
    <DocSection
      title={{ en: 'The live lane: the closed forms and their parity', es: 'El carril vivo: las formas cerradas y su paridad' }}
      area="engine"
      refs={IMPLEMENTATION_REFS['i-live']}
    >
      <p>
        {t(
          'The closed forms were rewritten in TypeScript so that changing a design moves the curve without waiting on a server: the classical mean-size equation, the uniformity index, the two- and three-parameter curves, the two-branch composition, the discriminant function, the two published power laws and the guard that refuses a design whose stemming swallows the bench.',
          'Las formas cerradas se reescribieron en TypeScript para que cambiar un diseño mueva la curva sin esperar a un servidor: la ecuación clásica de tamaño medio, el índice de uniformidad, las curvas de dos y tres parámetros, la composición de dos ramas, la función discriminante, las dos leyes de potencia publicadas y la guarda que rechaza un diseño cuyo taco se come el banco.',
        )}{' '}
        <Cite id="amoako2022" />{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <p>
        {t(
          'Two implementations of one equation drift as soon as nobody compares them, and the symptom is a chart that is subtly wrong and entirely plausible. The parity test compares every function against the numbers the Python engine baked, on every blast of every case: the mean size, the regression, the router, both curves across the size grid, the reconstruction and the refusals. It fails the build on a divergence larger than the artifacts’ rounding.',
          'Dos implementaciones de una ecuación se separan en cuanto nadie las compara, y el síntoma es un gráfico sutilmente equivocado y plausible. La prueba de paridad compara cada función contra los números que horneó el motor de Python, en cada tiro de cada caso: el tamaño medio, la regresión, el enrutador, ambas curvas a lo largo de la malla de tamaños, la reconstrucción y las negativas. Falla la compilación ante una divergencia mayor que el redondeo de los artefactos.',
        )}
      </p>
      <Equation
        tex={String.raw`\left|\,x_{50}^{\mathrm{TS}} - x_{50}^{\mathrm{py}}\right| < 5\times 10^{-4}\ \mathrm{m}`}
        caption={t(
          'The parity criterion for the closed forms: x50 the mean fragment size, TS the browser engine and py the baked Python value; the artifact rounds the prediction to six decimals and the pattern to four.',
          'El criterio de paridad de las formas cerradas: x50 el tamaño medio de fragmento, TS el motor del navegador y py el valor horneado en Python; el artefacto redondea la predicción a seis decimales y la malla a cuatro.',
        )}
      />
      <p>
        {t(
          'The two-parameter curve, for example, is written in the browser exactly as in the engine: ',
          'La curva de dos parámetros, por ejemplo, se escribe en el navegador exactamente como en el motor: ',
        )}
        <InlineMath tex={String.raw`P(x) = 1 - e^{-\ln 2\,(x/x_{50})^n}`} />
        {t(
          ', on the same logarithmic size grid, so curves overlay without resampling. A design built with the controls of the App has no baked number to compare with; what holds its result is that the same functions passed parity on every baked blast.',
          ', con el mismo enrejado logarítmico de tamaños, para que las curvas se superpongan sin remuestrear. Un diseño construido con los controles de la App no tiene un número horneado con el cual comparar; lo que respalda su resultado es que las mismas funciones pasaron la paridad en todos los tiros horneados.',
        )}
      </p>
      <p>
        {t(
          'One trap is aimed at on purpose. The uniformity index’s leading term takes the burden in metres and the diameter in millimetres. Read as the tabulated burden-to-diameter ratio, which is a thousand times larger, the term becomes about -380 and the index leaves any physical band. The test asserts that the index lands in a physical band on every real blast, and that the degenerate control, which has no charge column, returns exactly zero.',
          'Una trampa se persigue a propósito. El primer término del índice de uniformidad toma el bordo en metros y el diámetro en milímetros. Leído como la razón tabulada bordo-diámetro, que es mil veces mayor, el término vale cerca de -380 y el índice sale de cualquier banda física. La prueba exige que el índice caiga en una banda física en cada tiro real, y que el control degenerado, que no tiene columna de carga, devuelva exactamente cero.',
        )}
      </p>
      <Equation
        tex={String.raw`2.2 - 14\,\frac{B}{d}`}
        caption={t(
          'The leading term of the uniformity index: B the burden in metres and d the hole diameter in millimetres; with the tabulated ratio B/D in place of B/d it would be about -380.',
          'El primer término del índice de uniformidad: B el bordo en metros y d el diámetro de perforación en milímetros; con la razón tabulada B/D en lugar de B/d valdría cerca de -380.',
        )}
      />
      <Callout variant="note" title={t('Where it works and where it fails', 'Dónde funciona y dónde falla')}>
        {t(
          'Parity holds on the baked designs, to the artifacts’ rounding. A design you build in the App with the controls has no baked number to compare against: what guarantees its result is the engine’s is that the same functions passed parity on every baked blast, not a check on that design. Parity also says nothing about the equations being right for your rock; it says the two implementations agree, and what the benchmark measures about the equation applies to your design too.',
          'La paridad vale en los diseños horneados, al redondeo de los artefactos. Un diseño que usted construye en la App con los controles no tiene número horneado contra el cual comparar: lo que garantiza que su resultado es el del motor es que las mismas funciones pasaron la paridad en todos los tiros horneados, no una comprobación sobre ese diseño. La paridad tampoco dice que las ecuaciones sean correctas para su roca; dice que las dos implementaciones coinciden, y lo que el benchmark mide de la ecuación también vale para su diseño.',
        )}
      </Callout>
    </DocSection>
  );
}
