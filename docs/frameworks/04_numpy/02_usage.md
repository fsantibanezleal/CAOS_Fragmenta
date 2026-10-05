# numpy: how this product uses it

Through the engine, during the bake and in the deploy's check.

| Where | What numpy does |
|---|---|
| the published network (`blastfrag/learned.py`) | the 7-N-1 forward pass, the Jacobian, and the damped Gauss-Newton step $(J^\top J + \lambda I)\delta = -J^\top r$ solved with `np.linalg.solve`, eight simulations per group ([methods/06](../../methods/06_neural-network.md)) |
| the refitted power law (`blastfrag/models.py`) | ordinary least squares in logarithms with `np.linalg.lstsq`, per stiffness group |
| the transfer line (`blastfrag/models.py`) | $\ln A$ on $\ln \bar E$, one point per training site, with `np.polyfit` |
| the diagnostics (`blastfrag/diagnostics.py`) | the Isolation Forest's input matrix and the held-out-site resampling importance |
| the release gate | through the engine import |

What numpy does **not** do in the engine: the splits (`blastfrag/splits.py`, seeded `random`), the
metrics and the cluster bootstrap (`blastfrag/metrics.py`, `math` and `random`) are plain Python,
short enough to read line by line.

The seed for every random draw is fixed and recorded in the artifact (`seed`), and the network's
seed is drawn before any training, so the order in which models are fitted cannot change their initial
weights.
