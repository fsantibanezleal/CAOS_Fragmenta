# deploy/

Fragmenta deploys to **GitHub Pages** at `fragmenta.fasl-work.com`.

That target was chosen from the full menu rather than by default. The repo is public, so Pages is
available. The payload is about 1.2 MB of JSON plus a bundle, so no disk-heavy host is warranted.
Everything computes in the browser or was computed offline, so no compute-heavy host is warranted
either. There is no server state, no auth and no request-time compute, so a backend would be
carrying cost and an abuse surface for nothing.

`.github/workflows/deploy-pages.yml` is the whole deploy. It:

1. installs the pinned engine and runs `python data-pipeline/run.py --validate`, which re-reads and
   re-hashes the committed artifacts. **It never rebakes them.** A deployment is not an experiment,
   and a deploy that recomputes scientific evidence has no reproducible release.
2. runs the frontend parity gate, which scores the browser engine against those same artifacts.
3. builds the SPA and publishes `frontend/dist`.

The two files beside this one are the nginx site and systemd unit the frozen layout carries for
products that do run a backend. Fragmenta does not, and they are unused here.

## The custom domain

Two separate things are required and doing only the first leaves the site unreachable:

- a DNS `CNAME` from `fragmenta` to the Pages host, which overrides the wildcard A record that would
  otherwise send the name to a VPS;
- the custom domain set on the Pages configuration itself. On an Actions build, a `public/CNAME`
  file does **not** bind it.
