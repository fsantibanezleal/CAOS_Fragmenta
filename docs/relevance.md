# Relevance: why each tool is here, and what sustains it

Each tool in this product (every predictor, the controls, the diagnostics and the live lanes) has a
stated role: the question it answers or the decision it informs. Each role is backed by evidence from
the committed benchmark and limited by stated conditions. The evidence blocks below are rendered from
`data/derived/benchmark.json` by `scripts/build_docs_results.py`, and a test fails if they go stale.

Until 0.05.000 this page did not exist, and the relevance of the tools was asserted rather than
sustained. Until 0.04.006 the README counted the published regression among the models that transfer,
on a score that is in sample (its coefficients were fitted on these same 97 blasts). Until 0.05.000 it
said the classical arm improves when a site is held out, a reading of one random draw, and that no
learned model explains any variance with a campaign held out, which holds on one of the two row sets
and not on the other. No document said why each tool belonged in the ladder. The adversarial review
behind 0.05.000 found these claims unsupported; this page, the protocols and the generated results
replace them.

---

## 1. The product's own relevance

**The question.** Learned models fitted on the 97-blast corpus have been published with scores up to
0.943 from one random 80/20 split. Rows of one campaign share a rock, a rig and a measurement method,
so a random split can reward recognising the campaign. The decision a reader faces is whether any of
these predictors can be trusted at a mine that is not in the corpus, and by how much.

**What the product adds** that the publications do not: the same predictors under three protocols on
the same rows, repeated draws instead of one, whole-campaign hold-outs with site-resampled intervals, a
fixed criterion for the learned tier, the provenance of every arm, exact reproductions of the published
models, and the ability to run every fitted model on a new design in the browser.

**For whom.** A blast engineer deciding how far to trust a fragmentation prediction at their own pit;
a researcher comparing a new predictor on this corpus; anyone citing one of the published scores.

**The current answer.**

<!-- facts:verdict -->
Over every blast (97), the best learned arm held out by site is gradient boosting at -0.034 (-2.23 to 0.42), and the criterion is not met. Over the 91 blasts with resolvable geometry it is stacking ensemble at 0.034 (-1.81 to 0.54), 0.266 above the null, and the criterion is met. The null's held-out predictions correlate with the measurements at -0.79.
<!-- /facts -->

So no predictor here is validated for a new mine. The most useful thing the product sustains is the
size of the gap between random-split and site-held-out scores, and how wide the uncertainty is with ten
campaigns ([results/03](results/03_protocol-sensitivity.md)).

## 2. The tools, one by one

| Tool | Role in the product | Kind |
|---|---|---|
| Classical mean size, site factor | the industry baseline every other arm is read against | baseline |
| Classical mean size, transfer factor | tests whether the baseline borrows from the held-out site; the arm usable at a new mine with only a modulus | transfer test |
| Rock-factor schemes | expose the largest single uncertainty in the classical prediction | input model |
| Distribution shapes | turn a mean size into P80, oversize and fines for a crusher decision | output model, unvalidated |
| Group router | routes the regressions and the network; reproduces the published grouping | dependency |
| Published regression | reference reproduction of the 2010 equations | reproduction, in sample |
| Refitted regression | transfer test of the regression's functional form | transfer test |
| Published network | reproduction of a fully specified published learned model; seed robustness | reproduction |
| Support vector, radial and polynomial | the two published kernel choices on this corpus | reproductions |
| Random forest, gradient boosting | the 2025 base learners; what a learned model leans on | reproductions |
| Stacking ensemble | the 0.943 headline, placed among its own protocol's draws and held out by site | reproduction |
| Null and oracle | protocol reference and harness proof | controls |
| Outlier screen and importance | describe the corpus and what each model relies on | diagnostics |
| Live lanes and portable models | let a user test a design on every arm, with parity to the bake | instrument |

### 2.1 Classical mean size, site factor (`kuznetsov`)

**Role.** The Kuz-Ram family is described in the held sources as the most widely used in daily blasting
operations because it is easily parameterised (Amoako et al. 2022). It is the baseline a learned model
has to beat to be worth its opacity, and it is the only predictor whose structure scales with the
rock volume and charge per hole rather than with ratios alone.

**Decision it informs.** A first estimate of the mean size for a pattern and a rock factor, and how it
moves with burden, spacing and powder factor.

