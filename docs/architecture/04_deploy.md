# Deploy

A static site on GitHub Pages at fragmenta.fasl-work.com, published from `main` by
`.github/workflows/deploy-pages.yml`. The deploy verifies and publishes; it never trains, re-bakes or
recomputes a benchmark.

---

## 1. Why Pages and not a server

| Driver | Reading | Points at |
|---|---|---|
| repository visibility | public | Pages is available |
| payload | about 4 MB of JSON (cases, benchmark, eleven models files) and a bundle; the browser loads one case and one models file at a time | no disk-heavy host |
| compute | closed forms and model walks in the browser; everything else precomputed | no compute host |
| shape | no server state, no authentication, no request-time compute | a backend would add cost and an abuse surface for nothing |

## 2. What the deploy workflow does

1. **Verifies the committed artifacts** with `scripts/check_artifacts.py`, the pipeline's own release
   gate, after installing only the pinned engine and numpy (read from the pins in the requirements
   files). Every case, the benchmark and every models file is re-read and its digest recomputed and
   compared with its own and the index's; the corpus digest is checked against the engine. It takes
   about a second. Until 0.05.000 the workflow's comment described this step and the step did not exist.
2. **Builds the site** with the parity and model tests first (`npm test`), then the type check and the
   build (`npm run build`), whose copy step fails if a declared case or models file did not ship.
3. **Runs the browser gate on the artifact about to be published** (`gates/browser-gate.mjs` against a
   local preview of the build): every route and every App tab, both themes, both languages, three
   viewport sizes; the declared content of every chart; no tab strip cut, no table wider than its
   container, no text cut by an ellipsis without its whole text as a title, no two rows of the model
   comparison with identical scores; the footer on one row with
   every separator between two items; no two citations run together; and, on every documentation
   sub-tab and in the
   architecture modal, a measurement of every figure (text on text, text leaving its box or the
   drawing, text on a box, and any drawn line or path crossing text).
   The runner is Linux, where the shell's system font stack resolves to DejaVu Sans, wider than the
   fonts on Windows or macOS; `GATE_FONTS=dejavu` runs the same gate with those fonts on any machine.
4. **Publishes** the build only if all of that passed:

$$
\text{publish} \iff \text{gate}(\text{artifacts}) \wedge \text{tests} \wedge \text{build} \wedge \text{browser gate}(\text{site})
$$

## 3. CI is cheaper than the deploy, on purpose

Under ADR-0074, CI on pushes to `develop` and `main` runs cheap checks only: the linter, the parity
tests and the build, the base-integrity guards, the content standards, the Spanish accent guard and the
CI budget guard (`scripts/check_ci_budget.py`), which fails a workflow that installs the training stack,
runs the pipeline, or runs the Python test suite. The Python tests run on a developer machine before a
push, against the committed artifacts. The browser gate runs once, in the deploy, where its failure can
stop a broken site from being published.

## 4. The custom domain is two separate settings

- a DNS CNAME from the subdomain to the Pages host, which overrides the wildcard A record that would
  otherwise send the name to the VPS;
- the custom domain set on the Pages configuration itself; on an Actions build a `CNAME` file in the
  public directory does not bind it.

Doing only the first leaves the site unreachable, and the symptom looks like a DNS problem.

## 5. Deep links answer 200

A static host serves a fallback page for an unknown path, so a client-routed app renders while the HTTP
status is 404, and every shared link is a 404 to crawlers and link previews. The build
(`frontend/spa-404.mjs`) writes a real `index.html` at each route path, including one per focus route,
read from the manifest index so the list cannot drift when a case is added.

## 6. A 200 is not a working site

The site was blank from its first publish to its first patch release, with two copies of the routing
library, while every route answered 200. That is why a deploy is verified by the browser gate on the
built site, and why the gate checks what each chart declares it drew rather than sampling pixels.
