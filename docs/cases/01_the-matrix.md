# The case matrix

Sixteen cases across six categories: nine real campaigns, two parameter sweeps, one structural case and
four controls. Each case states its reason in both languages on the artifact (a test asserts the reason
is substantial), and each carries eight variants over the levers a blast engineer moves: burden,
spacing, powder factor, stemming and in-situ block size. A variant has no measured size, because a
changed design has not been fired, and it is never scored against the original blast's measurement.

---

## 1. Real campaigns, nine

Each is a real mine with its own rock, rig and measurement. The learned models shown on each were fitted
on the corpus without that campaign, and the App's What if tab uses that same fit.

| Case | Rock, modulus | Why it is in the matrix |
|---|---|---|
| `real-enusa` | folded schist, 60 GPa | the stiffest rock in the corpus; the uniformity index goes lowest here, because the stemming takes most of a bench only 1.33 burdens tall |
| `real-reocin` | carbonate, 45 GPa | the largest burden (6.0 m on 229 mm holes) and among the coarsest fragments; carries Rc1, the blast in both the training table and the 2012 validation set |
| `real-reocin-ug` | carbonate, 45 GPa | the stiffness-ratio extreme, an 18 m bench on a 3 m burden; its diameter is the one the source never printed and the reconstruction derives (91.2 mm on all six rows) |
| `real-murgul` | dacite, 50 GPa | the geometry check: one paragraph states three dimensions and the reconstruction reproduces all three; also where gradient boosting and the stack make their largest held-out error, about six times the null's |
| `real-mrica` | andesite, 32 GPa | the smallest holes (76 mm) in a 15 m bench, where the uniformity index is highest |
| `real-soma` | coal measures, 13.25 GPa | the unresolved source conflict: the same paragraph states a 5 m burden and a 21 cm hole, and the ratios cannot hold both |
| `real-dongri-buzurg` | weak schist, 9.57 GPa | the weakest rock and the lowest recovered rock factor; the classical arm's largest error held out by site |
| `real-akdaglar` | sandstone, 16.9 GPa | 22 of the 97 blasts, which is why rows are not independent and why the benchmark holds out whole campaigns |
| `real-ozmert` | sandstone, 15 GPa | the sibling quarry to Akdaglar, same basin and measurement method, the closest the corpus comes to a controlled comparison |

The per-site errors behind these statements are in [results/04](../results/04_per-site.md).

## 2. Parameter sweeps, two

Real campaigns vary several things at once, so no real case shows a clean response to one lever.

- `synth-sweep-burden`: the burden swept at fixed rock, the spine of the design response.
- `synth-sweep-powder`: the powder factor swept at fixed geometry, the economics axis: how much finer
  each extra kilogram of explosive per cubic metre makes the predicted fragments.

## 3. Structural case, one

`synth-ibsd-capped`: large in-situ blocks with an aggressive pattern. It isolates the coarse tail, where
the joint structure caps how fine the rock can break regardless of the explosive.

## 4. The controls, four

`real-miami` (no geometry), `ctrl-degenerate` (no charge column), `real-granite-ne` (outside the
envelope) and `ctrl-oracle` (a known answer). They have their own page,
[the controls](02_the-controls.md).

## 5. Synthetic cases are labelled synthetic

The sweeps, the structural case and the two synthetic controls sit inside the corpus envelope, so a
synthetic design is one that could have been fired. Each synthetic blast is labelled synthetic in its
metadata, carries no measurement, and its case reports a response rather than a score: a case with no
measurements is a design study, and a score block of zeros would read as a model failure.

Their hole diameter is a choice this product makes, 165 mm, the most common diameter in the corpus, and
the registry says so. Without it the classical arms would abstain on every synthetic case; abstention is
right where the scale is unknown, and here the scale was chosen.

**Why no arm is scored on its own output.** A synthetic truth produced by one of the arms would hand that
arm a perfect score. The research plan therefore had the synthetic truth come from a model unlike any arm;
as built, the design cases carry no truth at all, so no arm is ever scored on them, and the benchmark is
computed on the 97 corpus blasts only. The one exception is deliberate: the positive control's truth is the
published regression's own output, because its job is to show that the harness returns what it was given,
and its write-up says it tests the harness rather than the science. Four tests hold this
(`tests/test_pipeline.py`, the non-circularity block): no design carries a measurement or a score, no
synthetic blast enters the benchmark, every design rebuilds with every arm's prediction disabled, and the
positive control's truth is exactly the regression's.

## 6. Every case at a glance

<!-- facts:cases -->
| case | category | blasts | learned arms fitted without | answered | abstained | controls |
|---|---|---|---|---|---|---|
| `ctrl-degenerate` | negative-control | 6 | nothing (not in the corpus) | 0 | 78 | degenerate negative control: passed |
| `ctrl-oracle` | positive-control | 8 | nothing (not in the corpus) | 96 | 8 | positive control: passed |
| `real-akdaglar` | real-campaign | 22 | Akdaglar | 263 | 23 | - |
| `real-dongri-buzurg` | real-campaign | 9 | Dongri-Buzurg | 108 | 9 | - |
| `real-enusa` | real-campaign | 12 | Enusa | 144 | 12 | - |
| `real-granite-ne` | extrapolation-control | 5 | nothing (not in the corpus) | 40 | 25 | extrapolation control: passed |
| `real-miami` | negative-control | 6 | Miami | 42 | 36 | geometry negative control: passed |
| `real-mrica` | real-campaign | 11 | Mrica | 132 | 11 | - |
| `real-murgul` | real-campaign | 7 | Murgul | 80 | 11 | - |
| `real-ozmert` | real-campaign | 7 | Ozmert | 84 | 7 | - |
| `real-reocin` | real-campaign | 10 | Reocin | 120 | 10 | - |
| `real-reocin-ug` | real-campaign | 6 | Reocin-UG | 72 | 6 | - |
| `real-soma` | real-campaign | 7 | Soma | 84 | 7 | - |
| `synth-ibsd-capped` | structural-control | 12 | nothing (not in the corpus) | 134 | 22 | - |
| `synth-sweep-burden` | parameter-sweep | 12 | nothing (not in the corpus) | 144 | 12 | - |
| `synth-sweep-powder` | parameter-sweep | 12 | nothing (not in the corpus) | 139 | 17 | - |
<!-- /facts -->
