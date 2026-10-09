# three.js: installation

A dependency in `frontend/package.json`, installed by `npm ci`, imported as `import * as THREE from 'three'`
in `viz/BenchView3D.tsx` only. The view is imported statically by the workbench, so three.js is part of
the main bundle; loading it only when the bench view opens would be a possible size optimisation.
