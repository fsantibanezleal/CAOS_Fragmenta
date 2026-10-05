# React and the shell: installation

```bash
cd frontend
npm ci            # installs exactly what package-lock.json records
npm run dev       # copies data/derived into public/data, then starts Vite
```

Node 20 is what CI and the deploy use. The shell is published on npm as `@fasl-work/caos-app-shell`;
its stylesheet is imported once in `main.tsx` (`@fasl-work/caos-app-shell/styles.css`).

`npm run dev` and `npm run build` run `copy-data.mjs` first, which copies the committed artifacts into
`frontend/public/data/` (ignored by git) and fails if the index declares a case or a models file that is
not on disk. Run the bake, or check out the committed `data/derived/`, before the first `npm run dev`.
