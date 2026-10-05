# XGBoost: installation

```bash
pip install -r requirements-precompute.txt      # xgboost==3.4.1 among the exact pins
# or, outside this product:
pip install "blastfrag[learned]==0.3.0"
```

```python
import xgboost
print(xgboost.__version__)   # 3.4.1 for this release's artifacts
```

The wheels bundle the native library for Windows, Linux and macOS on CPython 3.13; no GPU or compiler
is needed for a model this size. As with every pin in the bake, a different version means a full
re-bake and committed artifacts in the same change.
