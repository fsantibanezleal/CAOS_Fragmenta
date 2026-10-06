# Designing a blast: the response surface and every model on a design

The App's **Design** group changes the design of the selected blast and reads every model's answer,
recomputed live in the browser. Its first view maps the selected model over the burden and spacing
plane; the second lists every model on the design as it stands. Until 0.07.000 this was the What if
tab, which moved one lever at a time; one lever at a time cannot show the interaction that makes
blast design a design problem, where a tighter burden can pay for a wider spacing at the same size.

## What is in the group

| Part | What it shows |
|---|---|
| The response surface | the selected model's P80 (or mean size x50) on a 41 by 41 grid of burden-to-diameter and spacing-to-burden ratios spanning the corpus envelope, the other ratios and the hole diameter held at the design in the rail; iso-lines at the crusher's target P80 and the oversize limit (or, for x50, at the measured size); the design as a marker you drag |
| Every model on this design | one row per model: a filled dot at the live prediction for the design, a ring at the baked prediction for the blast as fired, a line at the measured size while the design is the blast as fired; a model that refuses says why in place of a dot |
| The bench | the blast as fired, reconstructed in 3D from the published ratios and the hole diameter of the source's prose; it does not redraw for a changed design |
| The rail | the bench height and stemming ratios and the hole diameter (Bench), the powder factor, in-situ block and modulus and what the map shows (Charge), the model and the blast (Model) |

The case's design variants (burden 15 percent tighter, powder factor 30 percent higher, and so on)
set the design the group starts from; "Compare the variants" shows the baked response to each.

## How the surface is computed

Every cell is one design, evaluated by the same function the every-model view runs
(`answerOnDesign` in `frontend/src/engine/design.ts`), so the map and the list cannot disagree:

| Model | Computed from |
|---|---|
| classical mean size, site factor | the TypeScript closed form on the pattern rebuilt from the cell's ratios and the hole diameter, with the site's recovered rock factor |
| classical mean size, capped | the same, capped at the cell's in-situ block, `min(x50, XB)` |
| classical mean size, transfer factor | the closed form with the rock factor from the transfer line fitted for this case, without its campaign |
| published regression | the TypeScript closed form (the router and the two published power laws) |
| refitted regression, network, radial kernel, forest, boosting, stack | the case's models file, walked exactly, so a held-out site's surface uses models fitted without it ([architecture/05](../architecture/05_portable-models.md)) |

The P80 of a cell is read from a Rosin-Rammler curve with the model's mean size and Cunningham's
uniformity index of the cell's own pattern. That is a declared choice for the learned models, which
predict a mean size and no curve: their P80 takes the classical shape.

A cell is left empty, hatched, with its reason on hover, when its design is not a blast (the stemming
leaves less than 5 percent of the hole charged) or when the model's answer leaves the plausible range
of 0.001 to 3 m. Iso-lines are traced by marching squares over the cell values with linear
interpolation along each edge; a level is drawn only where cells straddle it, and a square with an
empty corner draws nothing. The 1681 evaluations of one surface took 13 to 19 ms per model in Node 24
on the development workstation, the tree ensembles and the stack included, so the map recomputes on
every change.

## Using it

- **Drag the marker**, or focus the map and use the arrow keys, to move the design's burden and
  spacing; the every-model view, the Distribution group's curves and its percentiles follow.
- **Switch what the map shows** between P80, read against the crusher specification of the
  Distribution group's "Against a target" view, and the mean size x50.
- **Pick another model** in the rail's Model section; the surface maps the selected model when it
  predicts a size from a design, and the classical one otherwise.

## Reading it

- **Direction and size, not accuracy.** More explosive should predict finer rock and a wider burden
  coarser rock; the map shows how each model trades the two levers. How much a model is worth at a
  mine it has not seen is on the Benchmark page.
- **Abstentions are answers.** For example, with Murgul withheld, the refitted regression returns
  about 10.5 m for the unchanged Mg1 design and abstains there, in the bake and live alike.
- **Outside the envelope** every prediction is an extrapolation, and the every-model view names the
  inputs that are out.
- **A degenerate design** (stemming that takes the whole bench) makes every model refuse with that
  reason, and the surface is hatched where it is.
