# Fragmenta documentation

The wiki. Written alongside the code, not bolted on afterwards.

| Theme | Contents |
|---|---|
| [Architecture](architecture.md) | the lanes, the two data contracts, the bake, the deploy |
| [Cases](cases.md) | the sixteen cases, why each one is in the matrix, and the four controls |
| [Frameworks](frameworks.md) | what this product depends on and what it deliberately does not |
| [Guides](guides.md) | running the bake, bringing your own blasts, reading a number honestly |

## Where the science is

Not here. It lives in **[blastfrag](https://github.com/fsantibanezleal/CAOS_BlastFrag)**, a
separately published package this product pins and consumes, whose own `docs/` derives every model
term by term from a primary source.

A product declares no package of its own. Anything a third party could use to predict blast
fragmentation without caring about Fragmenta belongs upstream, and keeping the boundary honest is
what stops this repo growing a private copy of the science that nobody else can check.

## The one-paragraph version

With a whole campaign held out, not one of the six learned models explains any variance. The only
two that transfer to an unseen site are the two whose coefficients are fixed rather than fitted, and
the classical model gets *better* under the honest protocol because it has nothing to overfit. The
gap between a random split and a site-held-out split has a median of 0.88 across the learned models.

That is the product. Everything else here is the apparatus that makes the claim checkable.
