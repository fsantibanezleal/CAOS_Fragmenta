# 07 · three.js

The WebGL library behind the App's Bench tab (`frontend/src/viz/BenchView3D.tsx`), version 0.171.

| | |
|---|---|
| Lane | the browser |
| Pages | [installation](07_three/01_installation.md) · [usage here](07_three/02_usage.md) · [applying it](07_three/03_applying.md) |

## Why it is here

The reconstructed pattern is three-dimensional (burden, spacing, bench height, stemming and charge
column per hole), and the source's dimensional constraints are checked against it, so drawing the bench
to scale lets a reader see the geometry the classical equation uses. The view also animates an
initiation sequence, which the page states enters no prediction.

## What would replace it

A 2D plan and section in SVG would show the same dimensions with less context. Three.js is the smallest
widely used way to draw and light a few dozen cylinders and a block in a browser.
