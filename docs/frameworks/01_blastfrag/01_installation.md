# blastfrag: installation

```bash
pip install blastfrag==0.3.0              # core: numpy only; closed forms, corpora, protocols, metrics
pip install "blastfrag[learned]==0.3.0"   # adds scikit-learn and xgboost for the learned arms
```

For this product, use the pinned environment rather than a bare install, because the artifacts were
baked with exact versions of the whole stack:

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements-precompute.txt   # Windows; .venv/bin/pip elsewhere
```

`scripts/setup.ps1` and `scripts/setup.sh` do the same and also install the frontend.

**Check the install.**

```python
import blastfrag as bf
print(bf.__version__)                         # 0.03.000 for the 0.3.0 release
print(bf.datasets.DATASET_DIGEST[:16])        # the corpus digest the benchmark records
bf.check_source_integrity(bf.load_training_corpus())   # raises if the corpus is not the published table
```

The engine's version string follows the CAOS `X.XX.XXX` format (`0.03.000`); the PyPI version is the
same release written as `0.3.0`.
