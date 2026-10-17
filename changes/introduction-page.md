- The Introduction is a shell `DocPage` with two top-level views: the executive view first and open on load (the shell's
  `ExecutiveView`, fed by `content/executive.json`) and the technical view. The technical view carries the five areas of
  ADR-0017 section 2.1: the problem, the principles, the mathematics (three equations whose captions define their symbols,
  and a 15-item symbol glossary), the pipeline (eight steps and the overview figure) and what is exact, modelled and absent
  (one honest callout). Where the data come from stays as a section of its own. The benchmark-support list that was an
  honest callout is a note under the problem, so the page carries exactly one honest callout. The references are the
  shell's single block at the end of the open view; `frontend/test/introduction.test.ts` holds the floors in both languages.
