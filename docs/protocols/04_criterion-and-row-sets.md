# The criterion and the two row sets

What counts as the learned tier generalising across sites, how that sentence came to read as it does,
why every grouped score is reported on two row sets, and what each arm declares about what it was
fitted on.

---

## 1. The kill criterion

The sentence the engine evaluates, verbatim:

> The learned tier counts as generalising across sites only if the best learned arm's variance
> explained under leave-one-site-out is BOTH positive and at least 0.10 above the null model's. Both
> halves are required: a margin over a null that is itself deeply negative is not skill, it is two
> models failing by different amounts.

$$
\text{generalises} \iff R^2_{\mathrm{LOSO}}(\text{best learned}) > 0 \ \wedge\ R^2_{\mathrm{LOSO}}(\text{best learned}) - R^2_{\mathrm{LOSO}}(\text{null}) \ge 0.10
$$

**Its history, as it happened.** It was first written before the first run as a margin over the null
alone. That run produced a best learned arm at -0.034 against a null at -0.216, and the margin-only
rule declared that the learned tier generalises, for an arm that does worse than predicting a
constant. The positivity half was added then. The sentence has not changed since, and an engine test
pins its hash (`a13f11385ef8`), so a later edit fails the suite.

## 2. Why the null's margin is inflated under this protocol

Holding out a coarse site lowers the training mean, so the null predicts low exactly where the
measurement is high; holding out a fine site raises it, and the null predicts high where the
measurement is low. Its pooled out-of-fold predictions are therefore negatively correlated with the
measurements, and a margin over this null is larger than the skill it seems to measure. That is why
the positivity half carries the weight.

## 3. Two row sets

The classical arms need an absolute geometry, and the Miami campaign publishes none, so they abstain on
its six blasts. Comparing a classical score over 91 blasts with a learned score over 97 compares
different denominators; before 0.05.000 that comparison set the verdict. Since then every pooled
score, and the criterion, is reported on both row sets:

| Row set | Blasts | What it is |
|---|---|---|
| `all` | 97 | every corpus blast; the classical arms abstain on six |
| `geometry` | 91 | the blasts whose pattern geometry is resolvable: the rows every arm can answer |

![Two row sets](../assets/fig-two-row-sets.svg)

The current outcome on both:

<!-- facts:verdict -->
Over every blast (97), the best learned arm held out by site is gradient boosting at -0.034 (-2.23 to 0.42), and the criterion is not met. Over the 91 blasts with resolvable geometry it is stacking ensemble at 0.034 (-1.81 to 0.54), 0.266 above the null, and the criterion is met. The null's held-out predictions correlate with the measurements at -0.79.
<!-- /facts -->

The six blasts that separate the two row sets are the Miami campaign, the finest fragments in the
corpus (mean 0.080 m against a corpus mean of about 0.30 m), where the tree models make some of their
largest errors ([results/04](../results/04_per-site.md)). When the criterion's outcome differs between
the row sets, the engine writes that the verdict depends on the row set, and this product reports it
that way rather than choosing one.

## 4. What each arm declares

Withholding rows is not enough for every arm, so each arm carries flags in the benchmark's
`provenance` block, and every table on the site and in [results/02](../results/02_every-arm.md) shows
them:

| Flag | Meaning | Arms |
|---|---|---|
| `in_sample_corpus` | its coefficients were fitted by its source on these 97 blasts; no split hides a blast from it | `published-regression`, `group-discriminant` |
| `router_in_sample` | it fits its own parameters per split, but chooses the stiffness group with the published router | `refitted-regression`, `published-neural-net` |
| `uses_site_constant` | it reads a constant derived from the held-out site itself | `kuznetsov` (the site rock factor) |
| `shares_mean_size_with` | a curve shape around another arm's mean size; the engine sets it on the Kuz-Ram, Swebrec and crush-zone arms, which the benchmark therefore leaves out, counting the mean size once through `kuznetsov` | none of the benchmark's arms |
| (none) | everything it uses is fitted on the fold's training rows | `kuznetsov-transfer`, `svr-rbf`, `svr-poly`, `random-forest`, `xgboost`, `stacking` |

The verdict lists the in-sample arms and the site-constant arms by name, and excludes the in-sample
ones from the "interval above zero" line, so a source's own fit is never read as transfer.

## 5. Two consequences for reading the benchmark

- **The published regression's held-out score is its in-sample fit.** Its out-of-sample evidence is
  the two published hold-outs, from the same sites; the transfer test of its functional form is the
  refit ([methods/05](../methods/05_router-and-regressions.md)).
- **The classical arm's held-out score is not borrowed.** The transfer arm removes the site constant
  and scores within about 0.01 of it ([methods/02](../methods/02_classical-mean-size.md)).

## Sources

- Roberts, D. R. et al. (2017). *Ecography* 40:913-929. [doi:10.1111/ecog.02881](https://doi.org/10.1111/ecog.02881)
- Engine: `KILL_CRITERION` and `SUPPORTS` in [blastfrag/benchmark.py](https://github.com/fsantibanezleal/CAOS_BlastFrag/blob/main/blastfrag/benchmark.py)
