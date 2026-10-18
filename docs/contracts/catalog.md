# Contract catalog: Fragmenta

Phase 2 of contract-first parallel delivery (ADR-0080; rule 11 sections 11 to 20 in CAOS_MANAGE), on the base of
CAOS_PRODUCT_TEMPLATE 0.08.002. One row per boundary. Each schema file is the single source of its contract: the Python
producers validate against it before they write (`data-pipeline/pipeline/stages/export.py`) and in their tests, the
consumers read the documents it describes, and the TypeScript types are to be generated from it, through
`docs/contracts/api.openapi.json`, whose components reference the schema files (the generation and the consumer tests
of the interface are the next unit). A change to a contract bumps its row's version and updates both sides in one pull
request.

Checks: `python scripts/check_contracts.py docs/contracts/catalog.md --repo-root .` (every field, every path) and
`python scripts/check_skeleton.py docs/contracts/catalog.md` (exit 2 lists the rows still served by a provider; allowed
while a product is being built, never at a release). The readiness document (`data/derived/readiness.json`) is computed
from this file; editing the catalog makes it stale until `python data-pipeline/run.py readiness` runs again
(`scripts/check_readiness.py` fails meanwhile). `python scripts/check_documents.py` validates every committed document
against its schema file.

Versions and history: a contract's version moves with its schema, by semver (a removed or renamed field, a narrowed
type or a new required field is major; a new optional field is minor; a description or example change is patch), and
every version has a row in the History section below, whose `kind` is the semver step from the contract's previous row
(the first row is `initial`). `docs/contracts/versions.lock.json` holds each schema's version and digest (line endings
normalised to LF); `python scripts/check_contract_versions.py` fails when a schema changed under the same version, when
a version went down, when the lock is not current with the catalog, or when a row has no History entry for its current
version. After a deliberate bump and its History row, run `python scripts/check_contract_versions.py --update` and
commit the lock with the schema and both sides in one pull request.

The lock alone is trusted by that offline check, so a schema change with the lock edited by hand passes it. CI therefore
also runs `python scripts/check_contract_versions.py --base <ref>` (the push's `before` SHA, or `origin/develop`, on a
checkout with `fetch-depth: 0`; a ref it cannot resolve fails, it never passes silently). Against the schemas and the
catalog at that ref it fails when a schema changed and its version is not above the ref's, when the version goes down,
when a change that is breaking by the mechanical floor did not take a major step, and when a contract that had a schema
at the ref has none now without a `major` History row that records the removal. A contract with no row at the ref is a
first release. The mechanical floor is a minimal JSON Schema diff: a removed property, definition or enum value, a
property newly required, a changed const, a narrowed type, an added or tightened bound, pattern or format,
`additionalProperties` turned false or constrained, an added constraint on `items`, `not` or `$ref`, a removed `anyOf` or
`oneOf` alternative, an added `allOf` member, and for the OpenAPI file a removed path, operation, response or component.
It is the floor and not the judgement: a reviewer still decides the semantic breaks it cannot see (a changed meaning, a
unit, a default value), and a pull request that changes a contract states its step in the review.

Where Fragmenta's schemas depart from the TypeScript mirror (`frontend/src/lib/contract.types.ts`), the committed
documents win: a field is required when every committed document carries it and the code that writes it always writes it,
whatever the mirror marks optional. The mirror is replaced by generated types in the next unit.

## Contracts

