- The Methodology page is rebuilt on the shell's `DocPage` and `DocSection` (ADR-0017 section 2.1): six method topics,
  one `method` section each, as vertical sub-tabs: the Kuz-Ram mean size with Cunningham's uniformity index, the rock
  factor, the distribution shapes with the in-situ cap, the router and the regressions, the published neural network and
  the kernels and ensembles. Each topic has at least four dense paragraphs, at least two captioned equations, a captioned
  figure, one honest callout and its references, in English and in Spanish; two topics are of kind `learned`. The topics
  are in `frontend/src/pages/methodology/`, one file each.
- The old "Protocols and metrics" sub-tab is removed from Methodology: the validation protocols and metrics are on
  Experiments, and the lede says so. The router topic gains the refit's constants and plausible range read from the
  exported model; the network topic reads its widths, parameter counts and target ranges, and the ensembles topic its
  tree counts and support vectors, from the committed corpus-scope models file.
- `frontend/test/methodology.test.ts` holds the page's contract: the topics and their kinds, the floors that can be counted
  without layout, the Spanish text being Spanish, the numbers read from the committed documents, and the references.
