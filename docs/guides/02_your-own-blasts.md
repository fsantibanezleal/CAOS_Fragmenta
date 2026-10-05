# Bringing your own blasts

Two routes: the browser, for a design study close to a corpus campaign, and the engine in Python, for
your own data.

## 1. In the browser: the What if tab

Open the App, pick the case closest to your rock (the real campaigns are listed with their rock and
modulus; [cases](../cases.md)), open **What if**, and move the seven controls and the hole diameter to
your design. Every arm answers live, including the learned ones fitted without that case's campaign;
controls that leave the corpus envelope are marked, and so is every prediction made there. Nothing you
enter leaves the browser. Details in [04](04_what-if.md).

What this route cannot do: change the rock factor's source, add your measured size, or score anything.
A changed design has not been fired.

## 2. In Python: the engine

```bash
pip install "blastfrag[learned]==0.3.0"
python docs/frameworks/01_blastfrag/example.py      # the whole walk-through, runnable
```

The page [frameworks/01_blastfrag/03_applying](../frameworks/01_blastfrag/03_applying.md) goes step by
step: building a `Blast` from your ratios, the contract and the extrapolation stamp, which arm needs
what (ratios only, or the absolute pattern and a rock factor), the three rock-factor routes and how far
they disagree on one rock, calibrating the factor on your own measured blasts, running the benchmark on
another corpus, and exporting a fitted model for a browser.

## 3. What to expect from the corpus models at your mine

From this product's benchmark ([relevance](../relevance.md), [results](../results.md)):

- With ten campaigns, no predictor that was not fitted on the corpus itself has a site-resampled
  interval above zero at a campaign it did not see. A prediction from these models at a new mine is a
  starting point for a design study, not a validated number.
- The classical equation's score barely moves between protocols and does not depend on borrowing the
  held-out site's rock factor. It needs your pattern and a rock factor, and the rock factor is the
  largest single uncertainty: calibrate it on blasts you have measured.
- The published regression's score on the corpus is in sample; its out-of-sample evidence is two
  published hold-outs from the same sites.
- The learned models lose most of their random-split score when a whole campaign is held out.

If you have enough measured blasts of your own, fit on them and test by holding out whole campaigns or
periods ([frameworks/02_scikit-learn/03_applying](../frameworks/02_scikit-learn/03_applying.md)).
