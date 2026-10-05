"""XGBoost as the 2025 study configured it, its gain importance, and why a port must round to 32 bits.

    pip install "blastfrag[learned]==0.3.0"
    python docs/frameworks/03_xgboost/example.py
"""

from __future__ import annotations

import json

import numpy as np
from xgboost import XGBRegressor

import blastfrag as bf

corpus = bf.load_training_corpus()
X = np.array([[getattr(b, f) for f in bf.FEATURES] for b in corpus])
y = np.array([b.x50_m for b in corpus])
mu, sd = X.mean(axis=0), X.std(axis=0)
Z = (X - mu) / sd

# The published setting: learning rate 0.5, seed 42; the number of trees is not printed, so the
# library default (100) is used, as in the engine.
model = XGBRegressor(learning_rate=0.5, random_state=42).fit(Z, y)
fit = model.predict(Z)
print(f"training fit, variance explained: {1 - np.sum((y - fit) ** 2) / np.sum((y - y.mean()) ** 2):.3f}")

gain = model.get_booster().get_score(importance_type="gain")
total = sum(gain.values())
print("gain importance:", ", ".join(f"{bf.FEATURES[int(k[1:])]} {v / total:.2f}" for k, v in gain.items()))

# Walk the first tree by hand. XGBoost compares a 32-bit input with a 32-bit split value, and its JSON
# prints split values as short decimals that parse to nearby 64-bit floats. A walker that compares in
# 64 bits can take the other branch when an input sits on a split value; rounding both to 32 bits
# (np.float32 here, Math.fround in a browser) reproduces the library.
tree = json.loads(model.get_booster().save_raw("json"))["learner"]["gradient_booster"]["model"]["trees"][0]
left, right = tree["left_children"], tree["right_children"]
feature, split = tree["split_indices"], tree["split_conditions"]


def walk(z: np.ndarray, bits: int) -> float:
    cast = np.float32 if bits == 32 else np.float64
    node = 0
    while left[node] != -1:
        node = left[node] if cast(z[feature[node]]) < cast(split[node]) else right[node]
    return split[node]


disagree = sum(walk(z, 32) != walk(z, 64) for z in Z)
print(f"first tree: 64-bit and 32-bit walks disagree on {disagree} of {len(Z)} blasts")

# The engine's export does all of this, and its reference walker matches the library exactly.
arm = bf.default_arms()["xgboost"]().fit(corpus)
document = bf.export_arm(arm)
worst = max(abs(bf.predict_portable(document, b)[0] - arm.predict_one(b).x50_m) for b in corpus)
print(f"portable export against the fitted booster, worst difference over the corpus: {worst:.1e} m")