<!-- facts:arm-kuznetsov -->
Evidence for **classical mean size, site factor** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.303, 5th to 95th percentile -0.59 to 0.74;
- deduplicated, 100 draws: median 0.310;
- held out by site, every blast: 0.311 (site-resampled 95 percent interval -0.96 to 0.70, 6 blasts abstained);
- held out by site, the 91 blasts with geometry: 0.311 (-0.97 to 0.69);
- error by held-out campaign: lowest at Murgul (0.052 m RMSE), highest at Dongri-Buzurg (0.330 m).

Provenance: it reads a constant derived from the held-out site itself.
<!-- /facts -->

**Holds / does not hold.** Its score barely moves between protocols, because nothing in it is fitted to
the training rows. It needs an absolute pattern (it abstains at Miami) and a rock factor; with ten
sites its interval spans zero, so its skill at a new mine is not established.

### 2.2 Classical mean size, transfer factor (`kuznetsov-transfer`)

**Role.** The site-factor arm reads a constant recovered from published predictions for the held-out
site. This arm replaces it with a factor predicted from the modulus by a line fitted on the training
sites, so it answers whether the baseline's held-out score was borrowed.

**Decision it informs.** A classical prediction at a mine where only the rock's modulus is known.

<!-- facts:arm-kuznetsov-transfer -->
Evidence for **classical mean size, transfer factor** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.312, 5th to 95th percentile -0.57 to 0.69;
- deduplicated, 100 draws: median 0.331;
- held out by site, every blast: 0.298 (site-resampled 95 percent interval -1.10 to 0.72, 6 blasts abstained);
- held out by site, the 91 blasts with geometry: 0.298 (-1.10 to 0.71);
- error by held-out campaign: lowest at Akdaglar (0.057 m RMSE), highest at Dongri-Buzurg (0.290 m).
<!-- /facts -->

**Holds / does not hold.** It scores within about 0.01 of the site-factor arm, so the baseline's score
is not borrowed. The line sees no rock-mass structure and extrapolates below 9.57 GPa.

### 2.3 Rock-factor schemes

**Role.** The predicted size is linear in the rock factor, and the published schemes disagree: the two
tables attributed to Lilly differ by up to 0.85 in the factor at 100 MPa. Offering them side by side,
with the factor recovered from the published predictions, makes that uncertainty visible instead of
hiding it in one number.

**Evidence.** The recovered factors vary by at most 3.7 percent within a site, which validates the
geometry and the equation's form; per-campaign factors and the transfer line's values are in
[methods/03](methods/03_rock-factor.md) section 6.

**Holds / does not hold.** No corpus blast carries the joint data the rating schemes need, so on the
corpus only the recovered and transfer routes are usable.

### 2.4 Distribution shapes

**Role.** A crusher is specified on P80, an oversize limit and a fines fraction, not on the mean size.
These shapes turn the mean into those numbers, and the App's "Against a target" view compares the
P80 with a specification.

**Evidence.** None on this corpus: no available dataset carries a measured passing curve. The shapes
are declared unvalidated on every page that shows one ([methods/04](methods/04_distribution-shapes.md)
section 7), and the benchmark counts them once, through the mean size they share.

### 2.5 Group router (`group-discriminant`)

**Role.** The published regressions and network are per stiffness group; the router assigns the group.

**Evidence.** It reproduces the published membership of all 109 labelled blasts with no error, and its
two groups do not overlap. It predicts a group, not a size, so it abstains as a size predictor.

### 2.6 Published regression (`published-regression`)

**Role.** A reference reproduction of the 2010 equations: recomputing them beats the papers' own printed
tables on both published hold-outs ([results/05](results/05_published-reproductions.md)), and resolves
four of the five rows where the papers disagree.

<!-- facts:arm-published-regression -->
Evidence for **published regression** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.805, 5th to 95th percentile 0.65 to 0.93;
- deduplicated, 100 draws: median 0.837;
- held out by site, every blast: 0.802 (site-resampled 95 percent interval 0.57 to 0.90);
- held out by site, the 91 blasts with geometry: 0.781 (0.50 to 0.88);
- error by held-out campaign: lowest at Miami (0.011 m RMSE), highest at Dongri-Buzurg (0.160 m).

Provenance: its coefficients were fitted by its source on this corpus, so no split hides a blast from it.
<!-- /facts -->

**Holds / does not hold.** Its coefficients were fitted on these same 97 blasts, so every score it gets
on a split of the corpus is in sample, and it is reported as such. Its out-of-sample evidence is the two
published hold-outs from the same sites. It is not a transfer result.

