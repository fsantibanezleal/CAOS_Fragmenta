# three.js: how this product uses it

`BenchView3D` takes the selected blast's `pattern` from the case artifact (burden, spacing, bench
height, stemming, charge length, hole diameter) and draws the bench with its holes, stemming and charge
columns to scale, with a tie-in (row by row, V-cut, reverse) and an inter-hole delay that animate the
firing order.

- **Paused by default, halted when hidden.** The animation starts only on request and stops when the
  tab is not visible, so the page does not keep the GPU busy.
- **Declares what it drew.** The element carries `data-bench-holes` with the number of holes drawn; the
  browser gate checks it against the pattern and checks that every hole is visible at each tested size.
- **Not evidence.** The timing factor in the modified classical model is a scalar with no spatial
  structure, so the tie-in changes the animation and nothing in any prediction; the panel says so.
- **Theme.** Materials read the shell's colours, so the bench repaints with the theme.
- **No geometry, no bench.** For the Miami campaign the tab shows the reason instead of a drawing.
