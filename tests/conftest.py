"""BLAS on one thread for every test, as for the bake: the re-bake tests must run the bake's arithmetic."""

import os

for _variable in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[_variable] = "1"
