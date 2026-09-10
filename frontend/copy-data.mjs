// Prebuild: copy the committed artifacts into the SPA's public/ so the static site replays them.
//
// The canonical copies live in ../data/derived; public/ is a build-time overlay and is git-ignored,
// so there is exactly one copy of the evidence in the repo. The build FAILS rather than shipping a
// site with no data behind it, because an empty chart is indistinguishable from a working one until
// somebody looks.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');

const derived = join(ROOT, 'data', 'derived');
if (!existsSync(derived)) {
  console.error('[copy-data] no data/derived; run "python data-pipeline/run.py" first');
  process.exit(1);
}
mkdirSync(join(PUB, 'data'), { recursive: true });
cpSync(derived, join(PUB, 'data'), { recursive: true });

const index = join(PUB, 'data', 'manifests', 'index.json');
if (!existsSync(index)) {
  console.error('[copy-data] manifests/index.json missing; the bake did not finish');
  process.exit(1);
}
const benchmark = join(PUB, 'data', 'benchmark.json');
if (!existsSync(benchmark)) {
  console.error('[copy-data] benchmark.json missing; the cross-case bake did not run');
  process.exit(1);
}

// Every case the index declares must actually be on disk. A partial bake ships clean and smaller,
// and the only thing that catches it is comparing DECLARED against SHIPPED.
const { readFileSync } = await import('node:fs');
const idx = JSON.parse(readFileSync(index, 'utf8'));
const missing = idx.cases.filter((c) => !existsSync(join(PUB, 'data', c.artifact_path)));
if (missing.length) {
  console.error(`[copy-data] ${missing.length} declared cases have no artifact: ${missing.map((c) => c.case_id).join(', ')}`);
  process.exit(1);
}
const bytes = readdirSync(join(PUB, 'data'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .reduce((sum, d) => sum + readdirSync(join(PUB, 'data', d.name)).reduce((s, f) => s + statSync(join(PUB, 'data', d.name, f)).size, 0), 0);
console.log(`[copy-data] ${idx.cases.length} cases + benchmark copied, ${(bytes / 1024).toFixed(0)} kB`);