### 2.7 Refitted regression (`refitted-regression`)

**Role.** The transfer test of the regression's functional form: the same seven exponents per group,
fitted per split.

<!-- facts:arm-refitted-regression -->
Evidence for **refitted regression** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.686, 5th to 95th percentile 0.39 to 0.87;
- deduplicated, 100 draws: median 0.715;
- held out by site, every blast: -4.075 (site-resampled 95 percent interval -19.48 to 0.02, 4 blasts abstained);
- held out by site, the 91 blasts with geometry: -4.601 (-21.92 to 0.09);
- error by held-out campaign: lowest at Soma (0.048 m RMSE), highest at Murgul (1.618 m).

Provenance: it is routed by the published discriminant, which was fitted on this corpus.
<!-- /facts -->

**Holds / does not hold.** With nine sites the group-1 exponents can swing far from the published
ones and the arm extrapolates to implausible sizes, which it refuses to report. The form fits the
corpus well and transfers poorly.

### 2.8 Published network (`published-neural-net`)

**Role.** The one learned model published with a complete specification. Reproducing it exactly is
what makes a disagreement with the paper meaningful.

<!-- facts:arm-published-neural-net -->
Evidence for **published neural network** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.362, 5th to 95th percentile -0.65 to 0.70;
- deduplicated, 100 draws: median 0.183;
- held out by site, every blast: -0.626 (site-resampled 95 percent interval -3.35 to 0.01);
- held out by site, the 91 blasts with geometry: -0.604 (-3.42 to 0.09);
- error by held-out campaign: lowest at Soma (0.044 m RMSE), highest at Reocin (0.367 m).

Provenance: it is routed by the published discriminant, which was fitted on this corpus.
<!-- /facts -->

<!-- facts:seed-sweep -->
Over 30 seeds the reproduced network explains 0.167 to 0.636 of the variance on the 2012 hold-out (median 0.340); the published figure is 0.910, above every seed.
<!-- /facts -->

**Holds / does not hold.** The published hold-out score is not robust to the seed. With a site held
out, the clamp to the training range keeps it from predicting the coarsest campaigns.

### 2.9 Support vector, radial and polynomial (`svr-rbf`, `svr-poly`)

**Role.** Two published tunings on this corpus reach opposite conclusions about the kernel; both are
reproduced so the disagreement stays visible.

<!-- facts:arm-svr-rbf -->
Evidence for **support vector, radial** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.665, 5th to 95th percentile 0.22 to 0.81;
- deduplicated, 100 draws: median 0.651;
- held out by site, every blast: -0.387 (site-resampled 95 percent interval -1.61 to -0.06, 1 blasts abstained);
- held out by site, the 91 blasts with geometry: -0.466 (-1.86 to -0.07);
- error by held-out campaign: lowest at Soma (0.033 m RMSE), highest at Reocin-UG (0.417 m).
<!-- /facts -->

<!-- facts:arm-svr-poly -->
Evidence for **support vector, polynomial** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.395, 5th to 95th percentile 0.09 to 0.66;
- deduplicated, 100 draws: median 0.396;
- held out by site, every blast: -4.546 (site-resampled 95 percent interval -16.24 to -0.83, 11 blasts abstained);
- held out by site, the 91 blasts with geometry: -4.811 (-17.18 to -0.95);
- error by held-out campaign: lowest at Soma (0.056 m RMSE), highest at Reocin-UG (1.156 m).
<!-- /facts -->

### 2.10 Random forest and gradient boosting (`random-forest`, `xgboost`)

**Role.** The 2025 base learners. Their native importance says what a learned model on this corpus leans
on, which is mostly the modulus, a near site label with nine distinct values over ten sites
([results/06](results/06_diagnostics.md)).

<!-- facts:arm-random-forest -->
Evidence for **random forest** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.749, 5th to 95th percentile 0.55 to 0.90;
- deduplicated, 100 draws: median 0.753;
- held out by site, every blast: -0.231 (site-resampled 95 percent interval -2.78 to 0.38);
- held out by site, the 91 blasts with geometry: -0.233 (-2.88 to 0.40);
- error by held-out campaign: lowest at Ozmert (0.059 m RMSE), highest at Mrica (0.346 m).
<!-- /facts -->

