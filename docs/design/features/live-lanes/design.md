# Design: the live lanes in the browser

Retroactive. `frontend/src/engine/live.ts` is a port of the engine's closed forms (the mean size, the uniformity
index, the curves, the regressions, the router, the geometry). `frontend/src/engine/learned.ts` walks the
`fragmenta.models/v1` files: trees as four arrays with single-precision inputs, the network with its scalers and
clamp, the kernels with their support vectors. Both are tested against the committed artifacts, not fixtures of
their own, because the artifacts are what the site serves. The page is `docs/architecture/03_lanes.md` and
`docs/architecture/05_portable-models.md`.
