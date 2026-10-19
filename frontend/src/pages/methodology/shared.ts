/**
 * What every method topic of the Methodology page reads: the committed benchmark and the corpus-scope models file, either
 * of which may not have loaded yet (a topic then shows the shell's "not available", never an empty chart).
 */

import type { BenchmarkArtifact, ModelsFile, PortableModel } from '../../lib/contract.types';

export interface TopicData {
  b: BenchmarkArtifact | null;
  corpus: ModelsFile | null;
}

/** One exported arm of the corpus-scope models file, narrowed to its kind. */
export function exportedArm<K extends PortableModel['kind']>(
  corpus: ModelsFile | null,
  arm: string,
  kind: K,
): Extract<PortableModel, { kind: K }> | null {
  const model = corpus?.arms[arm];
  return model && model.kind === kind ? (model as Extract<PortableModel, { kind: K }>) : null;
}

/** The blasts of the corpus, those with a reconstructable geometry, and the sites that have none. */
export function geometrySupport(b: BenchmarkArtifact | null): { all: number; geometry: number; outside: string[] } | null {
  const v = b?.verdict;
  return v ? { all: v.supports.all.n_blasts, geometry: v.supports.geometry.n_blasts, outside: v.sites_outside_geometry_support } : null;
}
