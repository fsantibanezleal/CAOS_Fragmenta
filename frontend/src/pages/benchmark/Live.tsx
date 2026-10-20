/**
 * Topic 5, the live check: the models fitted on the 97 blasts, run in the browser on real blasts that are not in the corpus,
 * and scored on the spot (area `live`). The set and the arm are shell controls registered with the panel (`data-control`);
 * the table and the parity chart both read the chosen set, so each control moves what the reader sees. The controls stay
 * while the models load.
 */

import { Callout, ChipGroup, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';
import { useMemo, useState } from 'react';

import { SECTION_REFS } from '../../data/citations';
import { fittedArms, predictModel } from '../../engine/learned';
import { ARM_BY_ID, formatSize } from '../../lib/artifacts';
import { f, facts } from '../../lib/facts';
import { ParityPlot } from '../../viz/plots';
import { tr, type TopicData } from './shared';

const LIVE_ARMS = ['random-forest', 'xgboost', 'stacking', 'published-neural-net', 'svr-rbf', 'refitted-regression'];

type LiveSet = 'published-2012' | 'field-2025';

function score(pairs: [number, number][]) {
  const n = pairs.length;
  if (n < 2) return { r2: null as number | null, rmse: null as number | null, n };
  const mean = pairs.reduce((s, [m]) => s + m, 0) / n;
  const ssRes = pairs.reduce((s, [m, p]) => s + (m - p) ** 2, 0);
  const ssTot = pairs.reduce((s, [m]) => s + (m - mean) ** 2, 0);
  return { r2: 1 - ssRes / ssTot, rmse: Math.sqrt(ssRes / n), n };
}

export default function Live({ b, corpus }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const [arm, setArm] = useState('random-forest');
  const [set, setSet] = useState<LiveSet>('published-2012');
  const rows = useMemo(() => (b.holdout_rows ?? []).filter((r) => r.set === set), [b, set]);
  const live = useMemo(() => {
    if (!corpus) return null;
    const arms = fittedArms(corpus);
    const out: Record<string, { r2: number | null; rmse: number | null; n: number; predictions: Record<string, number | null>; parity: number }> = {};
    for (const name of LIVE_ARMS) {
      const model = arms[name];
      if (!model) continue;
      const predictions: Record<string, number | null> = {};
      const pairs: [number, number][] = [];
      let parity = 0;
      rows.forEach((row) => {
        const { value } = predictModel(model, row.features);
        predictions[row.blast_id] = value;
        if (value !== null) pairs.push([row.x50_m, value]);
        const i = corpus.fixtures.inputs.findIndex((input) => input.blast_id === row.blast_id);
        const expected = i >= 0 ? corpus.fixtures.expected[name]?.[i] : undefined;
        if (expected !== undefined && expected !== null && value !== null && Math.abs(expected - value) <= 1e-12 * Math.abs(expected)) parity += 1;
      });
      out[name] = { ...score(pairs), predictions, parity };
    }
    return out;
  }, [corpus, rows]);
  const points = live?.[arm]
    ? rows
        .filter((r) => live[arm].predictions[r.blast_id] !== null)
        .map((r) => ({ blastId: r.blast_id, site: r.site, measuredM: r.x50_m, predictedM: live[arm].predictions[r.blast_id] as number, extrapolated: set === 'field-2025' }))
    : [];
  const nCorpus = facts(b).nBlasts;
  const n2012 = (b.holdout_rows ?? []).filter((r) => r.set === 'published-2012').length;
  const n2025 = (b.holdout_rows ?? []).filter((r) => r.set === 'field-2025').length;
  return (
    <DocSection title={{ en: 'Live check on real held-out blasts', es: 'Comprobación en vivo sobre tiros reales retenidos' }} area="live" refs={SECTION_REFS['b-live']}>
      <p>
        {t(
          `This section reads no baked score: it loads the models fitted on the ${nCorpus} blasts, runs them in your browser on real blasts that are not in the corpus, and scores them on the spot. Two sets: the 2012 hold-out blasts (${n2012}), from the same sites as the training rows, and the 2025 field blasts (${n2025}), in a rock softer than any in the corpus.`,
          `Esta sección no lee un puntaje horneado: carga los modelos ajustados sobre los ${nCorpus} tiros, los corre en su navegador sobre tiros reales que no están en el corpus, y puntúa ahí mismo. Dos conjuntos: los tiros de validación de 2012 (${n2012}), de los mismos sitios que el entrenamiento, y los tiros de campo de 2025 (${n2025}), en una roca más blanda que cualquiera del corpus.`,
        )}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="sui2025" />
      </p>
      <ChipGroup
        id="bench-set"
        label={{ en: 'Set', es: 'Conjunto' }}
        value={set}
        onChange={(id) => setSet(id as LiveSet)}
        options={[
          { id: 'published-2012', label: { en: `published hold-out 2012 (${n2012})`, es: `validación publicada 2012 (${n2012})` } },
          { id: 'field-2025', label: { en: `field 2025 (${n2025}), extrapolation`, es: `campo 2025 (${n2025}), extrapolación` } },
        ]}
      />
      <ChipGroup
        id="bench-arm"
        label={{ en: 'Arm in the chart', es: 'Brazo en el gráfico' }}
        value={arm}
        onChange={setArm}
        options={LIVE_ARMS.map((a) => ({ id: a, label: ARM_BY_ID.get(a)?.label ?? { en: a, es: a } }))}
      />
      {live ? (
        <>
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t(`arm, fitted on the ${nCorpus}`, `brazo, ajustado sobre los ${nCorpus}`)}</th>
                <th>{t('variance explained, live', 'varianza explicada, en vivo')}</th>
                <th>RMSE</th>
                <th>{t('scored', 'puntuadas')}</th>
                <th>{t('equal to the original model', 'iguales al modelo original')}</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_ARMS.filter((a) => live[a]).map((a) => (
                <tr key={a} data-selected={a === arm ? 'true' : undefined}>
                  <td>{ARM_BY_ID.get(a)?.label[lang] ?? a}</td>
                  <td className={(live[a].r2 ?? -1) > 0 ? 'fr-ok' : 'fr-bad'}>{f(live[a].r2)}</td>
                  <td>{formatSize(live[a].rmse)}</td>
                  <td>{live[a].n} / {rows.length}</td>
                  <td>{live[a].parity} / {rows.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fr-parity-box">
            <ParityPlot points={points} height={380} />
          </div>
        </>
      ) : (
        <div className="fr-loading">{t('Loading the models', 'Cargando los modelos')}</div>
      )}
      <Equation
        tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum_{i\in H}(y_i - \hat y_i)^2}{\sum_{i\in H}(y_i - \bar y_H)^2}`}
        caption={t('Computed in the browser over the chosen held-out set H: y_i is the measured mean size of blast i, ŷ_i the live prediction, and ȳ_H the mean of the measurements in H.', 'Calculado en el navegador sobre el conjunto retenido H elegido: y_i es el tamaño medio medido del tiro i, ŷ_i la predicción en vivo y ȳ_H la media de las mediciones en H.')}
      />
      <Callout variant="note" title={t('How to read it', 'Cómo leerlo')}>
        {t(
          `The 2012 blasts (${n2012}) are from the same sites as the training rows, so a learned model should do well, and does: this is the protocol the literature reports. The 2025 blasts (${n2025}) lie outside the envelope on the modulus, the input that weighs most; with the blasts of one site, variance explained is unstable and is read together with the error.`,
          `Los tiros de 2012 (${n2012}) son de los mismos sitios que el entrenamiento, así que un modelo aprendido debería ir bien, y lo hace: es el protocolo que la literatura reporta. Los de 2025 (${n2025}) están fuera de la envolvente en el módulo, la entrada que más pesa; con los tiros de un solo sitio, la varianza explicada es inestable y se lee junto con el error.`,
        )}
      </Callout>
    </DocSection>
  );
}
