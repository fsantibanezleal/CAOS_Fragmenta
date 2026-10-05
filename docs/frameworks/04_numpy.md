# 04 · numpy

The engine's only hard dependency, pinned at 2.5.3. The published network and its Levenberg-Marquardt
training, the refitted power law's least squares, the transfer line and the diagnostics are written on
it; the splits,
the metrics and the bootstrap are plain Python (`random`, `math`) in the engine, and numpy is the
shortest way to reproduce them on other data ([applying it](04_numpy/03_applying.md)).

| | |
|---|---|
| Lane | offline; also the deploy's artifact check (the engine imports it) |
| Used through | `blastfrag` throughout; the network in `blastfrag.learned` |
| Pages | [installation](04_numpy/01_installation.md) · [usage here](04_numpy/02_usage.md) · [applying it](04_numpy/03_applying.md) · [example.py](04_numpy/example.py) |

## Why it is here

The published network is trained with Levenberg-Marquardt, which no mainstream Python neural-network
library provides; substituting gradient descent would not be the published method. Writing it in numpy
keeps it exact and inspectable, with a hand-derived Jacobian that the engine's tests check against a
central finite difference. Keeping the core on numpy alone also means the closed forms, the corpora,
the protocols and the release gate run without the training stack, which is what lets the deploy check
the artifacts in about a second.

## What would replace it

Nothing at this scale. A different numpy build can change the last bits of a reduction, which is why
the cross-environment check compares to a 1e-6 tolerance ([architecture/01](../architecture/01_the-bake.md)).
