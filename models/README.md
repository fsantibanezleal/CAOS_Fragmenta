# models/, empty on purpose

**No exported model file ships with this product**, and that is a decision rather than an omission.

The learned models are trained during the bake and their PREDICTIONS are what the web reads, baked
into the per-case artifacts. Shipping a serialised forest as well would give a reader a second
source of truth that nothing checks against the first.

The models the browser does run are the closed-form ones, reimplemented in
`frontend/src/engine/live.ts` and gated against the baked numbers by `frontend/test/parity.test.ts`.
That gate is what makes a second implementation safe; a serialised checkpoint with no equivalent
gate would not be.
