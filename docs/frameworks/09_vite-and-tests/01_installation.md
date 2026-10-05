# Vite and the tests: installation

All three are development dependencies in `frontend/package.json`, installed by `npm ci`.

```bash
cd frontend
npm ci
npm test          # node --import tsx --test: the parity and the portable-model tests
npm run build     # copy-data.mjs, tsc --noEmit, vite build, then spa-404.mjs
npm run preview   # serve the build on http://localhost:4173
```
