# Frameworks

What this product depends on, and what it deliberately does not.

## What it uses

| | Role |
|---|---|
| `blastfrag` | the engine: every model, the corpora, the split protocols, the metric suite. A separate published repo, pinned by tag. |
| numpy | the only hard dependency of that engine |
| scikit-learn, xgboost | the learned tier, in the heavy lane only, never at deploy |
| React, uPlot, three.js, KaTeX | the web surface |
| the shared app shell | header, footer, theme, language, tabs, citations, the architecture modal |

The engine being a separate repo is the point rather than an accident. A product declares no package
of its own, so anything a third party could use to predict blast fragmentation without caring about
Fragmenta belongs upstream. Keeping that boundary strict is what stops this repo growing a private
copy of the science that nobody else can check.

## What it does not use, and why that is a decision

**No discrete-element, grain-based or hybrid stress blasting model.** These are mechanistic
simulations of rock breakage and they would be the strongest tier this product could have. No engine,
no licence and no reference output was available for this work. A hand-rolled approximation shipped
under one of those names would be a fabricated method rather than a cheap version of a real one, and
the product says it has no mechanistic tier instead.

**No reproduction of the 2025 convolutional hybrid.** It reports strong figures on a superset of this
corpus. Its optimiser update rule is not transcribable with confidence from the copy available, so it
is cited as prior art with its published numbers, attributed, and is not a model of this product.

**No non-ideal detonics, no flyrock, no ground vibration, no comminution model.** Each is a real
discipline that this one feeds or is fed by, and none of them is modelled here.

**No serialised model file.** The learned models are trained during the bake and their predictions
are what ships. A serialised forest would be a second source of truth with nothing checking it
against the first. The models the browser does run are the closed forms, and those have a parity
gate; a checkpoint with no equivalent gate would not.
