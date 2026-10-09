"""The Fragmenta offline pipeline.

The science lives in `blastfrag`, a separate published package this product pins and consumes. What
is here is the product: the case matrix, the staged bake, the two data contracts, the lane gate, and
the artifacts the web replays.

That split is deliberate. A product declares no package of its own, so anything a third party could
use to predict blast fragmentation without caring about Fragmenta belongs upstream.
"""

from pathlib import Path

# VERSION is the one source of the version (display form X.XX.XXX); the PEP 440 form lives in
# frontend/package.json. A literal here drifted once already: the dormant API still said an old release.
__version__ = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
