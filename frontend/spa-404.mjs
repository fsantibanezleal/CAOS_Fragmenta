// GitHub Pages and client-side routing.
//
// TWO SEPARATE PROBLEMS, and copying 404.html only solves the first one.
//
// 1. RENDERING. Pages serves 404.html for any path that is not a real file, so a deep link to
//    /methodology needs that file to BE the app or the visitor sees GitHub's 404 page.
//
// 2. THE STATUS CODE. The 404.html trick makes the app appear, but the response is still HTTP 404.
//    MEASURED on production after the 0.06.000 deploy: every one of /app, /introduction, /methodology,
//    /implementation, /experiments and /benchmark returned 404 while rendering perfectly, so a browser
//    check that only looks at the screen calls this fine. It is not fine: a shared link is a 404 to
//    every crawler and every link-preview fetcher, and the product spec asks for 200-status deep links.
//
// The fix for the second is to stop pretending: write a REAL index.html at each route path, so Pages has
// an actual file to serve and answers 200. The SPA still takes over on the client; the difference is
// only in what the server says.
//
// The product's own /focus/<caseId> page is gone (0.08.000): Focus mode is the shell's (`?focus=1` on /app), so no
// file is written for those paths. An old /focus/<caseId> link falls to 404.html, which is this same SPA; the router
// forwards it to /app?case=<caseId>&focus=1 (src/routes.ts). Its HTTP status is therefore 404 on Pages while the app
// renders, which is acceptable for a retired link and is the one place this site answers 404 on purpose.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const indexHtml = join(dist, 'index.html');

if (!existsSync(indexHtml)) {
  console.error('[spa-404] dist/index.html missing; nothing to do');
  process.exit(0);
}

// 1. the fallback, for anything not pre-rendered below (a retired /focus/<id> link, a typo, a future route)
copyFileSync(indexHtml, join(dist, '404.html'));

// 2. a real file per route: the shell's six (`STANDARD_ROUTES`, which src/main.tsx hands to the shell). `/` is
//    dist/index.html itself, the landing, and needs no entry.
const routes = ['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark'];

for (const route of routes) {
  const dir = join(dist, ...route.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  copyFileSync(indexHtml, join(dir, 'index.html'));
}

console.log(`[spa-404] 404.html + ${routes.length} routes materialised for 200 responses`);
