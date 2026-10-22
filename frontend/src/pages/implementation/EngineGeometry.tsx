/**
 * Engine, geometry: how the absolute pattern is recovered from the ratios the corpus prints, how the result is checked
 * and where it cannot be done (area `engine`). The per-site diameters in the table are read from the benchmark.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { f } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { ReconstructionDiagram } from '../../viz/Diagrams';
import { count, tr, type TopicProps } from './shared';

export function EngineGeometry({ es, b }: TopicProps) {
  const t = tr(es);
  const sites = b ? Object.entries(b.site_meta) : [];
  const resolved = sites.filter(([, m]) => m.hole_diameter_mm !== null).reduce((s, [, m]) => s + m.n_blasts, 0);
  const total = sites.reduce((s, [, m]) => s + m.n_blasts, 0);
  const miami = sites.find(([, m]) => m.hole_diameter_mm === null);
  return (
    <DocSection
      title={{ en: 'Recovering the pattern in metres', es: 'Recuperar la malla en metros' }}
      area="engine"
      refs={IMPLEMENTATION_REFS['i-geometry']}
    >
      <p>
        {t(
          `The corpus publishes ratios and no dimensions, and the classical equation needs rock volume and explosive mass per hole, so on ratios alone it could not run. The source prose gives a hole diameter in eight of its ten sites, and a diameter closes the system. The reconstruction resolves the geometry of ${count(sites.length ? resolved : undefined)} of the ${count(sites.length ? total : undefined)} blasts; the rest of this topic is how, and how that is checked.`,
          `El corpus publica razones y ninguna dimensión, y la ecuación clásica necesita volumen de roca y masa de explosivo por barreno, así que sobre razones no podía correr. La prosa de la fuente da un diámetro de perforación en ocho de los diez sitios, y un diámetro cierra el sistema. La reconstrucción resuelve la geometría de ${count(sites.length ? resolved : undefined)} de los ${count(sites.length ? total : undefined)} tiros; el resto de este tema es cómo, y cómo se comprueba.`,
        )}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`B = \tfrac{B}{D}\,D,\quad S = \tfrac{S}{B}\,B,\quad H = \tfrac{H}{B}\,B,\quad T = \tfrac{T}{B}\,B,\qquad V = B\,S\,H,\quad Q = P_f\,V`}
        caption={t(
          'The reconstruction: D the hole diameter in metres, B the burden, S the spacing, H the bench height and T the stemming; V the rock volume and Q the explosive mass per hole, with P_f the powder factor the corpus publishes.',
          'La reconstrucción: D el diámetro de perforación en metros, B el bordo, S el espaciamiento, H la altura de banco y T el taco; V el volumen de roca y Q la masa de explosivo por barreno, con P_f el factor de carga que publica el corpus.',
        )}
      />
      <p>
        {t(
          `A ninth site, Reocin underground, states no diameter but an 18 m bench height; inverting the chain returns the same diameter, 91.2 mm, on all six of its rows, a six-fold internal check rather than an assumption. The tenth, ${miami ? miami[0] : notAvailable()}, publishes nothing absolute: its ${count(miami?.[1].n_blasts)} blasts are not reconstructed, the engine raises rather than returning a pattern, and every arm that needs a volume abstains there with the reason.`,
          `Un noveno sitio, Reocin subterránea, no declara diámetro pero sí una altura de banco de 18 m; invertir la cadena da el mismo diámetro, 91,2 mm, en sus seis filas, una comprobación interna de seis veces y no un supuesto. El décimo, ${miami ? miami[0] : notAvailable()}, no publica nada absoluto: sus ${count(miami?.[1].n_blasts)} tiros no se reconstruyen, el motor lanza un error en vez de devolver una malla y todo predictor que necesita volumen se abstiene allí con la razón.`,
        )}
      </p>
      <Equation
        tex={String.raw`D = \frac{H}{(H/B)\,(B/D)}`}
        caption={t(
          'The diameter implied by a stated bench height: H the bench height in metres, and H/B and B/D the two tabulated ratios.',
          'El diámetro implícito en una altura de banco declarada: H la altura de banco en metros, y H/B y B/D las dos razones tabuladas.',
        )}
      />
      <p>
        {t(
          'The reconstruction is checked against fifteen constraints the same prose states, at nine sites, and all fifteen hold. At Murgul one paragraph states a bench height, a burden range and a spacing range, and the rule reproduces all three exactly; at Dongri-Buzurg all three land inside. Soma is the recorded exception: its prose states a 5 m burden and a 21 cm diameter, and its ratio cannot hold both; taking the diameter reproduces the stated spacing and bench height exactly, so two of three constraints select it and the conflict travels with the case.',
          'La reconstrucción se verifica contra quince restricciones que la misma prosa declara, en nueve sitios, y se cumplen las quince. En Murgul un párrafo declara altura de banco, rango de bordo y rango de espaciamiento, y la regla reproduce los tres exactamente; en Dongri-Buzurg los tres caen dentro. Soma es la excepción registrada: su prosa declara 5 m de bordo y 21 cm de diámetro, y su razón no admite ambos; tomar el diámetro reproduce exactamente el espaciamiento y la altura declarados, así que dos de tres restricciones lo eligen y el conflicto viaja con el caso.',
        )}
      </p>
      <Equation
        tex={String.raw`\frac{\delta(xy)}{xy} \approx \frac{\delta x}{x} + \frac{\delta y}{y},\qquad \delta x = 0.005`}
        caption={t(
          'The tolerance of a reconstructed dimension, derived and not chosen: x and y are two printed ratios, delta their rounding (half a unit of the second decimal) and the relative uncertainties of a product add.',
          'La tolerancia de una dimensión reconstruida, derivada y no elegida: x e y son dos razones impresas, delta su redondeo (media unidad del segundo decimal) y las incertidumbres relativas de un producto se suman.',
        )}
      />
      <p>
        {t(
          'The tolerance is not chosen: it is the two-decimal printing of the ratios, propagated through the multiplication, which is why a stated 6 m bench passes against a reconstructed 5.984 m and why a ten percent change in a diameter fails. Two further pieces of evidence do not depend on the prose. The field set publishes its absolute pattern beside its ratios, and the reconstruction agrees with it to the printed precision. And the rock factor recovered with this geometry barely varies within each site, which an error in the burden or the bench height would scatter.',
          'La tolerancia no se elige: es la impresión a dos decimales de las razones, propagada por la multiplicación, y por eso un banco declarado de 6 m pasa frente a 5,984 m reconstruidos y un cambio de diez por ciento en un diámetro falla. Dos evidencias más no dependen de la prosa. El conjunto de campo publica su malla absoluta junto a sus razones, y la reconstrucción coincide con ella a la precisión impresa. Y el factor de roca recuperado con esta geometría casi no varía dentro de cada sitio, cosa que un error en el bordo o en la altura de banco dispersaría.',
        )}{' '}
        <Cite id="sui2025" />
      </p>
      {sites.length ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('site', 'sitio')}</th>
                <th>{t('mine', 'mina')}</th>
                <th>D, mm</th>
                <th>{t('blasts', 'tiros')}</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(([site, meta]) => (
                <tr key={site}>
                  <td>{site}</td>
                  <td className="fr-fine">{meta.mine ?? '-'}</td>
                  <td>{meta.hole_diameter_mm === null ? t('not published', 'no publicado') : f(meta.hole_diameter_mm, 1)}</td>
                  <td>{meta.n_blasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <ReconstructionDiagram />
      <Callout variant="note" title={t('Where it holds and where it does not', 'Dónde vale y dónde no')}>
        {t(
          'It holds where the source states a diameter or a dimension to solve one from, and it is checked where the source also states ranges. It does not hold for Miami, and at Soma it depends on which figure in the prose is taken as correct. Independent evidence that the geometry is right is that the rock factor recovered with it barely varies within each site; it is evidence, not proof, because the constraints are the source’s own statements and a wrong statement in the paper would pass.',
          'Vale donde la fuente declara un diámetro o una dimensión de la que despejarlo, y se comprueba donde además declara rangos. No vale para Miami, y en Soma depende de qué dato de la prosa se toma como correcto. Una evidencia independiente de que la geometría es correcta es que el factor de roca recuperado con ella casi no varía dentro de cada sitio; es evidencia, no prueba, porque las restricciones son las propias declaraciones de la fuente y una declaración errónea del artículo pasaría.',
        )}
      </Callout>
    </DocSection>
  );
}
