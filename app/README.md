# app/, the dormant backend

**This product does not require a request-time backend, and this directory says so rather than
being absent**, so that the repo layout is the same as every other product in this line and a
reviewer knows where to look if one is ever added.

Everything Fragmenta serves is either a committed artifact or a closed-form model small enough to
run in the browser. There is no server state, no auth-gated data and no request-time compute, which
are the three triggers that would justify activating this module.

The module still imports cleanly, and `tests/contracts/test_api.py` keeps it that way and holds it to
`docs/contracts/api.openapi.json` (catalog row `api`), so it does not rot while unused. It serves the committed
documents unchanged, GET only:

| Route | Serves | Answers |
|---|---|---|
| `/api/cases` | the index | 200, or 503 with state `missing` |
| `/api/cases/{case_id}/manifest` | one manifest | 200, 404 unknown case, 503 |
| `/api/artifacts/{path}` | a case artifact an indexed case lists | 200, 404, 503 |
| `/api/models/{scope}` | the models file of an indexed scope | 200, 404, 503 |
| `/api/benchmark` | the benchmark | 200, or 503 |
| `/api/readiness` | the readiness document, with the `api` row set to available | 200, or 503 |
| `/health`, `/healthz` | liveness | 200 |

A document that is absent or unreadable is a declared 503 (`{"detail": {"state": "missing", "reason": {...}}}`), never an
empty body that looks like data. `DATA_DIR` selects the tree (default `data/derived`; the provider tree is
`docs/contracts/fixtures/data/derived`). The pinned versions are in `requirements-api.txt`; the lane is never deployed.
