# Fragmenta notebooks

Didactic notebooks for the blast-fragmentation test bench, in two trees that hold the same notebooks: [`en/`](en/README.md) in English and
[`es/`](es/README.md) in Spanish. They teach, step by step and on the product's own data, how the engine's methods work, where each stands against the
state of the art, and what the product adds beyond it. The methods live in the engine, the PyPI package
[`blastfrag`](https://pypi.org/project/blastfrag/) (pinned `0.4.0`), and in the named pipeline `data-pipeline/`; a notebook imports them and never
re-implements them.

Los notebooks didácticos del banco de pruebas de fragmentación por voladura, en dos árboles que contienen los mismos notebooks: [`en/`](en/README.md) en inglés y
[`es/`](es/README.md) en español. Enseñan, paso a paso y sobre los datos del propio producto, cómo funcionan los métodos del motor, dónde está cada uno
frente al estado del arte y qué aporta el producto más allá de él. Los métodos viven en el motor, el paquete de PyPI
[`blastfrag`](https://pypi.org/project/blastfrag/) (fijado en `0.4.0`), y en el pipeline `data-pipeline/`; un notebook los importa y nunca los reimplementa.

## What the set covers

Six topics, from simple to complex. Each topic has a fundamentals notebook and a method notebook, and some add a state-of-the-art and a beyond-the-state-of-the-art one.

| Topic | Question | Levels |
|---|---|---|
| `01-the-data` | What are the 97 blasts, how is their geometry recovered, and what keeps the table honest? | 1, 2, 4 |
| `02-classical-prediction` | How does the classical mean-size equation work, where does its one free number come from, and how much of its score is borrowed? | 1, 2, 3, 4 |
| `03-size-distribution` | How is a mean size turned into a curve a crusher can be specified against? | 1, 2 |
| `04-benchmark-protocol` | How is a prediction judged on blasts the model has not seen, and what does a published score look like inside its own protocol? | 1, 2, 3, 4 |
| `05-learned-arms` | What do the learned arms do on a campaign they have not seen, why does each refuse where it does, and what is the published network worth? | 1, 2, 3 |
| `06-design-response` | How does a prediction respond when the design changes, and how does the browser compute it live? | 1, 2, 4 |

Levels: 1 fundamentals, 2 the method in practice, 3 state of the art, 4 beyond the state of the art. The index of each tree lists every notebook, what it
teaches and the reason a topic has no state-of-the-art notebook.

## Cubre el conjunto

Seis temas, de simple a complejo. Cada tema tiene un notebook de fundamentos y uno del método, y algunos suman uno de estado del arte y otro más allá del estado del arte.
Los niveles son los mismos: 1 fundamentos, 2 el método en la práctica, 3 estado del arte, 4 más allá del estado del arte. El índice de cada árbol lista cada notebook,
qué enseña y la razón por la que un tema no tiene notebook de estado del arte.

## How to run them

Every number a notebook prints is read from a committed artifact under `data/derived/` or computed by the engine in that run; nothing is typed in.
The notebooks run from their own folder, so the repository root is three levels up, and no path is absolute.

```bash
python -m venv .venv-notebooks
.venv-notebooks/bin/pip install -r notebooks/requirements.txt     # .venv-notebooks/Scripts/pip on Windows
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1    # one BLAS thread: the network trains faster and the numbers are reproducible
```

The pins in `requirements.txt` are exactly those of the bake (`requirements-precompute.txt`) plus the plotting library and the notebook runtime, so a
notebook reproduces the committed numbers. Open a notebook in Jupyter or VS Code with that environment's kernel to read and rerun it step by step.

The outputs are committed, so the notebooks read as finished material on GitHub. They are written only by the runner of the template (`run_notebooks.py`,
which executes each notebook top to bottom in a fresh kernel and strips the volatile metadata), never by hand; its `--check` mode executes copies under a temp root the
caller names (`--tmp <temp root>` or `CAOS_TEMP_ROOT`; without one it stops with exit 2) and fails on a notebook that errors or whose committed outputs
differ from a fresh run. It is a local release gate and never runs in CI. `blastfrag` is the product's method package (`product.json`
`method_packages`): `scripts/check_notebooks.py` fails a cell that defines a function or a class `blastfrag` defines, and `--pypi` confirms its pin is
published.

## Cómo ejecutarlos

Cada número que imprime un notebook se lee de un artefacto versionado bajo `data/derived/` o lo calcula el motor en esa ejecución; nada se escribe a mano.
Los notebooks corren desde su propia carpeta, así que la raíz del repositorio está tres niveles arriba, y ninguna ruta es absoluta. Los comandos de arriba
crean el entorno con las versiones exactas de `requirements.txt` (los mismos del bake más la biblioteca de gráficos y el runtime de los notebooks), con un solo hilo de BLAS.
Las salidas están versionadas, de modo que los notebooks se leen como material terminado en GitHub. Solo las escribe el ejecutor de la plantilla (`run_notebooks.py`), nunca a mano;
su modo `--check` ejecuta copias bajo una raíz temporal que indica quien lo llama (`--tmp <raíz temporal>` o `CAOS_TEMP_ROOT`; sin ella se detiene con
salida 2) y falla ante un notebook que da error o cuyas salidas versionadas difieren de una ejecución nueva. Es una compuerta local de versión y no corre en CI.
`blastfrag` es el paquete de métodos del producto (`method_packages` en `product.json`): `scripts/check_notebooks.py` rechaza una celda que define una
función o una clase que `blastfrag` define, y `--pypi` confirma que su versión fijada está publicada.

## Reading order

Topic 01 is the entry: nothing else is needed. Each later topic names the notebooks it needs on its row of the index. A reader who wants the product's conclusion first can read
`04-benchmark-protocol` after topic 01 and come back for the methods.

## Data and licences

The corpus is a set of numeric facts from Hudaverdi, Kulatilake and Kuzu 2010 (https://doi.org/10.1002/nag.957), reused with citation; the source articles are
copyrighted and never ship. The committed artifacts under `data/derived/` are this repository's own and carry its MIT licence.
