# 03 · XGBoost

The gradient-boosting arm and the stacked ensemble's dominant learner. Pinned at 3.4.1, installed with
the engine's `learned` extra, used only in the bake.

| | |
|---|---|
| Lane | offline; its exported trees run live in the browser |
| Used through | `blastfrag.learned` (`xgboost`, and the stack's booster) |
| Pages | [installation](03_xgboost/01_installation.md) · [usage here](03_xgboost/02_usage.md) · [applying it](03_xgboost/03_applying.md) · [example.py](03_xgboost/example.py) |

## Why it is here

Sui et al. (2025) build their stacked ensemble from a random forest and an XGBoost model and report its
parameters (learning rate 0.5, seed 42) in XGBoost's terms. Reproducing the ensemble needs the same
booster; and because the meta-learner, fitted on in-sample predictions, gives the booster almost all
the weight, the stack's behaviour under every protocol is the booster's
([methods/07](../methods/07_kernels-and-ensembles.md)).

## What would replace it

scikit-learn's `HistGradientBoostingRegressor` would give a different model, not the published one.
The export reads XGBoost's own JSON model (`save_raw("json")`), so a replacement would also need a new
reader.
