# Deploy

GitHub Pages at fragmenta.fasl-work.com.

## Why Pages and not a server

Chosen from the full menu rather than by default:

| Driver | Reading | Points at |
|---|---|---|
| repo visibility | public | Pages is available |
| payload and disk | about 1.2 MB of JSON plus a bundle | no disk-heavy host warranted |
| compute | closed forms in the browser, everything else precomputed | no compute-heavy host warranted |
| shape | no server state, no auth, no request-time compute | a backend would carry cost and an abuse surface for nothing |

## What the workflow does

1. Installs the pinned engine and re-reads and re-hashes the committed artifacts. **It never rebakes
   them.**
2. Runs the frontend parity gate against those same artifacts.
3. Builds the site and publishes it.

A deploy that recomputes scientific evidence has no reproducible release, because the numbers were
made by whichever runner picked up the job.

## The custom domain, which is two separate things

Doing only the first leaves the site unreachable, and the failure looks like a DNS problem when it is
not:

- a DNS CNAME from the subdomain to the Pages host, which overrides the wildcard A record that would
  otherwise send the name to a VPS;
- the custom domain set on the **Pages configuration itself**. On an Actions build a CNAME file in
  the public directory does not bind it.

## Deep links answer 200

A static host serves a fallback page for an unknown path, so a client-routed app appears and the HTTP
status is still 404. The page looks perfect and every shared link is a 404 to every crawler and
link-preview fetcher.

The build therefore writes a real index file at each route path, including one per focus route, read
from the manifest index so the list cannot drift when a case is added. The server then has an actual
file to serve and answers 200; the app still takes over on the client.
