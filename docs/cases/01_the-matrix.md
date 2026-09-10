# The case matrix

Sixteen cases across six categories, each carrying its reason in both languages on the artifact
itself. A case with no scientific reason is padding, so the reason is a required field and a test
asserts it is substantial.

Every case carries eight variants over families a blast engineer actually moves: burden, spacing,
powder factor, stemming and in-situ block size. A variant has **no measured size**, because a
perturbed design has not been fired, and it is never scored against the original blast measurement.

---

## Real campaigns, nine

Each one is a real mine with its own rock, rig and measurement operator. The learned models shown on
each were trained on the corpus **minus that campaign**.

| Case | Rock, and its modulus | Why it is here |
|---|---|---|
| Enusa | folded schist, 60 GPa | the stiffest rock in the corpus, and where the uniformity index goes lowest because the stemming takes most of a bench only 1.33 burdens tall |
| Reocin | carbonate, 45 GPa | the largest burden at 6.0 m on 229 mm holes; carries the blast that sits in both the training table and the published validation set |
| Reocin underground | carbonate, 45 GPa | the stiffness-ratio extreme, an 18 m bench on a 3 m burden; its diameter is the one the source never printed |
| Murgul | dacite, 50 GPa | the geometry check: one paragraph states three dimensions and the reconstruction reproduces all three exactly |
| Mrica | andesite, 32 GPa | the smallest holes at 76 mm in a 15 m bench, where the uniformity index reaches its highest values |
| Soma | coal measures, 13.25 GPa | the unresolved source conflict: the same paragraph states a 5 m burden and a 21 cm hole, and the ratios cannot hold both |
| Dongri-Buzurg | weak schist, 9.57 GPa | the weakest rock and the lowest recovered rock factor; where the classical model fails hardest |
| Akdaglar | sandstone, 16.9 GPa | 22 of the 97 blasts, which is why rows are not independent and why the benchmark holds out whole sites |
| Ozmert | sandstone, 15 GPa | the sibling quarry to Akdaglar, the closest thing this corpus has to a controlled comparison |

## Parameter sweeps, two

Real campaigns vary several things at once, so no real case can show a clean response to one lever.

- **Burden sweep at fixed rock**, the spine of the design response surface.
- **Powder-factor sweep at fixed geometry**, the economics axis: explosive is the cheapest place to
  break rock, and this is the curve that says how much finer each extra kilogram buys.

## Structural control, one

**Large in situ blocks with an aggressive pattern.** The point is the coarse tail: no amount of
explosive breaks rock finer than the joint structure without energy to do it.

## The four controls

They have their own page, [the controls](02_the-controls.md), because they are the reason to believe
anything else on the site.

## Synthetic cases are synthetic and say so

They live inside the envelope of the real corpus, so a synthetic design is one that could have been
fired rather than an arbitrary point. Every synthetic blast is labelled synthetic in its own metadata,
carries no measurement, and its case reports a **response** rather than a score.

That distinction matters on screen. A case with no measurements is a design study, not a model
failure, and a zero-shaped metric block would read as one.

Their hole diameter is a **choice this product makes**, not a measurement it recovers, and the
registry says so: 165 mm, the most common diameter in the corpus. Without it the classical models
would abstain on every synthetic case and five of sixteen cases would silently lose the whole
classical tier. Abstention is correct where the scale is unknown; here it is known, because it was
chosen.