| id | version | owner | schema file | example | producer test | consumer test | missing-data behavior | provider | model io | swap test | status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| blast-record | 1.0.0 | data-pipeline/pipeline/io/contract.py | docs/contracts/schemas/blast-record.schema.json | docs/contracts/examples/blast-record.json | tests/contracts/test_blast_record.py::test_corpus_rows_validate_and_are_accepted_by_contract_1 | tests/contracts/test_blast_record.py::test_adversarial_schema_and_contract_reject_the_same_rows | partial: a row outside a contract bound or missing a column is rejected with its reason (never clipped) and the bake goes on with the accepted rows. missing: the engine's corpus cannot be loaded, the bake stops before it writes anything; the static site never reads this row | fixture:docs/contracts/examples/blast-record.json | - | tests/contracts/test_blast_record.py::test_the_example_validates_and_is_a_corpus_row | real |
| case-index | 1.0.0 | data-pipeline/pipeline/pipeline.py | docs/contracts/schemas/case-index.schema.json | docs/contracts/fixtures/data/derived/manifests/index.json | tests/contracts/test_documents.py::test_index_validates | frontend/src/lib/contract.test.ts, frontend/test/parity.test.ts | missing: the site build stops at copy-data (no site without an inventory), the API answers 503 missing, readiness says missing. stale: app_version older than VERSION; readiness says stale with both versions and the views show it | fixture:docs/contracts/fixtures/data/derived/manifests/index.json | - | tests/contracts/test_documents.py::test_every_root_passes_the_cross_field_rules | real |
| case-manifest | 1.0.0 | data-pipeline/pipeline/pipeline.py | docs/contracts/schemas/case-manifest.schema.json | docs/contracts/fixtures/data/derived/manifests/fx01-fixture.json | tests/contracts/test_documents.py::test_manifests_validate | frontend/src/lib/contract.test.ts | partial: a manifest the index lists is absent; readiness lists its path, the case selector marks the case not available yet and the other cases work, the API answers 404 for it. stale: as case-index | fixture:docs/contracts/fixtures/data/derived/manifests/fx01-fixture.json | - | tests/contracts/test_documents.py::test_every_root_passes_the_cross_field_rules | real |
| case-artifact | 1.0.0 | data-pipeline/pipeline/stages/export.py | docs/contracts/schemas/case-artifact.schema.json | docs/contracts/fixtures/data/derived/fx01-fixture/case.json | tests/contracts/test_documents.py::test_artifacts_validate | frontend/src/lib/contract.test.ts, frontend/test/parity.test.ts | partial: an artifact the index lists is absent; readiness lists its path and that case's views show not available yet with the reason, the API answers 404 for it. stale: as case-index | fixture:docs/contracts/fixtures/data/derived/fx01-fixture/case.json | - | tests/contracts/test_documents.py::test_every_root_passes_the_cross_field_rules | real |
| models-file | 1.0.0 | data-pipeline/pipeline/stages/models.py | docs/contracts/schemas/models-file.schema.json | docs/contracts/fixtures/data/derived/models/Fixture.json | tests/contracts/test_documents.py::test_models_files_validate | frontend/src/lib/contract.test.ts, frontend/test/learned.test.ts | partial: a models file the index lists is absent; readiness lists its path and the What-if tab keeps the closed-form arms and says the fitted arms are not available yet for that scope, the API answers 404 for it. stale: as case-index | fixture:docs/contracts/fixtures/data/derived/models/Fixture.json | - | tests/contracts/test_documents.py::test_every_root_passes_the_cross_field_rules | real |
| benchmark | 1.0.0 | data-pipeline/pipeline/stages/benchmark.py | docs/contracts/schemas/benchmark.schema.json | docs/contracts/fixtures/data/derived/benchmark.json | tests/contracts/test_documents.py::test_benchmark_validates | frontend/src/lib/contract.test.ts, frontend/test/parity.test.ts | missing: the Benchmark page, the Introduction facts and the documentation pages that read the benchmark say not available yet with the reason, never an empty chart; the API answers 503 missing, readiness says missing. stale: as case-index | fixture:docs/contracts/fixtures/data/derived/benchmark.json | - | tests/contracts/test_documents.py::test_every_root_passes_the_cross_field_rules | real |
| readiness | 1.0.0 | data-pipeline/pipeline/core/readiness.py | docs/contracts/schemas/readiness.schema.json | docs/contracts/fixtures/data/derived/readiness.json | tests/contracts/test_readiness.py::test_committed_readiness_is_current | frontend/src/readiness/readiness.test.ts, frontend/src/lib/contract.test.ts, tests/contracts/test_api.py::test_responses_match_the_openapi_document | missing: the site build stops at copy-data; if the document cannot be loaded at run time the views keep working and each says readiness unknown; the API answers 503 missing | fixture:docs/contracts/fixtures/data/derived/readiness.json | - | tests/contracts/test_documents.py::test_fixture_tree_validates | real |
| api | 1.0.0 | app/ | docs/contracts/api.openapi.json | docs/contracts/examples/api-unavailable.json | tests/contracts/test_api.py::test_responses_match_the_openapi_document | frontend/src/lib/contract.test.ts, tests/contracts/test_api.py::test_adversarial_503_when_documents_are_absent | missing: a document a route serves is absent, the API answers 503 with state missing and the reason (never an empty body); an unknown case, scope or artifact is 404. The static readiness says missing for this row while the API lane is dormant; /api/readiness says available | fixture:docs/contracts/fixtures/data/derived | - | tests/contracts/test_api.py::test_swap_fixture_tree_and_bake | real |

## Missing-data states

One vocabulary for every row (ADR-0080 decision 3). `data-pipeline/pipeline/core/readiness.py` computes each row's
state from this catalog and the repository; the frontend and the API show it. Rules, applied in this order, first
match wins:

| Row kind | Condition | state | provenance | reason en | reason es |
|---|---|---|---|---|---|
| any | the catalog `status` is `active` | `provider` | the provider kind | Served by its provider ({provider}); the real producer is not built yet. | Lo sirve su proveedor ({provider}); el productor real aún no está construido. |
| case-index, case-manifest, case-artifact, models-file, benchmark | `data/derived/manifests/index.json` is absent | `missing` | null | The pipeline has not baked this build. | El pipeline no ha generado esta versión. |
| case-manifest | a manifest the index lists is absent | `partial` | `real` | {n} of {total} manifests are absent. | Faltan {n} de {total} manifiestos. |
| case-artifact | an artifact the index lists is absent | `partial` | `real` | {n} of {total} artifacts are absent. | Faltan {n} de {total} artefactos. |
| models-file | a models file the index lists is absent | `partial` | `real` | {n} of {total} models files are absent. | Faltan {n} de {total} archivos de modelos. |
| benchmark | `data/derived/benchmark.json` is absent | `missing` | null | The benchmark has not been baked. | El benchmark no se ha generado. |
| case-index, case-manifest, case-artifact, models-file, benchmark | the index `app_version` differs from `VERSION` | `stale` | `real` | Baked by {app_version}; the product is {version}. | Generado por {app_version}; el producto es {version}. |
| api | always, in the static document | `missing` | null | The API lane is dormant; the site reads the committed documents. | La API está inactiva; el sitio lee los documentos versionados. |
| any | otherwise | `available` | `real` | null | null |

