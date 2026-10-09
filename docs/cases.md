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
| `ctrl-degenerate` | negative-control | 6 | nothing (not in the corpus) | 0 | 84 | degenerate negative control: passed |
| `ctrl-oracle` | positive-control | 8 | nothing (not in the corpus) | 104 | 8 | positive control: passed |
| `real-akdaglar` | real-campaign | 22 | Akdaglar | 285 | 23 | - |
| `real-dongri-buzurg` | real-campaign | 9 | Dongri-Buzurg | 117 | 9 | - |
| `real-enusa` | real-campaign | 12 | Enusa | 156 | 12 | - |
| `real-granite-ne` | extrapolation-control | 5 | nothing (not in the corpus) | 40 | 30 | extrapolation control: passed |
| `real-miami` | negative-control | 6 | Miami | 42 | 42 | geometry negative control: passed |
| `real-mrica` | real-campaign | 11 | Mrica | 143 | 11 | - |
| `real-murgul` | real-campaign | 7 | Murgul | 87 | 11 | - |
| `real-ozmert` | real-campaign | 7 | Ozmert | 91 | 7 | - |
| `real-reocin` | real-campaign | 10 | Reocin | 130 | 10 | - |
| `real-reocin-ug` | real-campaign | 6 | Reocin-UG | 78 | 6 | - |
| `real-soma` | real-campaign | 7 | Soma | 91 | 7 | - |
| `synth-ibsd-capped` | structural-control | 12 | nothing (not in the corpus) | 146 | 22 | - |
| `synth-sweep-burden` | parameter-sweep | 12 | nothing (not in the corpus) | 156 | 12 | - |
| `synth-sweep-powder` | parameter-sweep | 12 | nothing (not in the corpus) | 151 | 17 | - |
<!-- /facts -->
