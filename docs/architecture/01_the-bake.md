# The bake

Nine stages, none of them a no-op, ending in a gate that can refuse the whole release.

---

## 1. Why the bake is separate from the deploy

A deployment is not an experiment. The bake is a deliberate, versioned operation that produces
scientific evidence; the deploy verifies that evidence and publishes it. Collapsing the two means a
release has no reproducible artifact behind it, because the numbers were made by whichever runner
happened to pick up the job.

So the deploy workflow runs `python data-pipeline/run.py --validate` and never `run.py`.

## 2. The stages

| Stage | What it does | What would make it a no-op, and does not |
|---|---|---|
| `ingest` | loads a case's blasts through the engine's contract, records provenance and flags | accepting a row that fails the contract |
| `preprocess` | recovers absolute geometry, resolves the rock factor, re-asserts the narrative constraints | reconstructing without checking |
| `dataset` | builds the three split protocols with the leakage guards asserted | trusting the engine's own guards without restating the dependency |
| `feature_extraction` | the seven ratios plus derived absolutes, each arm keeping its own normalisation | unifying two normalisations that are not interchangeable |
| `train` | fits every learned arm on the corpus **minus this case's site** | training on everything and showing the result as a prediction |
| `infer` | every arm over every blast and every variant, abstaining with a reason | returning a number where the model cannot answer |
| `evaluate` | both variance statistics, a null model, bootstrap intervals, the controls | reporting one statistic under a bare label |
| `export` | content-addressed JSON, non-finite floats as null | writing `NaN`, which no browser can parse |
| `validate` | re-reads, re-hashes, re-checks the controls and the abstentions | passing without reading what was written |

## 3. Determinism, and the two claims it actually supports

A bake is a pure function of the case registry, the pinned environment and the seed. That sentence
supports two different claims, and they need two different instruments.

### Within one environment: byte-identical

Two bakes on the same machine produce the same bytes, and the check is a content address, which is
exactly the right instrument for a discrete question.

Three things could break this and each is handled:

- **dictionary ordering** in the serialisation, closed by sorting keys;
- **a wall clock** anywhere in a manifest, which is why the lane gate records budgets and a verdict
  rather than a measured runtime;
- **a stopping rule that depends on CPU speed**, which is why the learned arms stop on a numerical
  criterion rather than a time limit.

A fourth was found late and is worth naming, because nothing would have caught it. `Path.write_text`
translates newlines on Windows, so the same bake wrote the same NUMBERS into files whose BYTES
differed by platform. The digest is taken over the payload rather than over the file, so it never
noticed, and the byte size the manifest declared was wrong on one of the two platforms. Every file
this pipeline ships now goes through one writer that fixes the line ending at LF.

### Across environments: to a tolerance, not to a hash

Re-baking on a different operating system does **not** reproduce the same bytes, and asserting that
it does would be asserting something false.

Two builds of the same pinned numpy reduce a dot product in a different order. The last bits of the
result differ, at a relative scale of about 1e-16, and no version pin can remove that because it is
not a version difference. An iterative solver then amplifies it over its iterations.

This is measured, not assumed. Baking all sixteen cases on Windows and on Linux runners, both on
Python 3.13 with numpy 2.5.3, scikit-learn 1.9.0 and xgboost 3.4.1:

| | |
|---|---|
| two bakes on the same runner | identical, byte for byte |
| worst difference across all sixteen cases | 2.7e-08 relative, on `real-reocin-ug` |
| typical case | 30 to 100 fields differ, worst around 1e-09 |
| `ctrl-degenerate` | identical, byte for byte |

Two details in that table are worth more than the headline number.

`ctrl-degenerate` is the case where every arm abstains, so the artifact contains refusals and no
predictions. It comes out byte-identical. That is the control on the explanation: if the drift were
structural rather than arithmetic, a case with no arithmetic in it would drift too.

And the difference is **not** confined to one arm, which is what a single case first suggested. It is
largest and most consistent on the fitted arms, `published-neural-net` and `refitted-regression`,
then `svr-rbf` and `stacking`. But on `real-soma` and `synth-sweep-burden` the closed forms move as
well, `kuznetsov`, `kuz-ram`, `swebrec` and `crush-zone` among them, because a closed form here is
still evaluated on a reconstructed geometry that is itself several floating-point operations deep.
Every arm whose value passes through a chain of arithmetic can pick up the last bit. Only an arm that
returns a refusal cannot.

So the cross-environment gate compares numbers and names its tolerance: **1e-6 relative**, roughly
two orders above the worst measured difference and five below the percent-scale move a genuinely
different model would make. It is also far finer than anything anyone reads: predictions are exported
rounded to a micrometre and displayed in centimetres.

    python scripts/compare_bakes.py            # every case, every number, against what is committed
    python scripts/compare_bakes.py real-murgul --repeat 2   # byte-identity within this environment

Both run in CI. Both bake into a **sandbox**, never the canonical tree, and that is not incidental: a
check that can overwrite the artifacts it is checking can silently make itself pass, and the failure
mode is a suite that is green because it rewrote the thing it was verifying.

### What this costs, honestly

The published artifacts were baked on one machine, and a reader who re-bakes on another will get
numbers that agree with them to seven or eight significant digits rather than to the last bit. For
every number this product reports that is far past the point of meaning: the corpus itself carries
x50 to two or three significant digits. But it is a real limit on the word "reproducible", and it is
better stated than implied.

## 4. The leakage assertion

The single most important provenance field on this product is `held_out_site`.

For a real campaign, the learned arms are fitted on the corpus **minus that campaign**. The bake then
asserts that none of the case's own blasts appear in its training rows, and that the withheld site is
genuinely absent. A violation raises and the bake stops.

Without it, the App would show a learned model predicting blasts it was fitted on. That is a memory
rather than a prediction, and it looks exactly like a very good model.

For a synthetic case or the out-of-envelope field set, nothing is withheld, because those blasts are
not in the corpus at all. The artifact says so in words rather than leaving the field null and
ambiguous.

## 5. The release gate

`validate` re-reads every artifact from disk and checks:

- the content digest against the one stored inside the file, so a hand-edited artifact fails;
- the same digest against the index entry, so a stale index fails;
- that no artifact contains `NaN`, `Infinity` or `-Infinity`;
- that the index was baked from the same corpus that is installed;
- that the withheld site on each case really is that case's own site;
- that every control block marked with a verdict passed;
- that **every abstaining cell carries a reason**. One unexplained refusal fails the whole bake.

That last one is the rule the product's honesty rests on. A refusal without a reason renders as a
blank cell, and a blank cell is indistinguishable from a missing feature.

## 6. What the bake produces

| | |
|---|---|
| 16 case artifacts | `data/derived/<case>/case.json`, 31 to 101 kB each |
| 16 manifests | `data/derived/manifests/<case>.json` |
| one index | `data/derived/manifests/index.json`, what the web reads first |
| one benchmark | `data/derived/benchmark.json`, the cross-case evidence |

About 1.2 MB in total, 1824 prediction cells, 282 of them refusals.
