# 08 · KaTeX

The TeX renderer behind every equation on the documentation pages, version 0.16, used through the
shell's `Equation` and `InlineMath` components.

| | |
|---|---|
| Lane | the browser |
| Pages | [installation](08_katex/01_installation.md) · [usage here](08_katex/02_usage.md) · [applying it](08_katex/03_applying.md) |

## Why it is here

The methods pages transcribe the sources' equations term by term (the classical mean size, the
uniformity index, the Swebrec function, the discriminant, the power laws, the network's forward pass,
the Levenberg-Marquardt step, the metrics, the bootstrap interval). KaTeX renders TeX synchronously in
the browser, without a server and without a layout shift, which is what an equation-dense page needs.

## What would replace it

MathJax renders the same TeX with a larger runtime and asynchronous layout. In this wiki, GitHub renders
the same TeX in `$$` blocks, so the equations on the site and in `docs/` are written once in one
notation.
