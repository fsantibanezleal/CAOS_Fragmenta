/**
 * The question of per-site behaviour (area `question`): each arm's error on each campaign it did not see, against the
 * null's on the same campaign, and the out-of-fold predictions of one arm against the measurements. Every value is read
 * from the committed benchmark.
 */

import { Callout, Cite, DocSection } from '@fasl-work/caos-app-shell';
import { useState } from 'react';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { ParityPlot } from '../../viz/plots';
import { RatioTable } from '../../viz/Evidence';
import { armLabel, Loading, tr, type TopicProps } from './shared';

const NOT_IN_SAMPLE = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'refitted-regression', 'published-neural-net', 'svr-rbf', 'svr-poly', 'random-forest', 'xgboost', 'stacking'];

export function PerSite({ es, b }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const [arm, setArm] = useState('xgboost');
  const F = b ? facts(b) : null;
  const sites = b?.sites ?? [];
  const arms = F ? ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'published-regression', 'refitted-regression', ...F.learned] : [];
  const rmse = (a: string, site: string) => F?.grouped(a)?.per_site[site]?.rmse_m ?? null;
  const rows = arms.map((a) => ({ id: a, label: armLabel(a, lang), values: sites.map((s) => rmse(a, s)) }));
  const nullRow = sites.map((s) => rmse('null', s));
  const predictions = F?.grouped(arm)?.predictions ?? {};
  const points = (b?.corpus_rows ?? [])
    .filter((row) => predictions[row.blast_id] !== null && predictions[row.blast_id] !== undefined)
    .map((row) => ({ blastId: row.blast_id, site: row.site, measuredM: row.x50_m, predictedM: predictions[row.blast_id] as number }));
  const ratio = (a: string, site: string) => {
    const e = rmse(a, site);
    const n = rmse('null', site);
    return e !== null && n ? e / n : null;
  };
  const smallest = (site: string) => {
    const values = NOT_IN_SAMPLE.map((a) => rmse(a, site)).filter((v): v is number => v !== null);
    return values.length ? Math.min(...values) : null;
  };
  const stated = sites.filter((s) => b?.site_meta[s]?.measurement).length;
  const meta = (site: string) => b?.site_meta[site];
  const counts = Object.values(b?.site_counts ?? {});
  const lo = counts.length ? Math.min(...counts) : notAvailable();
  const hi = counts.length ? Math.max(...counts) : notAvailable();
  return (
    <DocSection
      title={{ en: 'How does each predictor behave site by site?', es: '¿Cómo se comporta cada predictor sitio por sitio?' }}
      area="question"
      refs={EXPERIMENTS_REFS['e-sites']}
    >
      <p>
        {t(
          'The rows of a campaign are not independent samples: they share a rock mass, a rig, an explosive and, in this corpus, the measurement method of whoever studied it. That is why each campaign is held out whole, and why the error is also read campaign by campaign. Each cell is an arm’s root mean square error, in metres, on the campaign it did not see; the colour compares it with the null’s on that same campaign.',
          'Las filas de una campaña no son muestras independientes: comparten macizo, equipo, explosivo y, en este corpus, el método de medición de quien la estudió. Por eso cada campaña se retiene completa, y por eso el error se mira también campaña por campaña. Cada celda es el error cuadrático medio, en metros, de un predictor sobre la campaña que no vio; el color compara con el del nulo en esa misma campaña.',
        )}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      {F ? (
        <RatioTable
          title={t('Error per held-out site', 'Error por sitio retenido')}
          columns={sites}
          rows={rows}
          reference={nullRow}
        />
      ) : (
        <Loading es={es} />
      )}
      <p className="fr-fine">
        {t(
          'Green: at least 20 percent less error than the null; amber: less than the null; red: more. A dash is an abstention.',
          'Verde: al menos 20 por ciento menos error que el nulo; ámbar: menos que el nulo; rojo: más. Un guion es una abstención.',
        )}
      </p>
      <p>
        {t(
          `Two campaigns concentrate the learned arms’ drop. At Murgul the boosting model’s error is ${f(ratio('xgboost', 'Murgul'), 1)} times the null’s, and at Miami, the campaign with the finest fragments (mean ${f(meta('Miami')?.mean_x50_m, 3)} m), the forest errs by ${f(rmse('random-forest', 'Miami'), 3)} m and the boosting model by ${f(rmse('xgboost', 'Miami'), 3)} m. The two Reocin campaigns are the coarsest, with means of ${f(meta('Reocin')?.mean_x50_m, 3)} and ${f(meta('Reocin-UG')?.mean_x50_m, 3)} m, and no training site is as coarse: the smallest error among the arms that are not in sample is ${f(smallest('Reocin'), 3)} m at Reocin and ${f(smallest('Reocin-UG'), 3)} m at Reocin-UG. Below, the chosen arm’s out-of-fold predictions against the measurement; point at a blast to read its site.`,
          `Dos campañas concentran la caída de los aprendidos. En Murgul el error del modelo de potenciación es ${f(ratio('xgboost', 'Murgul'), 1)} veces el del nulo, y en Miami, la campaña de fragmentos más finos (media ${f(meta('Miami')?.mean_x50_m, 3)} m), el bosque se equivoca en ${f(rmse('random-forest', 'Miami'), 3)} m y el modelo de potenciación en ${f(rmse('xgboost', 'Miami'), 3)} m. Las dos campañas de Reocin son las más gruesas, con medias de ${f(meta('Reocin')?.mean_x50_m, 3)} y ${f(meta('Reocin-UG')?.mean_x50_m, 3)} m, y ningún sitio de entrenamiento es tan grueso: el menor error entre los predictores que no están dentro de la muestra es ${f(smallest('Reocin'), 3)} m en Reocin y ${f(smallest('Reocin-UG'), 3)} m en Reocin-UG. Abajo, las predicciones fuera de pliegue del predictor elegido contra lo medido; al apuntar a un tiro se lee su sitio.`,
        )}
      </p>
      <label className="fr-control fr-control-inline">
        {t('Arm', 'Predictor')}
        <select value={arm} onChange={(e) => setArm(e.target.value)}>
          {(arms.length ? arms : ['xgboost']).map((a) => (
            <option key={a} value={a}>{armLabel(a, lang)}</option>
          ))}
        </select>
      </label>
      {F ? (
        <div className="fr-parity-box">
          <ParityPlot points={points} height={420} />
        </div>
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          `Part of what differs between campaigns is not the rock. The source states its measurement method for ${stated} of the ${sites.length || notAvailable()} campaigns, image analysis in each case, and takes the sizes of the others from the original studies without restating how they were measured; image analysis carries its own scatter, which bounds how much variance any model can explain on this table. A per-site error is therefore the error of a prediction against one team’s measurement of one rock, and the null’s error on the same campaign is the yardstick that keeps the comparison honest.`,
          `Parte de lo que difiere entre campañas no es la roca. La fuente declara su método de medición en ${stated} de las ${sites.length || notAvailable()} campañas, análisis de imágenes en cada caso, y toma los tamaños de las otras de los estudios originales sin repetir cómo se midieron; el análisis de imágenes trae su propia dispersión, que acota cuánta varianza puede explicar cualquier modelo sobre esta tabla. Un error por sitio es entonces el error de una predicción contra la medición de un equipo sobre una roca, y el error del nulo en la misma campaña es la vara que mantiene honesta la comparación.`,
        )}{' '}
        <Cite id="field2007" />
      </p>
      <Callout variant="honest" title={t('A campaign is not a rock type', 'Una campaña no es un tipo de roca')}>
        {t(
          `Each campaign rests on ${lo} to ${hi} blasts and changes its rock, rig, explosive supply and measurement method all at once, so a difference between two campaigns cannot be assigned to one cause, and a per-site error on ${lo} blasts mostly measures how little that campaign varies. The table is exact about the errors it reports and silent about why they differ.`,
          `Cada campaña descansa en ${lo} a ${hi} tiros y cambia a la vez su roca, equipo, suministro de explosivo y método de medición, así que una diferencia entre dos campañas no puede asignarse a una sola causa, y un error por sitio sobre ${lo} tiros mide sobre todo cuán poco varía esa campaña. La tabla es exacta sobre los errores que informa y calla sobre por qué difieren.`,
        )}
      </Callout>
    </DocSection>
  );
}
