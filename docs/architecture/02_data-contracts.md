# The two data contracts

Where the contracts sit in the system. The field-level contract (fields, units, bounds, envelope,
missing values, outliers, artifact schemas, release-gate checks) is in
[data/04](../data/04_data-contract.md); this page is about the boundaries.

![The two data contracts](../assets/arch-05-data-contracts.svg)

---

## 1. Contract 1 is the engine's

The ingestion contract lives in `blastfrag`, not here: `validate_blast`, `CONTRACT_BOUNDS`,
`TRAINING_ENVELOPE` and the integrity gate on the corpus. The bounds are properties of the published
corpus, and keeping them next to the models means a model and its admissible inputs are versioned
together. This product calls the contract at `ingest` and never relaxes it; a case that wants
out-of-envelope rows (the field set) opts in explicitly, and its predictions are stamped.

## 2. Contract 2 is this product's

The artifacts are this product's interface between the bake (Python) and the web (TypeScript):

```
bake (Python)  ──writes──>  data/derived/**  ──copied at build──>  frontend/public/data/**  ──fetched──>  browser
                              digests in the index                    presence checked                    typed mirror
```

Three places hold it:

1. **The writer** (`data-pipeline/pipeline/core/jsonio.py`, `stages/export.py`, `stages/models.py`,
   `stages/benchmark.py`): sorted keys, LF endings, no non-finite floats, a content digest in every file.
2. **The generated types** (`frontend/src/lib/contract.gen.ts`, generated from the schema files through
   `docs/contracts/api.openapi.json`; `frontend/src/lib/contract.types.ts` holds the product's names as aliases of
   them). `npm run build` fails when the generated file is not current, and `frontend/src/lib/contract.test.ts`
   reads every committed document against its schema, so a renamed field fails instead of rendering an empty chart.
3. **The checks**: the release gate (`stages/validate.py`, also run by the deploy through
   `scripts/check_artifacts.py`) and the build's copy step (`frontend/copy-data.mjs`), which fails if a
   case or a models file the index declares did not ship.

## 3. The catalog and readiness

Every boundary, and not only these two, is a row of the contract catalog ([`docs/contracts/catalog.md`](../contracts/catalog.md)):
eight rows (blast-record, case-index, case-manifest, case-artifact, models-file, benchmark, readiness and api), each with
one JSON Schema file, an example, a producer test, a consumer test and its missing-data behavior. The export validates
every document against its schema before it writes it. `data/derived/readiness.json` is computed from the catalog and
says, row by row, which of six states the build is in (available, partial, stale, provider, training, missing); the views
label what is not the real, current document and show not available yet for what is absent. Since 2.0.0 of the case
artifact and the benchmark, every reason in them is a text in both languages.

## 4. Why the integrity gate sits behind contract 1

Contract 1 checks that each value could be a blast; it cannot tell a wrong digit from a right one. The
integrity gate compares the whole table with the source's own summary statistics and a pinned digest,
which is how five transcription defects were found ([data/01](../data/01_corpus.md)). The two answer
different questions: the statistics say the file is the published table, the digest says it has not
moved since it was corrected.
