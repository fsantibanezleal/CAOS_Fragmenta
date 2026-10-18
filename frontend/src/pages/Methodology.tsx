/**
 * Methodology: every predictor, term by term, with its source, how this product applies it, and where it fails. Six
 * method topics, one `method` section each (ADR-0017 section 2.1), on the shell's DocPage and SubTabs; the topics live in
 * `methodology/`. The validation protocols and metrics are on Experiments.
 */

import { DocPage, InlineMath, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { useBenchmark, useModels } from '../lib/facts';
import { TOPICS } from './methodology/index';

export default function Methodology() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const corpus = useModels('corpus');

  const tabs: SubTabDef[] = TOPICS.map(({ id, label, Body }) => ({
    id,
    label: es ? label.es : label.en,
    content: <Body b={b} corpus={corpus} />,
  }));

  return (
    <DocPage
      title={{ en: 'Methodology', es: 'Metodología' }}
      lede={
        <>
          {es
            ? 'Diez predictores del tamaño medio en cuatro familias, cada uno transcrito de su fuente primaria con cada símbolo definido, junto con lo que este producto fija donde la fuente no dice nada, y dónde falla cada uno. Seis temas recorren las familias de métodos, y cómo se mide la varianza explicada '
            : 'Ten predictors of the mean size in four families, each transcribed from its primary source with every symbol defined, together with what this product sets where the source is silent, and where each one fails. Six topics walk the method families, and how variance explained '}
          <InlineMath tex="R^2_{\mathrm{id}}" />
          {es ? ' bajo tres protocolos, con intervalos por remuestreo de sitios, está en ' : ' is measured under three protocols, with site-resampled intervals, is on '}
          <Link to="/experiments">{es ? 'Experimentos' : 'Experiments'}</Link>.
        </>
      }
    >
      <SubTabs tabs={tabs} ariaLabel={es ? 'familias de métodos' : 'method families'} orientation="vertical" />
    </DocPage>
  );
}
