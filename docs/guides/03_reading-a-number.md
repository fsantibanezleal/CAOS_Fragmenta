# Reading a number

Five questions to ask of any score on this site, or in the literature on this corpus.

---

## 1. Which statistic?

Two different things are called R2:

| Name here | What it is | What it answers |
|---|---|---|
| variance explained, $R^2_{\mathrm{id}}$ | one minus the residual sum of squares over the total, about the 1:1 line | how much of the variance the predictions explain, bias and scale included |
| squared correlation, $r^2$ | the square of the correlation between predicted and measured | how well the predictions rank the blasts, ignoring bias and scale |

On the published twelve-blast hold-out, the printed classical column scores 0.570 on the second and
0.232 on the first. The literature on this corpus mostly reports the second. Every figure on this site
carries its name; "variance explained" always means the first ([protocols/01](../protocols/01_metrics.md)).

## 2. Compared with what?

A null model that predicts the training mean runs beside every arm. On the published hold-out the
printed classical column has an RMSE of 0.128 m against the null's 0.147 m: about 13 percent better than
a constant. Under leave one site out, the null itself is negatively correlated with the measurements
(holding out a coarse site lowers the training mean), so a margin over it overstates skill; that is why
the criterion also asks for a positive score ([protocols/04](../protocols/04_criterion-and-row-sets.md)).

## 3. Which protocol, and one draw or many?

The same arm on the same rows, for the stacked ensemble:

<!-- facts:arm-stacking -->
Evidence for **stacking ensemble** in the committed benchmark (variance explained about the identity line):

- random 80/20, 100 draws: median 0.703, 5th to 95th percentile 0.47 to 0.85;
- deduplicated, 100 draws: median 0.699;
- held out by site, every blast: -0.035 (site-resampled 95 percent interval -2.25 to 0.42);
- held out by site, the 91 blasts with geometry: 0.034 (-1.81 to 0.54);
- error by held-out campaign: lowest at Reocin-UG (0.081 m RMSE), highest at Murgul (0.367 m).
<!-- /facts -->

The random split is the protocol the literature reports, and one draw of it spans a wide range; the
site hold-out asks whether the model reaches a mine it has not seen. Ask which one produced a number, and
whether it is one draw or the median of many ([protocols/02](../protocols/02_three-protocols.md)).

## 4. On which rows, and what did the arm know?

- **The row set.** The classical arms abstain on the six Miami blasts, which have no geometry. A score
  over 91 rows and one over 97 are not comparable; the benchmark reports both.
- **What was withheld.** Every learned prediction on a real campaign comes from a model fitted without
  that campaign; the App says which one.
- **What was fitted in sample.** The router and the published regression were fitted by their source on
  these 97 blasts, so no split hides a blast from them; the classical site factor was recovered from
  published predictions for the same site. Each arm's provenance says so, and the tables carry it.

## 5. What does the interval resample?

The corpus is clustered: one quarry supplies 22 of the 97 rows. An interval that resamples rows treats
them as independent and comes out narrower than the data support. The site-held-out intervals here
resample campaigns, and with ten campaigns they are wide; a difference smaller than the intervals is not
reported as a finding ([protocols/03](../protocols/03_intervals.md)).

## Read the refusals

Of the 1976 prediction cells in the case artifacts, 294 are abstentions, each with a reason in the
artifact and on hover in the App. An abstention says the arm could not answer and why. Two arms with
different abstention counts have not been scored on the same rows; the counts are on every score.
