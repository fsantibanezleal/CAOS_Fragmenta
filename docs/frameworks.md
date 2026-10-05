# Frameworks

Every library this product runs on, documented the same way: what it is, why it is here and what would
replace it (the node page), then how to install it, how this product uses it, and how to apply it to
other data (the node's folder). The four Python nodes carry a runnable `example.py`, run against the
pinned versions for this release.

## The engine and the training stack (offline)

1. [**01 · blastfrag**](frameworks/01_blastfrag.md): the engine. Models, corpora, protocols, metrics,
   diagnostics, the portable export. Published on PyPI, pinned exactly.
2. [**02 · scikit-learn**](frameworks/02_scikit-learn.md): the forest, the support-vector arms, the
   scaler, the stacking meta-learner, the Isolation Forest.
3. [**03 · XGBoost**](frameworks/03_xgboost.md): the gradient-boosting arm, the stack's dominant
   learner.
4. [**04 · numpy**](frameworks/04_numpy.md): the engine's only hard dependency; the Levenberg-Marquardt
   network, the refit's least squares, the transfer line, the diagnostics.

## The web (in the browser)

5. [**05 · React and the shared app shell**](frameworks/05_react-and-the-shell.md): the six routes, the
   header and footer, theme and language, sub-tabs, equations, citations, the architecture modal.
6. [**06 · uPlot**](frameworks/06_uplot.md): the interactive line and scatter charts.
7. [**07 · three.js**](frameworks/07_three.md): the reconstructed bench in three dimensions.
8. [**08 · KaTeX**](frameworks/08_katex.md): every equation on the documentation pages.
9. [**09 · Vite, TypeScript and the Node test runner**](frameworks/09_vite-and-tests.md): the build, the
   type check, the parity and model tests.
10. [**10 · Playwright**](frameworks/10_playwright.md): the browser gate and the figure export.

## Pinned versions for this release

| Library | Version | Where pinned |
|---|---|---|
| blastfrag | 0.3.0 | `requirements-precompute.txt` (exact) |
| numpy | 2.5.3 | `requirements-precompute.txt` (exact) |
| scikit-learn | 1.9.0 | `requirements-precompute.txt` (exact) |
| xgboost | 3.4.1 | `requirements-precompute.txt` (exact) |
| Python | 3.13 | the bake's environment; CI and the deploy use the same |
| React, react-dom | 19.3 | `frontend/package-lock.json` |
| react-router | 7.18 | `frontend/package-lock.json` |
| @fasl-work/caos-app-shell | 0.6.8 | `frontend/package-lock.json` |
| uPlot | 1.6.32 | `frontend/package-lock.json` |
| three.js | 0.171 | `frontend/package-lock.json` |
| KaTeX | 0.16.47 | `frontend/package-lock.json` |
| Vite | 6.4 | `frontend/package-lock.json` |
| TypeScript | 5.9 | `frontend/package-lock.json` |
| Playwright | 1.56 | `frontend/package-lock.json` |

The Python pins are exact because every number in every artifact came from these versions: bumping
one means re-running the whole bake and committing the artifacts in the same change.

## What the product deliberately does not use

- **No mechanistic simulator** (discrete-element, grain-based or hybrid stress blasting models). No
  engine, licence or reference output was available for this work. A hand-written approximation
  under one of those names would be a fabricated method, so the product states that it has no
  mechanistic tier.
- **No reproduction of the 2025 convolutional hybrid** (Huan et al. 2025). Its optimiser's update rule
  cannot be transcribed with confidence from the copy available; it is cited with its published
  figures.
- **No ONNX Runtime Web.** It has no tree-ensemble kernel, and the forests and the booster are most of
  what the browser runs. The portable export ([architecture/05](architecture/05_portable-models.md))
  replaces it, with fixtures that hold the browser to the fitted models.
- **No server.** Everything that fits runs offline; the site is static ([architecture/04](architecture/04_deploy.md)).
