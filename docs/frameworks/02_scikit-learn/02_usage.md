# scikit-learn: how this product uses it

Only through the engine, during the bake.

| Estimator | Arm or tool | Setting | Source of the setting |
|---|---|---|---|
| `RandomForestRegressor` | `random-forest`, and the stack's forest | 76 trees, `random_state=27` | Sui et al. 2025, final parameters |
| `SVR(kernel="rbf")` | `svr-rbf` | `C=5.25`, `epsilon=0.04` | Amoako et al. 2022, from a 2700-combination search |
| `SVR(kernel="poly")` | `svr-poly` | `degree=5`, `C=1` | Sui et al. 2025 |
| (none: the engine's own) | the standardisation of every scikit-learn and XGBoost arm | mean and population deviation of each split's training rows, the same values `StandardScaler` gives | |
| `LinearRegression` | the stacking meta-learner | on the base learners' in-sample predictions | Sui et al. 2025, as read here ([methods/07](../../methods/07_kernels-and-ensembles.md)) |
| `IsolationForest` | the outlier screen | 500 trees, contamination 5/105, seed 0 | Huan et al. 2025's share ([results/06](../../results/06_diagnostics.md)) |

The network does not use scikit-learn: it is the engine's numpy Levenberg-Marquardt ([04](../04_numpy.md)).

**Impurity importance** (`feature_importances_`) is reported for the forest as its native importance,
next to a held-out-site resampling importance computed by the engine. With nine distinct modulus values
over ten sites, a high impurity importance on the modulus is partly the forest learning the campaign.

**The tree layout** the portable export reads: `tree_.children_left`, `tree_.children_right`,
`tree_.feature`, `tree_.threshold`, `tree_.value`. scikit-learn compares a 32-bit cast of the input with
the threshold, which is why the browser walker rounds its inputs with `Math.fround`
([architecture/05](../../architecture/05_portable-models.md)).
