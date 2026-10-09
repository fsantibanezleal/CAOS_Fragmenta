# Design: the design response surface

## What

A heat map of the selected arm's predicted `x50` (or P80, toggled) over a grid of burden-to-diameter and
spacing-to-burden ratios spanning the corpus envelope, at the case's representative rock (modulus, in-situ block),
hole diameter, bench height and powder factor. Iso-lines at the crusher's target P80 and at the oversize limit; the
current design as a marker the reader drags, which moves the rail's knobs, the distribution and the readouts.

## How it is computed

- The grid is 41 by 41 over the envelope of `B/D` and `S/B` (`TRAINING_ENVELOPE` in the engine; mirrored in the
  frontend), evaluated by `frontend/src/engine/live.ts` for the closed forms and `frontend/src/engine/learned.ts`
  for the learned arms with the case's training-scope models. A cell that is not a blast (`degenerateReason`) or
  whose prediction leaves the plausible range is empty, with its reason.
- Iso-lines by marching squares over the cell centres, with linear interpolation on the edges; a level is drawn
  only where cells straddle it.
- Drawn on a canvas sized by the shell's `Stage`; the hover readout gives the cell's design, prediction and lane.
  1681 evaluations per arm: the closed forms in well under a frame; the tree ensembles walk a few thousand
  comparisons per cell, measured before the surface is accepted.

## Interaction rubric

Per `conventions/interactive-visualization-rubric.md`: hover readout on every cell, the marker draggable and
keyboard-movable, the colour scale with its legend and units, the empty cells marked, paused by default (nothing
animates), recomputed only when the arm, the case or a rail value changes.
