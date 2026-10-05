import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// The DISPLAY version (0.05.000), read from the repo's VERSION file, which is the version source of
// record. package.json carries the semver form (0.5.0) that npm requires, and showing that in the
// footer printed `v0.4.6` where every other surface said 0.04.006.
const version = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

export default defineConfig({
  // ROOT base, and the comment it replaces was the bug. `./` makes every asset URL relative to the
  // CURRENT path, so the SPA fallback served at /focus/<case> asked for /focus/assets/index-*.js and
  // got a 404: the app never booted and the route rendered an empty body. It only ever worked when a
  // reader clicked through from `/`, which is also the only way the browser gate reached it.
  //
  // This product is served at the root of a custom domain, so `/` is correct. A project site under a
  // path would need that path here instead; relative is right for neither once the app has routes.
  base: '/',
  plugins: [react()],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  build: { chunkSizeWarningLimit: 1200 },
});
