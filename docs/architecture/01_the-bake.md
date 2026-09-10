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

## 3. Determinism

A bake is a pure function of the case registry, the pinned engine version and the seed. Re-running it
on an unchanged tree produces byte-identical artifacts and leaves git clean.

That is asserted in CI rather than asserted in prose: a job re-bakes one case into a **sandbox** and
compares its digest against the committed one. The sandbox matters. A test that can overwrite the
canonical artifacts can silently make itself pass, and the failure mode is a suite that is green
because it rewrote the thing it was checking.

Three things could break determinism and each is handled:

- **dictionary ordering** in the serialisation, closed by sorting keys;
- **a wall clock** anywhere in a manifest, which is why the lane gate records budgets and a verdict
  rather than a measured runtime;
- **a stopping rule that depends on CPU speed**, which is why the learned arms stop on a numerical
  criterion rather than a time limit.

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
