# Cases

Sixteen cases in six categories. Each carries, in both languages and on the artifact itself, the reason
it is in the matrix, eight design variants, and the controls that can fire on it. The App shows one case
at a time; Experiments and Benchmark are the pages that summarise across them.

1. [The matrix](cases/01_the-matrix.md): what each case tests and what it shows.
2. [The controls](cases/02_the-controls.md): the four cases where the product must refuse, stamp or
   recover, and what each one checks.

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
