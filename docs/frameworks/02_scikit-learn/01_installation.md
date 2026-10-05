# scikit-learn: installation

It comes with the pinned environment:

```bash
pip install -r requirements-precompute.txt      # scikit-learn==1.9.0 among the exact pins
```

or, outside this product, with the engine's extra:

```bash
pip install "blastfrag[learned]==0.3.0"
```

```python
import sklearn
print(sklearn.__version__)   # 1.9.0 for this release's artifacts
```

A different version can change the last bits of a forest's thresholds or a kernel's dual coefficients,
which the cross-environment check would report against the committed artifacts; bump it only with a
full re-bake ([01_blastfrag/02_usage](../01_blastfrag/02_usage.md), "Upgrading the engine").
