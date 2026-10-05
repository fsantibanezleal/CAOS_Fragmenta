# Metrics

Every prediction on this site is scored with variance explained about the identity line, and shown
with the squared correlation the literature reports, the root mean square error and the count of
abstentions.

---

## 1. Variance explained about the identity line

For measured sizes $y_i$ and predictions $\hat y_i$ over the scored rows:

$$
R^2_{\mathrm{id}} = 1 - \frac{\sum_i (y_i - \hat y_i)^2}{\sum_i (y_i - \bar y)^2}
$$

It compares the predictions with the 1:1 line, so a bias (every prediction 5 cm high) or a wrong scale
(predictions twice as spread as the measurements) lowers it. It is 1 for a perfect prediction, 0 for a
prediction that does as well as the mean of the scored rows, and negative when it does worse. This is
what a reader takes "variance explained" to mean, and it is the only statistic this product quotes
under that name.

## 2. The squared correlation

$$
r = \frac{\sum_i (y_i - \bar y)(\hat y_i - \bar{\hat y})}{\sqrt{\sum_i (y_i - \bar y)^2\,\sum_i (\hat y_i - \bar{\hat y})^2}}
$$

The source papers report $r^2$ as "R2". It is invariant to any linear rescaling of the predictions, so
a model that is consistently 30 percent high has the same $r^2$ as one that is right. The two
statistics are carried on every score, side by side.

**An example from the published hold-out.** The 2012 paper's printed classical column has a squared
correlation of 0.570 and a variance explained of 0.232 on its twelve hold-out blasts (see
[results/05](../results/05_published-reproductions.md)): the same predictions read as fairly good or
as barely better than a constant, depending on which statistic is called "R2".

## 3. Errors in metres and percent

$$
\mathrm{RMSE} = \sqrt{\frac{1}{n}\sum_i (y_i - \hat y_i)^2},\qquad
\mathrm{MAPE} = \frac{100}{n}\sum_i \left|\frac{y_i - \hat y_i}{y_i}\right|
$$

RMSE is reported per site in [results/04](../results/04_per-site.md), next to each campaign's mean
measured size, because an error of 0.1 m means something different at Miami (mean 0.08 m) than at
Reocin (mean 0.62 m).

## 4. Abstentions are counted, not scored

An arm abstains when it cannot answer: the classical arms where no absolute geometry exists (Miami),
the router on every blast (it predicts a group, not a size), the refit where a group has too few
training rows, any arm whose output leaves the plausible range of 0.001 to 3 m, and every arm on a
degenerate design. Each abstention carries its reason in the artifact, and the release gate fails the
bake on an abstention without one.

Abstentions are excluded from that arm's score and reported beside it, as "(6 abst.)" in the tables.
This is why the two row sets of [protocols/04](04_criterion-and-row-sets.md) exist: two arms scored
over different rows are not compared on the same denominator.

## 5. Where each statistic is computed

| Protocol | Scored on | Summary |
|---|---|---|
| random and deduplicated | each draw's own test rows | median and 5th and 95th percentiles over 100 draws |
| leave one site out | all out-of-fold predictions pooled | one score per row set, with a site-resampled interval |
| per case (the App) | that case's blasts, with the case's own site withheld from training | one score per arm per case |
| published hold-outs | the 12 (2012) or 13 (2010) printed rows | one score per printed column |

## Sources

- Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). *Geotech. Geol. Eng.* [doi:10.1007/s10706-012-9496-3](https://doi.org/10.1007/s10706-012-9496-3)
