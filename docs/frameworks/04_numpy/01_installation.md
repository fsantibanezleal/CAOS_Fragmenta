# numpy: installation

```bash
pip install -r requirements-precompute.txt     # numpy==2.5.4, the bake's exact pin
pip install -r requirements.txt                # numpy==2.5.4, enough to read an artifact
pip install blastfrag==0.3.0                   # pulls numpy as its one dependency
```

The deploy installs `blastfrag` and `numpy` at their exact pins only, read from the requirements files,
to run the artifact check.

```python
import numpy as np
print(np.__version__)   # 2.5.4 for this release's bake
```
