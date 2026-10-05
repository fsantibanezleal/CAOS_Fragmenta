"""scikit-learn on grouped data: the published random forest under a random split and under a
whole-campaign hold-out, scored about the identity line, and an Isolation Forest screen.

    pip install "blastfrag[learned]==0.3.0"
    python docs/frameworks/02_scikit-learn/example.py

Uses only scikit-learn and the corpus that ships with blastfrag, so the same lines apply to any table
whose rows come in groups (campaigns, mines, pits, operators).
"""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.model_selection import LeaveOneGroupOut, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import blastfrag as bf

corpus = bf.load_training_corpus()
X = np.array([[getattr(b, f) for f in bf.FEATURES] for b in corpus])
y = np.array([b.x50_m for b in corpus])
sites = np.array([b.site for b in corpus])


def r2_identity(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Variance explained about the 1:1 line (not the squared correlation)."""
    return 1.0 - np.sum((y_true - y_pred) ** 2) / np.sum((y_true - y_true.mean()) ** 2)


def forest() -> object:
    # The 2025 study's final setting: 76 trees, seed 27, on standardised inputs. The scaler is inside
    # the pipeline, so it is fitted on each split's training rows only.
    return make_pipeline(StandardScaler(), RandomForestRegressor(n_estimators=76, random_state=27))


# 1. Random 80/20, repeated: the published protocol, which puts rows of one campaign on both sides.
scores = []
for seed in range(20):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed)
    scores.append(r2_identity(y_te, forest().fit(X_tr, y_tr).predict(X_te)))
print(f"random 80/20, 20 draws: median {np.median(scores):.3f}, range {min(scores):.2f} to {max(scores):.2f}")

# 2. Leave one campaign out, out-of-fold predictions pooled and scored once.
pooled = np.empty_like(y)
for train_idx, test_idx in LeaveOneGroupOut().split(X, y, groups=sites):
    pooled[test_idx] = forest().fit(X[train_idx], y[train_idx]).predict(X[test_idx])
print(f"leave one site out, pooled: {r2_identity(y, pooled):.3f}")
for site in sorted(set(sites)):
    m = sites == site
    print(f"  {site:14s} RMSE {np.sqrt(np.mean((y[m] - pooled[m]) ** 2)):.3f} m  (mean size {y[m].mean():.3f} m)")

# 3. Native importance of the forest fitted on everything: what it leans on.
model = forest().fit(X, y)
importance = model[-1].feature_importances_
print("impurity importance:", ", ".join(f"{f} {v:.2f}" for f, v in zip(bf.FEATURES, importance)))

# 4. An Isolation Forest screen on the inputs and log size, standardised; reported, not applied.
Z = StandardScaler().fit_transform(np.column_stack([X, np.log(y)]))
flags = IsolationForest(n_estimators=500, contamination=5 / 105, random_state=0).fit_predict(Z)
print("flagged:", [b.blast_id for b, f in zip(corpus, flags) if f == -1])
