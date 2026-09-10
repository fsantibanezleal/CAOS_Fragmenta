# data/

Everything the web reads, and nothing it does not.

| Directory | Committed? | What is in it |
|---|---|---|
| `derived/` | yes | the baked artifacts: one JSON per case, one manifest per case, an index, and the cross-case benchmark |
| `derived/manifests/` | yes | provenance, flags, the lane verdict and the controls, per case |
| `raw/` | no | git-ignored. Nothing is here: this product carries no private raw data of its own |
| `examples/` | yes | small inputs for the bring-your-own-blasts guide |
| `samples/`, `artifacts/`, `demo/` | no | part of the frozen layout; unused by this product |

## Where the corpora actually live

Not here. The three real datasets ship inside the **engine package**, `blastfrag`, as package data
with their provenance headers, because they are properties of the published literature rather than of
this product, and because a model and the data it was fitted on should not be able to drift apart.

| Set | Rows | Source |
|---|---|---|
| training corpus | 97 | Hudaverdi, Kulatilake and Kuzu 2010, `doi:10.1002/nag.957` |
| published hold-out | 14 | the union of two published sets, `doi:10.1007/s10706-012-9496-3` |
| field hold-out | 5 | Sui et al. 2025, `doi:10.3390/app15031254`, CC BY |

Numeric values are experimental facts reused with citation. **The source articles are not
redistributed**, and a CI guard fails the build if a PDF is ever committed to this repo.

## The data contract

Two bands, and they are not the same band.

**Contract bounds are rejection.** A Young modulus of 60000 GPa is a unit error, not an unusual
blast. Rejection is loud and names the column, the value and the bound.

**The fitted envelope is the corpus own range.** A row outside it is an extrapolation, admitted only
on an explicit opt-in, and every prediction made on it is stamped and badged on screen.

**Nothing is ever clipped.** A clipped input produces a confident prediction for a design nobody
entered.

Full statement: [`docs/architecture/02_data-contracts.md`](../docs/architecture/02_data-contracts.md).

## The integrity gate

Loading the training corpus reproduces the source paper own descriptive statistics from the shipped
rows, and compares a pinned content digest. The first says the file still is the published table; the
second says it has not moved since it was corrected.

That gate found five transcription defects in the corpus as first assembled, two of them on the
variable being predicted.

## Artifact sizes

About 1.2 MB in total across 16 cases plus the benchmark, 31 to 101 kB per case. Small enough to
commit, which is the point: the evidence and the code that made it live in one place and move
together.
