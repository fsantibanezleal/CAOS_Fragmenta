/**
 * The App route's state: what is selected, and every control value, in one place, so the rail and the instrument
 * read the same thing and the shell's selection key covers all of it.
 */

import type { LiveBlast } from '../engine/live';
import type { SurfaceQuantity } from '../engine/surface';
import type { BlastRow, CaseArtifact, ModelsFile } from '../lib/contract.types';

export const DEFAULT_CASE = 'real-murgul';
export const DEFAULT_ARM = 'published-regression';

export type GroupId = 'predict' | 'distribution' | 'design' | 'rock';
export type DistributionView = 'curves' | 'decide';
export type DesignView = 'surface' | 'bench';
export type TieIn = 'row-by-row' | 'v-cut' | 'reverse';

/** The controls of the instrument, grouped by the views they move. */
export interface Controls {
  undulation: number;
  finesFraction: number;
  targetP80Cm: number;
  oversizeCm: number;
  ucs: number;
  density: number;
  jointSpacing: number;
  tieIn: TieIn;
  delayMs: number;
  quantity: SurfaceQuantity;
}

export const DEFAULT_CONTROLS: Controls = {
  undulation: 2,
  finesFraction: 0.05,
  targetP80Cm: 60,
  oversizeCm: 100,
  ucs: 80,
  density: 2.7,
  jointSpacing: 0.6,
  tieIn: 'row-by-row',
  delayMs: 8,
  quantity: 'p80',
};

/** Everything a view needs: the case, the blast, the model, and the design as it stands. */
export interface Selection {
  artifact: CaseArtifact;
  models: ModelsFile | null;
  blast: BlastRow;
  armId: string;
  variantId: string;
  /** The design the live views show: the blast as fired, the variant applied, then the reader's changes. */
  design: LiveBlast;
  holeMm: number;
  /** True while the design is the blast as fired, so its measured size still applies. */
  asFired: boolean;
  controls: Controls;
  stateKey: string | undefined;
}

/** Real data, or a design that has not been fired. */
export const provenanceOf = (sel: Selection, live: boolean): 'real' | 'synthetic' =>
  sel.artifact.case.real_or_synthetic === 'real' && (!live || sel.asFired) ? 'real' : 'synthetic';