The `status` column holds `real` or `active` only, in lower case; any other value fails the readiness computation (and so
`scripts/check_readiness.py`), because a status the rules do not know would be published as real. `{provider}` is
the row's provider cell (`kind:path`); `{n}`, `{total}`, `{app_version}` and `{version}` are
filled from the repository. `missing` is a list of strings, non-empty exactly when the state is `partial`: the
absent paths relative to `data/derived/` (manifests, artifacts, models files), sorted. The index carries two versions:
`app_version` is the product that baked it, compared with `VERSION`, and `engine_version` is the pinned `blastfrag`,
which never makes a bake stale. `blast-record` has no rule of its own: the corpus belongs to the engine, so the row is
`available` unless its status says otherwise. `/api/readiness` returns the committed document with the `api` row set to
status `real`, state `available`, provenance `real`, reason null. What each surface does:

| state | the frontend shows | the API answers |
|---|---|---|
| `available` | the result | 200 |
| `partial` | the result for what exists; each absent case or file says not available yet | 200 for what exists, 404 for the absent paths |
| `stale` | the result and a note with the version that baked it | 200 |
| `provider` | the result and a note naming the provider kind | 200 |
| `training` | the result and a note naming the model that answered, and that a newer one is training (or that none is released); Fragmenta has no model slot, so no row takes this state | 200 |
| `missing` | an explicit not available yet with the reason, never an empty chart | 503 with `{"detail": {"state": "missing", "reason": {...}}}` |

A `partial` bake builds: `frontend/copy-data.mjs` and `scripts/check_artifacts.py` accept an absent
manifest, artifact or models file only when the readiness document lists it in the `missing` of a `partial` row (and the
readiness is current, `scripts/check_readiness.py`); any other absent file stops them.

## Providers

- `docs/contracts/fixtures/data/derived/`: a provider tree in the layout of `data/derived/` (one case,
  `fx01-fixture`, derived from `real-murgul` and cut to three blasts; its manifest and artifact; one models file,
  `Fixture`, with the seven arms cut to a few trees and support vectors; a small benchmark; the index; and a readiness
  document that says `provider` for every row but `api`, which is dormant and so `missing`). It is generated once by
  `data-pipeline/pipeline/core/fixture_tree.py` from the committed documents, so it validates against the same schemas.
  The frontend can build on it with `CAOS_DATA_ROOT=docs/contracts/fixtures/data/derived` (a walking skeleton before any
  bake), the API serves it with `DATA_DIR=docs/contracts/fixtures/data/derived`, and the contract tests run against it and
  against `data/derived/` with the same assertions (the swap tests).
- `docs/contracts/examples/blast-record.json`: the first row of the published corpus, for contract 1.
- `docs/contracts/examples/api-unavailable.json`: the body of a 503 with the state `missing`.

A provider is scaffolding: labelled on every surface by the readiness document, never counted as done for the unit
that owes the real producer. The fixture tree's numbers are cut from real ones and are not a fitted model of anything.

## History

One row per version of every contract, newest last within a contract. `kind` is initial, major, minor or patch, per
the rules above. Fragmenta's contracts were kept by hand until 2026-10-16 (`io/contract.py` for the corpus rows and
`frontend/src/lib/contract.types.ts` for the documents); an earlier shape of a contract is not reconstructed.

| contract | version | date | change | kind |
|---|---|---|---|---|
| blast-record | 1.0.0 | 2026-10-16 | one corpus row as contract 1 accepts it: id, site, the seven features within the engine's contract bounds | initial |
| case-index | 1.0.0 | 2026-10-16 | the index of cases, the benchmark and the models files (`fragmenta.index/v1`) | initial |
| case-manifest | 1.0.0 | 2026-10-16 | the per-case manifest with lane verdict, controls and flags (`fragmenta.manifest/v1`) | initial |
| case-artifact | 1.0.0 | 2026-10-16 | the per-case artifact: blasts, predictions of 14 arms, scores, distributions, controls (`fragmenta.case/v1`) | initial |
| models-file | 1.0.0 | 2026-10-16 | the fitted arms of one training scope in the engine's portable format (`fragmenta.models/v1`) | initial |
| benchmark | 1.0.0 | 2026-10-16 | the cross-case benchmark with protocols, verdict and diagnostics (`fragmenta.benchmark/v3`) | initial |
| readiness | 1.0.0 | 2026-10-16 | what is real in a build, row by row, in one of six declared states (`fragmenta.readiness/v1`) | initial |
| api | 1.0.0 | 2026-10-16 | the dormant read-only API, GET only, 503 with the declared state when a document is absent | initial |
