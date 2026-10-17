- The shell is pinned exactly at 0.15.0. The routes are the shell's `STANDARD_ROUTES` (App, Introduction, Methodology,
  Implementation, Experiments, Benchmark): the App is at `/app`, the root and every unknown path render the shell's
  `Landing`, which opens the Introduction, and an old App link such as `/?case=real-murgul` is forwarded to
  `/app?case=real-murgul`. The route table is `frontend/src/routes.ts`.
- Focus mode is the shell's (`CaseWorkbench focus`, ADR-0070): a Focus control in the rail head opens the open group in the
  full viewport (`?focus=1`). The product's own `/focus/<case>` page, its inline "Full screen" link and its `.fr-focus-*`
  rules are removed; an old `/focus/<case>` link is forwarded to `/app?case=<case>&focus=1`, which opens on the Predict
  group, the group that page drew. On GitHub Pages that old path answers 404 with the app rendered (no file is written for it).
- The Experiments case chips link to `/app?case=<id>`. `spa-404.mjs` writes a real `index.html` for `/app` and the five
  documentation routes.
- The gate runner always passes `--require-focus` (G18). The product's browser gate and the figure exporter moved from
  the `gates` folder of the frontend to `frontend/scripts/` (the SDD checks accept a gate under `scripts/` only); the browser gate walks the
  new routes and checks the landing, the header order and the three legacy links.
- The template 0.08.002 guards that apply now are adopted verbatim: `check_web_baseline`, `check_version_coherence`,
  `check_ci_budget`, `check_deploy_place`, `check_content_standards`, `check_doc_paths` and `check_svg_animation` (with
  `svg_animation.mjs`); CI runs the last two. Node is 22 in both workflows. `numpy` is pinned at 2.5.3 in
  `requirements.txt`, the version of the precompute lane.
- The citations are split per page (`frontend/src/data/citations/<page>.ts`), with the sources several pages use in
  `citations.ts`, so the page units own disjoint files; a test holds unique ids, defined references and no unused citation.
