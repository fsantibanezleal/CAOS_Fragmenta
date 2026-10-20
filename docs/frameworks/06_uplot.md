# 06 · uPlot

The canvas chart library behind the shell's `UPlotChart`, which draws the passing curves, the parity plots and the line
charts (the product maps its data onto it in `frontend/src/viz/plots.tsx`, and imports no uPlot itself), version 1.6.32.

| | |
|---|---|
| Lane | the browser |
| Pages | [installation](06_uplot/01_installation.md) · [usage here](06_uplot/02_usage.md) · [applying it](06_uplot/03_applying.md) |

## Why it is here

The passing curves carry 241 points on a logarithmic size grid with up to six series overlaid, and the
readout has to follow the pointer without a re-render per frame. uPlot draws to a canvas and keeps its
cursor outside React's render cycle, so a dense, interactive curve stays responsive. The CAOS
visualization rubric asks for interactive charts with readouts, not static SVG plots.

## What would replace it

An SVG chart library would re-render per pointer move at these point counts. The predicted-against-
measured chart (`ParityChart`) is drawn on a plain canvas instead, because it needs per-point hover and a
square aspect for the identity line to mean anything.
