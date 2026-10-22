/**
 * What every topic of the Benchmark page reads: the committed benchmark (the page shows its loading state until it has
 * arrived) and the corpus-scope models file, which may not have loaded yet (the live panel then says so, and its controls
 * stay). Also the arm order, the arm labels and the verdict text the topics share.
 */

import type { BenchmarkArtifact, Lang, ModelsFile } from '../../lib/contract.types';
import { ARM_BY_ID } from '../../lib/artifacts';
import { f } from '../../lib/facts';

export interface TopicData {
  b: BenchmarkArtifact;
  corpus: ModelsFile | null;
}

export const tr = (es: boolean) => (en: string, sp: string) => (es ? sp : en);

export const label = (arm: string, lang: Lang) => ARM_BY_ID.get(arm)?.label[lang] ?? arm;

/** The arms of the benchmark in the order every table of the page lists them. */
export const ORDER = [
  'kuznetsov',
  'kuznetsov-transfer',
  'kuznetsov-capped',
  'published-regression',
  'refitted-regression',
  'published-neural-net',
  'svr-rbf',
  'svr-poly',
  'random-forest',
  'xgboost',
  'stacking',
  'null',
];

/**
 * The verdict in the reader's language. The engine writes one canonical English sentence group into
 * the artifact; it is shown verbatim in English. The Spanish is composed from the same structured
 * fields, so the two languages derive from the numbers and cannot drift apart.
 */
export function verdictText(b: BenchmarkArtifact, lang: Lang): string {
  if (lang !== 'es') return b.verdict.outcome;
  const v = b.verdict;
  const all = v.supports.all;
  const geo = v.supports.geometry;
  const name = (arm: string) => label(arm, 'es');
  const parts: string[] = [];
  if (v.depends_on_support) {
    parts.push(
      `EL VEREDICTO DEPENDE DE QUÉ FILAS SE PUNTÚAN. Sobre los ${all.n_blasts} tiros, el mejor predictor aprendido con cada sitio excluido, ${name(all.best_learned_arm)}, explica ${f(all.best_learned_r2_identity)} y el nivel aprendido ${all.generalises_across_sites ? 'cumple' : 'no cumple'} el criterio. Sobre los ${geo.n_blasts} tiros con geometría resoluble, las filas donde también se puntúan los predictores clásicos, ${name(geo.best_learned_arm)} explica ${f(geo.best_learned_r2_identity)} (${f(geo.margin_over_null)} sobre el nulo) y el nivel ${geo.generalises_across_sites ? 'lo cumple' : 'no lo cumple'}. Los tiros que separan los dos conjuntos son de ${v.sites_outside_geometry_support.join(', ')}.`,
    );
  } else if (all.generalises_across_sites) {
    parts.push(`El nivel aprendido generaliza entre sitios: ${name(all.best_learned_arm)} explica ${f(all.best_learned_r2_identity)} de la varianza y supera a un predictor constante por ${f(all.margin_over_null)}.`);
  } else {
    parts.push(`EL NIVEL APRENDIDO NO GENERALIZA ENTRE SITIOS: el mejor predictor aprendido, ${name(all.best_learned_arm)}, explica ${f(all.best_learned_r2_identity)} con cada sitio excluido.`);
  }
  if (!v.arms_with_interval_above_zero.length) {
    parts.push('Fuera de los predictores que su fuente ajustó sobre este corpus, ningún predictor tiene un intervalo al 95 por ciento por remuestreo de sitios por encima de cero: con diez sitios, ninguno se distingue de predecir la media del corpus.');
  }
  if (all.null_pearson_r !== null && all.null_pearson_r < 0) {
    parts.push(`Las predicciones del nulo con el sitio excluido se correlacionan con las mediciones en ${f(all.null_pearson_r, 2)}: excluir un sitio grueso baja la media de entrenamiento, así que todo margen sobre el nulo en este protocolo es mayor que la destreza que mide.`);
  }
  return parts.join(' ');
}
