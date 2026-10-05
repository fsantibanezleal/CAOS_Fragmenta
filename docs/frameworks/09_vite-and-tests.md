# 09 · Vite, TypeScript and the Node test runner

The build (Vite 6), the type check (TypeScript 5.9, `tsc --noEmit`), and the frontend tests (Node's
built-in `node:test`, run through `tsx` so the tests import the TypeScript sources directly).

| | |
|---|---|
| Lane | build time, on a developer machine, in CI and in the deploy |
| Pages | [installation](09_vite-and-tests/01_installation.md) · [usage here](09_vite-and-tests/02_usage.md) · [applying it](09_vite-and-tests/03_applying.md) |

## Why it is here

Vite builds the static site the deploy publishes; the version shown in the footer is read from the
repository's `VERSION` file at build time. The type check runs before every build, so a field renamed in
the typed mirror of the artifacts and not in a page fails the build. The Node test runner keeps the
frontend tests free of a test framework: the parity and model tests are plain assertions over the
committed artifacts.
