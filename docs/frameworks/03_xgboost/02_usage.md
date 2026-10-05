# XGBoost: how this product uses it

| Setting | Value | Source |
|---|---|---|
| estimator | `XGBRegressor` | |
| learning rate | 0.5 | Sui et al. 2025, final parameters |
| seed | `random_state=42` | Sui et al. 2025 |
| trees | 100, the library default | the source does not print it |
| inputs | standardised with each split's training-row mean and population deviation | |

**Overfitting, reproduced.** The source reports its booster as overfitting; the reproduction fits its
training rows above 0.98 of variance explained ([example.py](example.py) prints 0.991 on the whole
corpus), and that is kept rather than tuned away, because the published model is the subject.

**Gain importance** is the native importance reported for the booster; on this corpus it puts about
0.92 of the gain on the modulus ([results/06](../../results/06_diagnostics.md)).

**The export.** The engine reads the booster's JSON (`get_booster().save_raw("json")`): per tree the
arrays `left_children`, `right_children`, `split_indices`, `split_conditions`, and the `base_score`. Two
details make a port exact: split values are rounded back to 32 bits (the JSON prints short decimals that
parse to nearby 64-bit floats), and the leaf sum is accumulated in 32 bits from the base score. The
example shows the first: a walk that compares in 64 bits takes the other branch of the first tree on 13
of the 97 corpus blasts, because XGBoost's split candidates are data values and inputs sit exactly on
them ([architecture/05](../../architecture/05_portable-models.md)).
