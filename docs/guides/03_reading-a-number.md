# Reading a number

The single most useful page here, and the shortest.

---

## Two different things are called R2

On the same twelve blasts, the classical model scores **0.570** under one reading and **0.232** under
the other.

| Name here | What it is | What it answers |
|---|---|---|
| squared correlation | the square of the correlation between predicted and measured | how well the model **ranks** blasts |
| variance explained | one minus the residual sum of squares over the total, about the **1:1 line** | how much of the variance the model **actually explains as a prediction** |

A model can correlate at 0.755 and still be badly biased. The classical model on this hold-out is
exactly that model, and the figure the literature reports for it is the first one.

Every figure this product returns carries the name of what it is. There is no bare R2 anywhere.

## A model is only good compared to something

A **null model** that predicts the training mean runs beside every other model on every case.

On the published hold-out it scores a root mean square error of 0.147 m. The classical model scores
0.128 m. So the classical model beats predicting a constant by **13 percent**, which is the single
most useful number about it and is not reported anywhere in its literature.

## Ask which protocol produced it

The same model, on the same rows, scores very differently depending on how the data was split:

| | stacking ensemble |
|---|---|
| random 80/20 | 0.667 |
| deduplicated, then random | 0.885 |
| leave one site out | **-0.951** |

The third is the practitioner question: can this model reach a mine it has not seen? The first is the
one the literature reports.

Neither is wrong. They answer different questions, and only one of them is yours.

## Ask what was withheld

Every learned prediction on this site shows which campaign was **held out of its training**. A model
trained on a campaign and then shown predicting that campaign is displaying a memory, and a memory
looks exactly like a very good model.

## Read the refusals

282 of the 1824 prediction cells are refusals, each with a reason. A refusal is a result: it says the
model could not answer and why, rather than filling the gap with something plausible.

If a model answers everything and another abstains on a fifth of the rows, they have not been
compared. The counts are on every score block for that reason.

## An interval, and what unit it resamples

The corpus is heavily clustered: one quarry supplies 22 of the 97 rows. An interval computed by
resampling rows treats those 22 as 22 independent draws, which they are not, and comes out too
narrow.

Under a site-held-out protocol the resampling unit is the **site**. The engine takes that as an
argument rather than guessing, because the right unit depends on the claim being made.

## What none of this tells you

That a model is right about your mine. The most that can be said, from this corpus, is:

- two fixed-coefficient models transfer to a campaign they have never seen, at 0.802 and 0.311;
- no fitted model does;
- and 97 blasts from ten campaigns are enough to fit something that interpolates between campaigns it
  has seen, and not enough to fit something that reaches a new one.
