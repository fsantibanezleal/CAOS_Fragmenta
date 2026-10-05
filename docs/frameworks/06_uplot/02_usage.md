# uPlot: how this product uses it

| Chart | Where | What it shows |
|---|---|---|
| `DistributionChart` | App, Distribution | cumulative percent passing against size on a log axis, one series per curve shape, with P20, P50 and P80 marked |
| `LineChart` | Benchmark (the network's per-seed scores against the published one); Experiments (the predicted size against the powder factor and against B/D) | series over an ordered axis, with a readout under the pointer |
| `ParityChart` (plain canvas, not uPlot) | App (Predict), the focus view, Experiments, Benchmark (the live check) | predicted against measured, equal axes, the identity line |

Three conventions hold for every chart:

1. **Colours come from the shell's CSS custom properties, resolved at draw time**, so a theme change
   repaints the chart; a hard-coded colour would make a series invisible in one theme.
2. **Every chart reads out values under the pointer**, in a line below the drawing rather than a tooltip
   over it, so no readout covers the data.
3. **Every chart declares what it drew** on its element: `data-chart` names it and one
   `data-chart-<count>` attribute per thing it counts (series, points, rows). The browser gate reads the
   declaration and fails a chart that drew nothing; sampling pixels cannot tell an empty canvas from a
   working one.
