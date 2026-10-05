# 02 · scikit-learn

The library behind the random forest, both support-vector arms, the input standardisation, the stacking
meta-learner and the Isolation Forest screen. Pinned at 1.9.0, installed with the engine's `learned`
extra, used only in the bake.

| | |
|---|---|
| Lane | offline |
| Used through | `blastfrag.models` (the arms) and `blastfrag.diagnostics` (the screen and the resampling importance) |
| Pages | [installation](02_scikit-learn/01_installation.md) · [usage here](02_scikit-learn/02_usage.md) · [applying it](02_scikit-learn/03_applying.md) · [example.py](02_scikit-learn/example.py) |

## Why it is here

The 2022 and 2025 sources fit their learners with scikit-learn's estimators and report their
hyperparameters in its terms (`n_estimators`, `random_state`, `C`, `epsilon`, `degree`), so using the
same library is what makes the reproductions exact. It also provides the grouped split
(`LeaveOneGroupOut`) and the Isolation Forest that the diagnostics use.

## What would replace it

For the forest and the kernels, nothing would change the result except numerical details; the
reproductions would no longer be the published estimators, and the portable export, which is written
against scikit-learn's tree layout (`children_left`, `children_right`, `feature`, `threshold`, `value`),
would need a new reader.
