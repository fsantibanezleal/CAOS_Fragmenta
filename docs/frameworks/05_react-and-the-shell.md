# 05 · React and the shared app shell

React 19 with react-router 7 renders the six routes; the shared CAOS app shell
(`@fasl-work/caos-app-shell` 0.6.8) supplies the header, the footer, theme and language, sub-tabs,
callouts, equations, citations and the architecture modal, so this product does not hand-roll any of
them.

| | |
|---|---|
| Lane | the browser |
| Used in | `frontend/src/main.tsx` (the shell and the routes), every page under `frontend/src/pages/` |
| Pages | [installation](05_react-and-the-shell/01_installation.md) · [usage here](05_react-and-the-shell/02_usage.md) · [applying it](05_react-and-the-shell/03_applying.md) |

## Why it is here

The CAOS products share one shell so that the header, footer, theme, language, page structure and
citation behaviour are the same everywhere and fixed in one place (ADR-0016, ADR-0071). The shell is a
React package, so the product is React. Known shell defects and the overrides this product applies are
recorded with the shell, not re-solved here.

## What would replace it

A hand-written header, footer and theme switch, which the CAOS conventions rule out: they drift from the
other products and lose every fix the shell receives.
