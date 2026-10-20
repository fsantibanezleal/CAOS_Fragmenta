# Notebooks, English

The index of the English tree. Topics run from simple to complex; inside a topic the reading order is the notebook number and the level never goes
down. The Spanish counterpart of every notebook is at the same path under [`../es/`](../es/README.md). How to run them is in
[`../README.md`](../README.md).

Levels: 1 fundamentals, 2 the method in practice, 3 state of the art, 4 beyond the state of the art. Every notebook reads its numbers from the
committed artifacts or from the engine `blastfrag` 0.4.0 in the run, and ends with its references.

## Topics

A topic without a level 3 notebook says why on its row.

| Topic | Needs | Level 3 |
|---|---|---|
| [01-the-data](01-the-data/) | none, this is the entry topic | No level 3: the corpus is one published table set with no alternative loader or integrity method in the research to compare against |
| [02-classical-prediction](02-classical-prediction/) | topic 01-the-data | [03-the-published-hold-out-tables](02-classical-prediction/03-the-published-hold-out-tables.ipynb) |
| [03-size-distribution](03-size-distribution/) | topic 02-classical-prediction | No level 3: no dataset held for this work carries a measured size distribution, so no curve form can be ranked against the state of the art |
| [04-benchmark-protocol](04-benchmark-protocol/) | topic 01-the-data | [03-placing-a-published-score-in-its-own-protocol](04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb) |
| [05-learned-arms](05-learned-arms/) | topic 04-benchmark-protocol | [03-reproducing-the-published-network](05-learned-arms/03-reproducing-the-published-network.ipynb) |
| [06-design-response](06-design-response/) | topics 02-classical-prediction and 05-learned-arms | No level 3: no published predictor reports how its prediction responds to a change of design on this corpus, so there is nothing to compare against |

## Notebooks

