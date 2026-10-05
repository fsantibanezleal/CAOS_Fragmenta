# Vite and the tests: applying the pattern

- **Test the browser engine against the offline engine's committed output**, point for point, with a
  tolerance equal to the artifacts' rounding. Two implementations of one equation drift as soon as
  nobody compares them.
- **Test the typed mirror against the data**, not only the code against the mirror: list the fields
  each artifact carries and fail on a field that appears on one side only.
- **Fail the build when declared data did not ship**, by comparing the index with what is on disk.
- **Write real files at every route** of a static single-page app, so a shared link answers 200 and
  crawlers see the page.
