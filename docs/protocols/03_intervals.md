# Site-resampled intervals

Every pooled leave-one-site-out score carries a 95 percent interval obtained by resampling campaigns,
not blasts. With ten campaigns, the interval is wide, and that width is a result.

---

## 1. The cluster bootstrap

The bootstrap (Efron 1979) estimates the sampling distribution of a statistic by recomputing it on
resamples of the data. When the data come in clusters, here campaigns, the resampling unit is the
cluster (Field and Welsh 2007): draw ten sites with replacement, keep every blast of each drawn site
(a site drawn twice contributes its blasts twice), recompute the pooled score from the out-of-fold
predictions already made, and repeat.

$$
\left[\,q_{0.025},\ q_{0.975}\,\right]\ \text{of}\ \left\{R^2_{\mathrm{LOSO}}\big(\mathcal S^{*}_k\big)\right\}_{k=1}^{B},
\qquad \mathcal S^{*}_k \sim \text{ten sites drawn with replacement},\quad B = 2000
$$

The out-of-fold predictions are not refitted inside the bootstrap: each blast's prediction already
comes from a model fitted without its site, and the interval measures how much the pooled score
depends on which ten campaigns happened to be in the corpus.

## 2. Why sites and not blasts

Resampling blasts would treat the 22 blasts of one quarry as 22 independent observations of how a
model transfers to a new mine. They are one observation of that, repeated. With blasts as the unit the
interval comes out narrow and wrong; with sites it is wide and states what ten campaigns can support.

## 3. What ten sites can separate

<!-- facts:verdict -->
Over every blast (97), the best learned arm held out by site is gradient boosting at -0.034 (-2.23 to 0.42), and the criterion is not met. Over the 91 blasts with resolvable geometry it is stacking ensemble at 0.034 (-1.81 to 0.54), 0.266 above the null, and the criterion is met. The null's held-out predictions correlate with the measurements at -0.79.
<!-- /facts -->

Apart from arms whose source fitted them on this corpus, no arm's interval lies above zero on either
row set ([results/01](../results/01_verdict.md), last line). The classical arm's point estimate is
about 0.30 and the best learned arm's is near zero, and their intervals overlap almost entirely. A
statement such as "the classical equation transfers and the learned arms do not" is a reading of point
estimates; this product does not print it as a finding. A difference between two arms is reported as
a finding only when it is larger than their intervals allow.

## 4. What the interval is not

- It is not a prediction interval for one blast. It is the uncertainty of a corpus-level score.
- It does not cover what the corpus does not contain: a rock softer than 9.57 GPa, a hole larger than
  229 mm, an explosive other than ANFO.
- It does not account for the two Reocin campaigns sharing a rock (45 GPa), which makes them less
  independent than two sites usually are.

## 5. Reproducing it

The interval is computed by the engine's benchmark with `n_boot=2000` and `boot_seed=0`; the bake
passes those values and records them in the artifact (`n_boot`, `seed`):

```python
import blastfrag as bf

result = bf.run_benchmark(bf.load_training_corpus(), bf.default_arms(), n_repeats=100, n_boot=2000, boot_seed=0)
```

## Sources

- Efron, B. (1979). Bootstrap methods: another look at the jackknife. *The Annals of Statistics* 7:1-26. [doi:10.1214/aos/1176344552](https://doi.org/10.1214/aos/1176344552)
- Field, C. A. and Welsh, A. H. (2007). Bootstrapping clustered data. *J. R. Stat. Soc. B* 69:369-390. [doi:10.1111/j.1467-9868.2007.00593.x](https://doi.org/10.1111/j.1467-9868.2007.00593.x)
