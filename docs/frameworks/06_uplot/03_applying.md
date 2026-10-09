# uPlot: applying it

For a dense scientific curve in another product:

- **Use a log axis for size distributions.** A linear axis compresses the fines branch into a few
  pixels, and the tails are where the shapes differ ([methods/04](../../methods/04_distribution-shapes.md)).
- **Resolve theme colours when drawing**, from `getComputedStyle(document.documentElement)`, and redraw
  on a theme change.
- **Put the readout below the plot**, bound to uPlot's cursor hook, not in a floating tooltip.
- **Declare what was drawn** with `data-chart-*` attributes, and have the browser test read them.
- **Use a categorical layout for categories.** A line chart joins its points as if they were a
  sequence; the case's design variants (Compare the variants) are drawn as labelled rows instead, for that reason.
