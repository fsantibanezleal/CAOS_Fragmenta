"""The contract tests import the schema registry (contract_schemas.py, beside them) and the pipeline by
path: this repository declares no package. BLAS is set to one thread by tests/conftest.py, which pytest
loads first."""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
for path in (HERE, ROOT / "data-pipeline"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
