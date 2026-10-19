# Design: release 0.08.000

Release 0.08.000 moves Fragmenta from shell 0.10.0 and template 0.03.001 to shell 0.15.0 and template 0.08.002. It
was sized first (components, ten boundaries, parallel units) and its catalog written before the units; the units were
then built against the fixed catalog rows.

- **Routes.** The product uses the shell's standard routes (`frontend/src/routes.ts`): the landing at `/` opens the
  Introduction, the App is at `/app`, the five documentation pages follow. The product's own focus page is gone: the
  App passes `focus` to the shell's workbench, and an old `/focus/<id>` link forwards to `/app?case=<id>&focus=1`.
  A static host answers that old path with 404 and the app, which then forwards (`frontend/spa-404.mjs`).
- **Executive view.** `content/executive.json` and three SVG files under `frontend/public/executive/`; the
  Introduction has two top-level views, the executive one first and the technical one with its five areas.
- **Pages.** The Methodology, Implementation, Experiments and Benchmark pages are shell documentation pages with
  topics grouped in at most six peers, each topic declaring its areas; the citations are one file per page.
- **Contracts.** Eight catalog rows, seven schema files and the OpenAPI document under `docs/contracts/`; the
  producers validate before writing; the types of the web are generated; the readiness document is baked and shown.
- **Reasons.** Every abstention and score note is written at bake time as `{en, es}` through one reason catalogue,
  which stops the bake on a reason it does not know. This raised the case artifact and the benchmark to 2.0.0.
- **Guards.** The template's SDD, technology and contract guards are installed verbatim, with the planted-defect
  suite in `tests/adversarial/`.

The measured resources of the release are in [`../../measured-resources.md`](../../measured-resources.md).
