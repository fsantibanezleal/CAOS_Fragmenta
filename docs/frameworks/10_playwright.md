# 10 · Playwright

The browser automation behind the release's browser gate (`frontend/gates/browser-gate.mjs`) and the
export of the documentation figures into this wiki (`frontend/gates/export-figures.mjs`), version 1.56.

| | |
|---|---|
| Lane | the deploy (the gate), a developer machine (the gate before a push, the figure export) |
| Pages | [installation](10_playwright/01_installation.md) · [usage here](10_playwright/02_usage.md) · [applying it](10_playwright/03_applying.md) |

## Why it is here

A static site that answers 200 on every route can still render nothing; this one did, from its first
publish to its first patch release. Only a browser that opens each route and reads what rendered can
tell, so the deploy publishes only after the gate passes on the built site. The same browser exports the
rendered figures, so the diagrams in this wiki are the ones the site shows.
