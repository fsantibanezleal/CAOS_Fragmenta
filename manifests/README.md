# manifests/, empty on purpose

The manifests this product writes live beside the artifacts they describe, in
`data/derived/manifests/`, because a manifest that is far from its artifact is a manifest that
drifts from it.

This directory is part of the frozen repo layout and stays so that the tree is identical across the
product line.
