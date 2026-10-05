# Playwright: how this product uses it

## The browser gate

```bash
cd frontend
npm run build && npm run preview &                         # the built site on :4173
npm run gate:browser -- --url http://localhost:4173        # add --shots <dir> to keep screenshots
```

At three viewport sizes, in both themes and both languages, it checks:

| Check | Fails when |
|---|---|
| every route renders | fewer than 400 characters rendered, a console or page error, an error boundary fired, the page scrolls sideways, or a tall page cannot scroll |
| the settings stick | the theme the page shows is not the one set |
| every App tab | a tab does not open on a click, the tab strip wraps, a panel is missing, a chart declares nothing drawn, a bench hole is not visible |
| idle | anything redraws while nobody interacts (no autoplay) |
| the footer | it wraps onto a second row |
| every documentation sub-tab (at the reading width) | a sub-tab does not open, or any figure has text on text, text leaving its box or the drawing, text on a box, or a drawn line or path crossing text |
| the architecture modal | the same figure measurement on every tab, in both languages |

The last run before this release: 284 checks, 0 failed, against a local build. The deploy runs the same
gate on the build it is about to publish.

## The figure export

```bash
node gates/export-figures.mjs --url http://localhost:4173
```

Loads each documentation page in the light theme and English, opens every sub-tab, serialises each
diagram with every theme colour replaced by its computed value, and writes `docs/assets/fig-<name>.svg`.
A markdown image cannot read the page's CSS variables, so this is how the wiki shows the same figures as
the site.
