/**
 * Topic 6, provenance: where every row of the benchmark comes from (area `provenance`: the dataset, what makes it difficult,
 * how it may be redistributed) and what every arm was fitted on and declares (area `provenance`). Campaign facts are read
 * from the committed benchmark's `site_meta` and `holdout_rows`; the bake stamp from its header.
 */

import { Cite, DocSection, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { IN_SAMPLE_ARMS } from '../../lib/artifacts';
import { notAvailable, num, value } from '../../lib/format';
import { BarsFigure } from '../../viz/figures/benchmark';
import { label, ORDER, tr, type TopicData } from './shared';

/** The source of each arm of the benchmark, in the reader's language (the artifact's own wording is English). */
const SOURCE: Record<string, { en: string; es: string }> = {
  kuznetsov: { en: 'Kuznetsov 1973 with Cunningham’s correction, as printed by Hudaverdi et al. 2010, Eq. 1', es: 'Kuznetsov 1973 con la corrección de Cunningham, como la imprimen Hudaverdi et al. 2010, Ec. 1' },
  'kuznetsov-transfer': { en: 'the same equation; the rock factor is predicted from the Young modulus by a log-linear fit over the training campaigns', es: 'la misma ecuación; el factor de roca se predice desde el módulo de Young con un ajuste log-lineal sobre las campañas de entrenamiento' },
  'kuznetsov-capped': { en: 'the same equation capped at the in-situ block size, a declared choice of the engine and not a published relation', es: 'la misma ecuación limitada al tamaño de bloque in situ, una elección declarada del motor y no una relación publicada' },
  'published-regression': { en: 'Hudaverdi et al. 2010, Eqs. 9 and 10', es: 'Hudaverdi et al. 2010, Ecs. 9 y 10' },
  'refitted-regression': { en: 'the published functional form with the coefficients refitted on the training rows', es: 'la forma funcional publicada con los coeficientes reajustados sobre las filas de entrenamiento' },
  'published-neural-net': { en: 'Kulatilake et al. 2012, section 5', es: 'Kulatilake et al. 2012, sección 5' },
  'svr-rbf': { en: 'Amoako et al. 2022, section 4.2.1; Sui et al. 2025, section 4', es: 'Amoako et al. 2022, sección 4.2.1; Sui et al. 2025, sección 4' },
  'svr-poly': { en: 'Amoako et al. 2022, section 4.2.1; Sui et al. 2025, section 4', es: 'Amoako et al. 2022, sección 4.2.1; Sui et al. 2025, sección 4' },
  'random-forest': { en: 'Sui et al. 2025, final parameters', es: 'Sui et al. 2025, parámetros finales' },
  xgboost: { en: 'Sui et al. 2025, final parameters', es: 'Sui et al. 2025, parámetros finales' },
  stacking: { en: 'Sui et al. 2025, sections 3 and 4', es: 'Sui et al. 2025, secciones 3 y 4' },
  null: { en: 'the mean measured size of the training rows', es: 'el tamaño medio medido de las filas de entrenamiento' },
};

export default function Provenance({ b }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const sites = b.sites.filter((s) => b.site_meta[s]);
  const maxBlasts = Math.max(...sites.map((s) => b.site_meta[s].n_blasts));
  const top = sites.reduce((a, s) => (b.site_meta[s].n_blasts > b.site_meta[a].n_blasts ? s : a), sites[0]);
  const rowsInCorpus = sites.reduce((sum, s) => sum + b.site_meta[s].n_blasts, 0);
  const means = sites.map((s) => b.site_meta[s].mean_x50_m);
  const span = Math.max(...means) / Math.min(...means);
  const modulus = (site: string) => b.site_meta[site].E_GPa.map((e) => value(e)).join(', ');
  const allE = sites.flatMap((s) => b.site_meta[s].E_GPa);
  const holdout = b.holdout_rows ?? [];
  const n = (set: string) => holdout.filter((r) => r.set === set).length;
  const fieldE = [...new Set(holdout.filter((r) => r.set === 'field-2025').map((r) => r.features[6]))];
  const arms = ORDER.filter((arm) => b.provenance[arm]);
  const fittedOn = (arm: string) => {
    const p = b.provenance[arm];
    if (p.in_sample_corpus) return IN_SAMPLE_ARMS[arm]?.[lang] ?? t('in sample', 'dentro de la muestra');
    if (p.uses_site_constant) return t('the held-out site’s own rock factor, back-solved from the 2012 paper', 'el factor de roca del propio sitio retenido, despejado del artículo de 2012');
    if (arm === 'null') return t('the mean of the training rows', 'la media de las filas de entrenamiento');
    if (p.router_in_sample) return t('training rows; the router is in sample', 'filas de entrenamiento; el enrutador está en muestra');
    return t('training rows', 'filas de entrenamiento');
  };
  const declared = (arm: string) => {
    const p = b.provenance[arm];
    const flags: string[] = [];
    if (p.in_sample_corpus) flags.push(t('in sample', 'en muestra'));
    if (p.uses_site_constant) flags.push(t('site constant', 'constante del sitio'));
    if (p.router_in_sample) flags.push(t('router in sample', 'enrutador en muestra'));
    if (p.declared_not_published) flags.push(t('declared, not published', 'declarado, no publicado'));
    return flags.length ? flags.join('; ') : t('none', 'ninguna');
  };
  const freeUse = t('numeric facts reused with citation; the paper is not redistributed', 'hechos numéricos reutilizados con cita; el artículo no se redistribuye');
  return (
    <>
      <DocSection title={{ en: 'Where each row comes from', es: 'De dónde viene cada fila' }} area="provenance" refs={SECTION_REFS['b-sites']}>
        <p>
          {t('Benchmark baked with engine ', 'Benchmark horneado con el motor ')}
          <span data-version="">{b.engine_version}</span>
          {t(', application ', ', la aplicación ')}
          <span data-version="">{b.app_version}</span>
          {t(
            `, seed ${b.seed}, ${b.n_repeats} draws per random protocol and ${b.n_boot} site resamples per interval, on the corpus with digest ${b.corpus_digest.slice(0, 16)}. The numeric values of the three real sets are experimental facts reused with citation; the articles are not redistributed. The field set comes from an open-access paper under `,
            `, semilla ${b.seed}, ${b.n_repeats} sorteos por protocolo aleatorio y ${b.n_boot} remuestreos de sitios por intervalo, sobre el corpus con resumen ${b.corpus_digest.slice(0, 16)}. Los valores numéricos de los tres conjuntos reales son hechos experimentales reutilizados con cita; los artículos no se redistribuyen. El conjunto de campo viene de un artículo de acceso abierto bajo `,
          )}
          <span translate="no">CC BY 4.0</span>
          {t('. Each row of the table gives the dataset it belongs to, what makes it difficult and how it may be redistributed. ', '. Cada fila de la tabla da el conjunto de datos al que pertenece, lo que lo hace difícil y cómo puede redistribuirse. ')}
          <Cite id="hudaverdi2010" />
        </p>
        <BarsFigure
          rows={sites.map((s) => ({
            id: s,
            label: s,
            value: b.site_meta[s].n_blasts,
            text: t(`${b.site_meta[s].n_blasts} blasts, mean ${num(b.site_meta[s].mean_x50_m * 100, 1)} cm`, `${b.site_meta[s].n_blasts} tiros, media ${num(b.site_meta[s].mean_x50_m * 100, 1)} cm`),
          }))}
          domain={[0, Math.ceil(maxBlasts / 5) * 5]}
          ticks={Array.from({ length: Math.ceil(maxBlasts / 5) + 1 }, (_, i) => i * 5)}
          tickText={(v) => num(v, 0)}
          axisLabel={t('blasts in the corpus', 'tiros en el corpus')}
          ariaLabel={t('Blasts of each campaign and the mean measured size', 'Tiros de cada campaña y tamaño medio medido')}
          caption={t(
            `The ${sites.length} campaigns of the corpus: the bar is the number of blasts, the readout the mean measured size of the campaign. ${top} supplies ${num((b.site_meta[top].n_blasts / rowsInCorpus) * 100, 0)} percent of the rows, and the campaign means span a factor of ${num(span, 1)}, which is why the benchmark holds out whole campaigns.`,
            `Las ${sites.length} campañas del corpus: la barra es el número de tiros, la lectura el tamaño medio medido de la campaña. ${top} aporta el ${num((b.site_meta[top].n_blasts / rowsInCorpus) * 100, 0)} por ciento de las filas y las medias de las campañas abarcan un factor de ${num(span, 1)}, y por eso el benchmark retiene campañas completas.`,
          )}
        />
        <div className="fr-scroll-x">
          <table className="fr-table fr-table-wide">
            <thead>
              <tr>
                <th>{t('rows', 'filas')}</th>
                <th>{t('dataset', 'conjunto de datos')}</th>
                <th>{t('what makes it difficult', 'qué lo hace difícil')}</th>
                <th>{t('redistribution', 'redistribución')}</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => {
                const m = b.site_meta[s];
                return (
                  <tr key={s}>
                    <td>{s} ({m.n_blasts})</td>
                    <td className="fr-fine"><span lang="en" translate="no">{m.mine ?? notAvailable()}</span>; Hudaverdi et al. 2010</td>
                    <td className="fr-fine">
                      {`E ${modulus(s)} GPa`}
                      {m.hole_diameter_mm === null ? t('; hole diameter not published', '; diámetro de perforación no publicado') : t(`; hole ${value(m.hole_diameter_mm)} mm`, `; perforación de ${value(m.hole_diameter_mm)} mm`)}
                      {m.measurement ? t('; image analysis', '; análisis de imágenes') : t('; measurement method not stated', '; método de medición no declarado')}
                    </td>
                    <td className="fr-fine">{freeUse}</td>
                  </tr>
                );
              })}
              <tr>
                <td>{t('2012 hold-out', 'validación 2012')} ({n('published-2012')})</td>
                <td className="fr-fine">Kulatilake et al. 2012, {t('Tables 4 and 5', 'Tablas 4 y 5')}</td>
                <td className="fr-fine">{t('the same sites as the corpus; one row is also a training row', 'los mismos sitios que el corpus; una fila es también una fila de entrenamiento')}</td>
                <td className="fr-fine">{freeUse}</td>
              </tr>
              <tr>
                <td>{t('2010-only hold-out', 'validación solo de 2010')} ({n('published-2010-only')})</td>
                <td className="fr-fine">Hudaverdi et al. 2010, {t('Table VIII', 'Tabla VIII')}</td>
                <td className="fr-fine">{t('the same sites as the corpus', 'los mismos sitios que el corpus')}</td>
                <td className="fr-fine">{freeUse}</td>
              </tr>
              <tr>
                <td>{t('2025 field blasts', 'tiros de campo 2025')} ({n('field-2025')})</td>
                <td className="fr-fine">Sui et al. 2025, {t('a granite mine in north-east China', 'una mina de granito en el noreste de China')}</td>
                <td className="fr-fine">
                  {t(
                    `outside the training envelope: E ${fieldE.map((e) => value(e)).join(', ')} GPa against ${value(Math.min(...allE))} to ${value(Math.max(...allE))} GPa`,
                    `fuera de la envolvente de entrenamiento: E ${fieldE.map((e) => value(e)).join(', ')} GPa frente a ${value(Math.min(...allE))} a ${value(Math.max(...allE))} GPa`,
                  )}
                </td>
                <td className="fr-fine">{t('open access, ', 'acceso abierto, ')}<span translate="no">CC BY 4.0</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>
      <DocSection title={{ en: 'What each arm was fitted on', es: 'Con qué se ajustó cada brazo' }} area="provenance" refs={SECTION_REFS['b-arms-provenance']}>
        <p>
          {t(
            'Withholding rows is not enough for every arm, so each arm declares what it was fitted on. An arm whose coefficients its source fitted on these 97 blasts is in sample under every protocol; an arm that fits its own parameters per split but chooses the stiffness group with the published router has that router in sample; an arm that reads a constant derived from the held-out campaign itself says so. The verdict lists the in-sample and the site-constant arms by name and excludes the in-sample ones from the line on intervals above zero, so a source’s own fit is never read as transfer.',
            'Retener filas no basta para todos los brazos, así que cada brazo declara con qué se ajustó. Un brazo cuyos coeficientes su fuente ajustó sobre estos 97 tiros está dentro de la muestra bajo todo protocolo; un brazo que ajusta sus propios parámetros por partición pero elige el grupo de rigidez con el enrutador publicado tiene ese enrutador en muestra; un brazo que lee una constante derivada de la propia campaña retenida lo declara. El veredicto nombra los brazos dentro de la muestra y los de constante del sitio, y excluye a los primeros de la línea de intervalos sobre cero, de modo que el ajuste propio de una fuente nunca se lee como transferencia.',
          )}{' '}
          <Cite id="kuznetsov1973" />
        </p>
        <div className="fr-scroll-x">
          <table className="fr-table fr-table-wide">
            <thead>
              <tr>
                <th>{t('arm', 'brazo')}</th>
                <th>{t('source', 'fuente')}</th>
                <th>{t('fitted on', 'ajustado con')}</th>
                <th>{t('declared', 'declarado')}</th>
              </tr>
            </thead>
            <tbody>
              {arms.map((arm) => (
                <tr key={arm}>
                  <td>{label(arm, lang)}</td>
                  <td className="fr-fine">{SOURCE[arm]?.[lang] ?? notAvailable()}</td>
                  <td className="fr-fine">{fittedOn(arm)}</td>
                  <td className="fr-fine">{declared(arm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>
    </>
  );
}
