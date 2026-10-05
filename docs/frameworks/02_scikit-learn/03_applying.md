# scikit-learn: applying it to grouped data

The lesson this product's benchmark carries for any table whose rows come in groups (campaigns, mines,
pits, shifts, operators): split by group, put every fitted step inside the split, and score the pooled
out-of-fold predictions about the identity line. [example.py](example.py) does it on the corpus with
plain scikit-learn and reproduces the engine's site-held-out forest score (-0.231) and per-site errors.

## 1. Every fitted step inside the split

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor

def model():
    return make_pipeline(StandardScaler(), RandomForestRegressor(n_estimators=76, random_state=27))
```

A scaler fitted on all rows before splitting leaks the test rows' mean and spread into training.

## 2. Hold out whole groups, pool, score once

```python
import numpy as np
from sklearn.model_selection import LeaveOneGroupOut

pooled = np.empty_like(y)
for train, test in LeaveOneGroupOut().split(X, y, groups=sites):
    pooled[test] = model().fit(X[train], y[train]).predict(X[test])

r2_identity = 1 - np.sum((y - pooled) ** 2) / np.sum((y - y.mean()) ** 2)
```

Use `GroupKFold` when there are many groups. Scoring the pooled predictions once, rather than averaging
per-fold scores, weights each row equally and avoids a per-fold $R^2$ on a few rows of one group.

## 3. Report the spread of a random split, not one draw

```python
from sklearn.model_selection import train_test_split
scores = [r2(y_te, model().fit(X_tr, y_tr).predict(X_te))
          for X_tr, X_te, y_tr, y_te in (train_test_split(X, y, test_size=0.2, random_state=s) for s in range(100))]
```

On this corpus the 5th to 95th percentiles of a random 80/20 score lie between 0.35 and 1.35 apart
across the learned arms ([results/02](../../results/02_every-arm.md)); one draw from that range is not
a result.

## 4. Do not use `r2_score` as the only statistic, and do not use `pearsonr` as R2

`sklearn.metrics.r2_score` is variance explained about the identity line, which is right; the squared
Pearson correlation that much of the literature calls R2 is not. Report both, named
([protocols/01](../../protocols/01_metrics.md)).

## 5. Screen, do not filter

```python
from sklearn.ensemble import IsolationForest
flags = IsolationForest(n_estimators=500, contamination=5/105, random_state=0).fit_predict(Z)
```

Report the flagged rows by group. Removing them flatters every score, and an unusual row within the
training groups is the kind of row a model meets at a new one.
