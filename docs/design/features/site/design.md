# Design: the site, as measured in a browser

Retroactive. The gate drives Chromium through Playwright over a built site (a local preview or the deployed
origin). It sets the theme and language by an init script before the first navigation, reads what each page
declares about itself (`data-chart-*`, `data-bench-*`, the document language), and measures geometry where a
declaration would not be evidence: text and box rectangles in every figure, strokes sampled along their length,
the footer's height in its own line height, tab strips' and tables' overflow, and ellipsized text. Each check was
confirmed to fail on the build it was written against before it was trusted. The page is
`docs/architecture/04_deploy.md`.