| Notebook | Level | What it teaches |
|---|---|---|
| [01-the-data/01-the-corpus-and-the-cases.ipynb](01-the-data/01-the-corpus-and-the-cases.ipynb) | 1 | the 97 published blasts and their seven inputs, the ten campaigns, the three hold-out sets, the sixteen cases and what a committed case artifact holds |
| [01-the-data/02-geometry-reconstruction.ipynb](01-the-data/02-geometry-reconstruction.ipynb) | 2 | from ratios to metres with one stored hole diameter, the check against 15 statements of the source prose, a check that fails when the diameter is wrong, and the one site that is refused |
| [01-the-data/03-integrity-gate-and-negative-controls.ipynb](01-the-data/03-integrity-gate-and-negative-controls.ipynb) | 4 | the load-time gate that reproduces the paper's printed statistics and a pinned digest, four planted defects and which layer catches each, and the two negative controls (claims BS-2 and BS-3) |
| [02-classical-prediction/01-the-classical-equation-on-one-blast.ipynb](02-classical-prediction/01-the-classical-equation-on-one-blast.ipynb) | 1 | the Kuznetsov mean size with Cunningham's correction written term by term, one blast, then a whole campaign scored with two named statistics |
| [02-classical-prediction/02-the-rock-factor.ipynb](02-classical-prediction/02-the-rock-factor.ipynb) | 2 | the one free number: recovered by inverting the equation on the published predictions, constant inside a site, different in the two papers, and not pinned by the rating tables |
| [02-classical-prediction/03-the-published-hold-out-tables.ipynb](02-classical-prediction/03-the-published-hold-out-tables.ipynb) | 3 | the printed predictions of the two papers scored like any other, the published regression recomputed from its equations, and the one blast shared with the training table |
| [02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb](02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb) | 4 | a rock factor predicted from the modulus over the other sites, and how little of the classical score was borrowed from the held-out site (claim BS-4) |
| [03-size-distribution/01-from-a-mean-size-to-a-curve.ipynb](03-size-distribution/01-from-a-mean-size-to-a-curve.ipynb) | 1 | the Rosin-Rammler curve and Cunningham's uniformity index with its mixed-unit trap, percentiles, and the spread of the index over the corpus |
| [03-size-distribution/02-swebrec-crush-zone-and-the-block-cap.ipynb](03-size-distribution/02-swebrec-crush-zone-and-the-block-cap.ipynb) | 2 | three curve forms around one mean size, the undulation parameter, the unpublished crush-zone constants and the cap at the in situ block |
| [04-benchmark-protocol/01-three-ways-to-split-the-same-97-blasts.ipynb](04-benchmark-protocol/01-three-ways-to-split-the-same-97-blasts.ipynb) | 1 | the random, the deduplicated and the leave-one-site-out splits, the leak the first lets through and the check that refuses an invalid split |
| [04-benchmark-protocol/02-scores-the-null-and-the-interval.ipynb](04-benchmark-protocol/02-scores-the-null-and-the-interval.ipynb) | 2 | two named statistics, the null fitted in every fold and why it is not neutral, intervals that resample blasts against sites, and the pre-declared kill criterion on two row sets |
| [04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb](04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb) | 3 | the published 0.943 of the stacking ensemble placed among 100 draws of its own protocol, the duplicates test and the protocol gap |
| [04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb](04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb) | 4 | the cost of the protocol arm by arm, the site-resampled intervals, where a held-out arm fails, and the criterion fixed by a hash (claim BS-1) |
| [05-learned-arms/01-fitting-a-learned-arm-on-nine-sites.ipynb](05-learned-arms/01-fitting-a-learned-arm-on-nine-sites.ipynb) | 1 | fit and predict for the six learned arms on nine campaigns, checked against the committed Enusa artifact |
| [05-learned-arms/02-every-arm-and-why-each-one-refuses.ipynb](05-learned-arms/02-every-arm-and-why-each-one-refuses.ipynb) | 2 | the fourteen arms through ten folds, every refusal with its reason and campaign, and the ranking on the rows every arm answers |
| [05-learned-arms/03-reproducing-the-published-network.ipynb](05-learned-arms/03-reproducing-the-published-network.ipynb) | 3 | the published network reproduced under 30 seeds, its width selection repeated, and its widths held out by site |
| [06-design-response/01-moving-one-lever-at-a-time.ipynb](06-design-response/01-moving-one-lever-at-a-time.ipynb) | 1 | the eight standard variants applied to a campaign, the response of the classical, the regression and a learned arm, and the levers each ignores |
| [06-design-response/02-a-burden-and-spacing-surface.ipynb](06-design-response/02-a-burden-and-spacing-surface.ipynb) | 2 | a 7 by 7 burden and spacing surface for three arms, the 1/6 exponent of the classical volume dependence and the staircase of a tree ensemble |
| [06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb](06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb) | 4 | a portable models file read with the engine's reference reader, its content address, its fixtures and parity with a fresh fit (claim BS-5) |

## Beyond the state of the art

The five claims of the design document (`docs/design/SDD.md`, section "Beyond the state of the art"), each demonstrated by a level 4 notebook in both languages:

| Claim | What it claims | Notebook |
|---|---|---|
| BS-1 | the site-held-out protocol with site-resampled intervals and a criterion declared before the run and pinned by a hash | [04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion](04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb) |
| BS-2 | refusal as a first-class result: geometry that is reconstructed or refused, and a guard against designs that are not blasts | [01-the-data/03-integrity-gate-and-negative-controls](01-the-data/03-integrity-gate-and-negative-controls.ipynb) |
| BS-3 | the load-time integrity gate: the paper's printed statistics and a pinned digest reproduced on every load | [01-the-data/03-integrity-gate-and-negative-controls](01-the-data/03-integrity-gate-and-negative-controls.ipynb) |
| BS-4 | a rock factor predicted from the modulus over the other sites, so the classical score uses nothing from the held-out site | [02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site](02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb) |
| BS-5 | learned arms exported to portable documents and evaluated live in the browser, with fixtures and a content address | [06-design-response/03-learned-arms-served-live-from-a-portable-document](06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb) |
