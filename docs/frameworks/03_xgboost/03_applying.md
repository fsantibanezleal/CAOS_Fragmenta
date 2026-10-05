# XGBoost: applying it

## 1. On grouped data, test by group

The booster fits its training rows almost exactly, so a random split of grouped rows rewards it for
recognising the group. Use the grouped protocol of [02_scikit-learn/03_applying](../02_scikit-learn/03_applying.md)
with `XGBRegressor` in place of the forest; on this corpus its pooled site-held-out score is about zero
while its random-split median is about 0.70 ([results/02](../../results/02_every-arm.md)).

## 2. Read the gain with the grouping in mind

A high gain on an input that nearly identifies the group (here the modulus, nine distinct values over
ten sites) is partly the model learning the group. Compare it with an importance measured under the
grouped protocol (the engine's held-out-site resampling importance, [results/06](../../results/06_diagnostics.md)).

## 3. Running a booster outside Python

To run a fitted booster in a browser or another runtime without the XGBoost library:

1. export the trees from `save_raw("json")` as flat arrays;
2. round each split value to 32 bits (`np.float32`, `Math.fround`), and the input to 32 bits before each
   comparison;
3. go left when the input is strictly less than the split value;
4. accumulate the leaves in 32 bits, starting from `base_score`;
5. test the port against the library's own predictions on every row you ship.

`bf.export_arm` does steps 1 and 2, `frontend/src/engine/learned.ts` does 2 to 4 in TypeScript, and
`frontend/test/learned.test.ts` does 5 ([example.py](example.py) runs the comparison in Python and
reports the worst difference, zero).