<!-- facts:arm-xgboost -->
Evidence for **gradient boosting** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.704, 5th to 95th percentile 0.48 to 0.85;
- deduplicated, 100 draws: median 0.702;
- held out by site, every blast: -0.034 (site-resampled 95 percent interval -2.23 to 0.42);
- held out by site, the 91 blasts with geometry: 0.034 (-1.78 to 0.53);
- error by held-out campaign: lowest at Reocin-UG (0.080 m RMSE), highest at Murgul (0.365 m).
<!-- /facts -->

### 2.11 Stacking ensemble (`stacking`)

**Role.** The published 0.943 is the strongest score reported on this corpus. The product reproduces
the construction as published, places the figure among a hundred draws of its own protocol, and holds
out each campaign.

<!-- facts:published-splits -->
- stacking ensemble: published 0.943 on one random split; the reproduced draws have a median of 0.703, and 100 of 100 fall below the published figure.
- support vector, polynomial: published 0.578 on one random split; the reproduced draws have a median of 0.395, and 83 of 100 fall below the published figure.
<!-- /facts -->

<!-- facts:arm-stacking -->
Evidence for **stacking ensemble** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.703, 5th to 95th percentile 0.47 to 0.85;
- deduplicated, 100 draws: median 0.699;
- held out by site, every blast: -0.035 (site-resampled 95 percent interval -2.25 to 0.42);
- held out by site, the 91 blasts with geometry: 0.034 (-1.81 to 0.54);
- error by held-out campaign: lowest at Reocin-UG (0.081 m RMSE), highest at Murgul (0.367 m).
<!-- /facts -->

**Holds / does not hold.** Fitted on in-sample predictions, the meta-learner gives the boosting model
almost all the weight, so the ensemble behaves like its boosting learner under every protocol.

### 2.12 Null and oracle

**Role.** The null is the reference every score is read against, and under leave one site out its
negative correlation with the measurements is the reason the criterion requires a positive score. The
oracle scores exactly 1 under every protocol, which shows the scoring code is not the source of any
difference ([protocols/02](protocols/02_three-protocols.md)).

### 2.13 Outlier screen and importance

**Role.** Describe the corpus without changing it: which rows are unusual (reported, never filtered),
and which inputs each model relies on, natively and under held-out-site resampling
([results/06](results/06_diagnostics.md)).

### 2.14 Live lanes and portable models

**Role.** Let a reader change a design and see every arm answer, including the learned ones fitted
without the case's campaign, instead of reading a replay.

**Evidence.** The closed forms match every baked blast to the artifacts' rounding; the tree models
reproduce the original predictions at all 116 shipped blasts exactly, and the network and the kernel to
a relative 1e-12 ([architecture/05](architecture/05_portable-models.md)).

**Holds / does not hold.** A live learned number is the fitted model's number; it is no more reliable
outside the training envelope than the benchmark says the model is.

## 3. What would change these verdicts

- **More sites.** With ten campaigns no non-in-sample arm separates from the corpus mean. Each added
  campaign narrows the site-resampled intervals; this is the single change that could make a transfer
  claim possible.
- **Measured passing curves.** A set of blasts with both the design and a sieved or calibrated
  image-analysis curve would validate (or reject) the distribution shapes.
- **Joint data.** Rock-mass descriptions and joint spacing and orientation per blast would let the
  rating schemes be scored instead of only compared.
- **A mechanistic tier.** No discrete-element or hybrid stress engine was available for this work; one
  with reference output would add the only arm that does not learn from these rows at all.

## Sources

- Amoako, R., Jha, A. and Zhong, S. (2022). *Mining* 2:233-247. [doi:10.3390/mining2020013](https://doi.org/10.3390/mining2020013)
- Hudaverdi, T., Kulatilake, P. H. S. W. and Kuzu, C. (2010). *Int. J. Numer. Anal. Methods Geomech.* 35:1318-1333. [doi:10.1002/nag.957](https://doi.org/10.1002/nag.957)
- Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). *Geotech. Geol. Eng.* [doi:10.1007/s10706-012-9496-3](https://doi.org/10.1007/s10706-012-9496-3)
- Sui, Y. et al. (2025). *Applied Sciences* 15:1254. [doi:10.3390/app15031254](https://doi.org/10.3390/app15031254)
- Roberts, D. R. et al. (2017). *Ecography* 40:913-929. [doi:10.1111/ecog.02881](https://doi.org/10.1111/ecog.02881)
