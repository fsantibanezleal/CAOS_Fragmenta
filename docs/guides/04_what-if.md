# The What if tab

Change the design of the selected blast and read every arm's answer, recomputed live in the browser.

## What is on the tab

| Part | What it shows |
|---|---|
| "Every arm on your modified design" | one row per arm: a filled dot at the live prediction for your design, an open dot at the baked prediction for the unchanged blast, a vertical line at the measured size; point at a row to read both values or the reason it abstains |
| "Your design" | the seven ratios and the hole diameter, starting at the selected blast's values; a control outside the corpus envelope is marked; "Back to the measured blast" resets them |
| "One lever at a time, baked" | for one arm, the baked prediction for each of the case's design variants (burden, spacing, powder factor, stemming, block size moved one at a time), as rows against a line at the design as fired; point at a row to read the change in percent |
| "How to read it" | the reminder that a changed design has not been fired |

## What computes each answer

| Arm | Computed from |
|---|---|
| classical mean size, site factor | the TypeScript closed form on the pattern rebuilt from your ratios and hole diameter, with the site's recovered rock factor |
| classical mean size, transfer factor | the same closed form with the rock factor from the transfer line fitted for this case, without its campaign |
| published regression | the TypeScript closed form (the router and the two published power laws) |
| refitted regression, network, radial kernel, forest, boosting, stack | the case's models file, walked exactly ([architecture/05](../architecture/05_portable-models.md)) |

The learned arms are the ones fitted without the case's own campaign, so for a real campaign they are
the same models whose held-out error the benchmark reports.

## Reading it

- **Direction and size, not accuracy.** More explosive should predict finer rock, and a wider burden
  coarser rock; the tab shows how far each arm moves and in which direction. How much an arm is worth
  at a mine it has not seen is on the Benchmark page.
- **Abstentions are answers.** An arm that returns a size outside 0.001 to 3 m abstains with the value
  in its reason; for example, with Murgul withheld, the refitted regression returns about 10.5 m for the
  unchanged Mg1 design and abstains there, in the bake and live alike.
- **Outside the envelope** every prediction is an extrapolation, and the tab says which inputs are out.
- **A degenerate design** (stemming that takes the whole bench, no charge column) makes every arm
  abstain with that reason.
