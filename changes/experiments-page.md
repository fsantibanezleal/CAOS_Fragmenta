- The Experiments page is rebuilt on the shell's `DocPage` and `DocSection` (ADR-0017 section 2.1): eight topics in two
  groups, "How is it built?" (metrics, protocol, datasets and cases) and "What does it answer?" (a site it has not seen,
  protocol sensitivity, by site, design response, diagnostics). Each topic is one section of its area (`metrics`,
  `protocol`, `datasets`, or `question`), with its text in English and in Spanish, captioned equations, a figure or a
  table, one honest callout and its references. The topics are in `frontend/src/pages/experiments/`, one file each.
- The metrics topic carries the exact equations with their constants (variance explained about the identity line and the
  squared correlation, the errors, the null and the oracle, the repeated-draw summary, the pooled leave-one-site-out
  score, the site-resampled interval and the criterion). The protocol topic carries the three protocols and a new figure
  of the forbidden anti-pattern, drawn on the corpus's own duplicated vectors, next to the protocol that replaces it.
- The datasets topic is a table of every dataset with its source, its redistribution class and whether it is live or on
  the roadmap, with the campaigns, the sixteen cases (each linked to the App), the controls and the five transcription
  defects the integrity gate found. The question topics read their numbers from the committed benchmark, including the
  verdict on both row sets, the criterion in its verbatim wording and "What ten sites can separate".
- The protocols and metrics content that the Methodology page no longer holds (`ProtocolDiagram` included) is here.
- `frontend/test/experiments.test.ts` holds the page's contract: the topics and their areas, the floors that can be
  counted without layout, the Spanish text being Spanish, the numbers read from the committed documents and the
  references.
