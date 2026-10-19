// Prebuild: copy into public/data/ exactly the files the index declares (the index, the readiness document, the
// benchmark, every case's manifest and artifact, every models file), and fail on any that is missing.
//
// The canonical copies live in ../data/derived (or the tree CAOS_DATA_ROOT names); public/ is a build-time overlay and
// is git-ignored, so there is exactly one copy of the evidence in the repo. The overlay is rebuilt from scratch every
// time, so a file removed from the bake never lingers in the site. The build FAILS rather than shipping a site with no
// data behind it, because an empty chart is indistinguishable from a working one until somebody looks.
//
// A file the readiness document lists as absent in the `missing` of a `partial` row (a declared-partial bake, catalog
// docs/contracts/catalog.md, Missing-data states) is warned about and left out: the site says "not available yet" for
// it. Any other absent file stops the build, and so does an absent readiness document.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const INDEX_REL = 'manifests/index.json';
const READINESS_REL = 'readiness.json';

// CAOS_DATA_ROOT selects the provider tree (absolute, or relative to the repository root); the default is the bake.
// CAOS_DATA_OUT moves the overlay (a test writes to a temp folder).
const root = process.env.CAOS_DATA_ROOT?.trim() || 'data/derived';
const derived = isAbsolute(root) ? root : resolve(REPO, root);
const outRoot = process.env.CAOS_DATA_OUT?.trim() || join(HERE, 'public', 'data');

/** The paths the readiness document declares absent: the `missing` of every row whose state is `partial`. Empty when the
 * document is absent, unreadable or not the readiness shape: nothing is tolerated then. */
function declaredAbsent() {
  try {
    const doc = JSON.parse(readFileSync(join(derived, READINESS_REL), 'utf8'));
    const rows = Array.isArray(doc?.contracts) ? doc.contracts : [];
    return rows.filter((r) => r && r.state === 'partial' && Array.isArray(r.missing)).flatMap((r) => r.missing.filter((m) => typeof m === 'string'));
  } catch {
    return [];
  }
}

if (!existsSync(join(derived, INDEX_REL))) {
  console.error(`[copy-data] ${INDEX_REL} is missing under ${derived}: run "python data-pipeline/run.py" first`);
  process.exit(1);
}
const index = JSON.parse(readFileSync(join(derived, INDEX_REL), 'utf8'));
// The fitted models the live lane loads: a case whose models file did not ship would render its replayed numbers and
// silently show nothing in the What-if tab, so an index that lists none is a failed bake.
if (!Array.isArray(index.models) || !index.models.length) {
  console.error(`[copy-data] models missing: the index lists none`);
  process.exit(1);
}
const declared = [
  ...new Set([
    INDEX_REL,
    READINESS_REL,
    index.benchmark?.path ?? 'benchmark.json',
    ...index.cases.flatMap((c) => [c.manifest_path, c.artifact_path]),
    ...index.models.map((m) => m.path),
  ]),
];
const absent = declared.filter((rel) => !existsSync(join(derived, rel)));
const allowed = new Set(declaredAbsent());
const tolerated = absent.filter((rel) => allowed.has(rel));
const stopping = absent.filter((rel) => !allowed.has(rel));
for (const rel of tolerated) {
  console.warn(`[copy-data] WARN ${rel} is absent, as readiness.json declares (partial): the site says not available yet`);
}
if (stopping.length) {
  console.error(`[copy-data] declared but missing under ${derived}:\n  ${stopping.join('\n  ')}`);
  process.exit(1);
}
rmSync(outRoot, { recursive: true, force: true });
let bytes = 0;
for (const rel of declared.filter((r) => !tolerated.includes(r))) {
  mkdirSync(dirname(join(outRoot, rel)), { recursive: true });
  cpSync(join(derived, rel), join(outRoot, rel));
  bytes += statSync(join(derived, rel)).size;
}
console.log(
  `[copy-data] root ${derived}: ${declared.length - tolerated.length} declared files (${index.cases.length} cases, ` +
    `${tolerated.length} declared absent), ${(bytes / 1024).toFixed(0)} kB -> ${outRoot}`,
);
