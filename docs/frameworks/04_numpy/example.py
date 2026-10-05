"""numpy for the measurement: variance explained against the squared correlation, and a cluster
bootstrap that resamples campaigns rather than rows.

    pip install blastfrag==0.3.0
    python docs/frameworks/04_numpy/example.py

Uses the published classical predictions on the 2012 hold-out and the engine's leave-one-site-out
predictions for the classical arm, so it needs no training stack.
"""

from __future__ import annotations

import numpy as np

import blastfrag as bf


def r2_identity(y: np.ndarray, p: np.ndarray) -> float:
    return 1.0 - np.sum((y - p) ** 2) / np.sum((y - y.mean()) ** 2)


def r2_pearson(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.corrcoef(y, p)[0, 1] ** 2)


# 1. The same predictions, two statistics: the published classical column on the 2012 hold-out.
holdout = bf.load_holdout(protocol="2012")
y = np.array([b.x50_m for b in holdout])
p = np.array([b.meta["published"]["kuzram_2012"] for b in holdout])
print(f"2012 hold-out, printed classical column: variance explained {r2_identity(y, p):.3f}, "
      f"squared correlation {r2_pearson(y, p):.3f}")

# 2. A cluster bootstrap over campaigns, on the classical arm's predictions. The arm fits nothing, so
# its prediction for a blast is the same under every split, and these are its held-out predictions.
# The engine draws with its own generator, so its bounds (results/02) differ from these in the second
# decimal; the method is the same.
corpus = bf.load_training_corpus()
arm = bf.Kuznetsov()
rows = [(b.site, b.x50_m, arm.predict_one(b).x50_m) for b in corpus]
rows = [r for r in rows if r[2] is not None]          # the arm abstains where there is no geometry
sites = sorted({r[0] for r in rows})
by_site = {s: np.array([(r[1], r[2]) for r in rows if r[0] == s]) for s in sites}

rng = np.random.default_rng(0)
draws = []
for _ in range(2000):
    pick = rng.choice(sites, size=len(sites), replace=True)
    sample = np.vstack([by_site[s] for s in pick])
    draws.append(r2_identity(sample[:, 0], sample[:, 1]))
low, high = np.percentile(draws, [2.5, 97.5])
all_rows = np.vstack(list(by_site.values()))
print(f"classical arm over {len(all_rows)} blasts: {r2_identity(all_rows[:, 0], all_rows[:, 1]):.3f}, "
      f"site-resampled 95% interval {low:.2f} to {high:.2f}")
