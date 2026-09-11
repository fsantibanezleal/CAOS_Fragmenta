"""The Fragmenta offline pipeline.

The science lives in `blastfrag`, a separate published package this product pins and consumes. What
is here is the product: the case matrix, the staged bake, the two data contracts, the lane gate, and
the artifacts the web replays.

That split is deliberate. A product declares no package of its own, so anything a third party could
use to predict blast fragmentation without caring about Fragmenta belongs upstream.
"""

__version__ = "0.04.001"  # display X.XX.XXX; the PEP 440 form lives in frontend/package.json
