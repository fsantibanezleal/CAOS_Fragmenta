/**
 * The consumer side of every catalog row, and the swap test: the same assertions on two roots, the committed bake
 * (data/derived) and the provider tree (docs/contracts/fixtures/data/derived). An absent root or document is a failure
 * naming its path, never a pass.
 *
 * The types the app reads are GENERATED from the schema files (contract.gen.ts, ADR-0080 decision 2), so this file
 * holds the documents against the schemas in both directions: a field a document carries that the schema does not
 * name fails, and a required field a document lacks fails, at every level and with its type. It then holds the
 * generated file to the schemas (it names every property) and the catalog to the generated components.
 *
 * CONTRACT_TEST_ROOT (absolute) replaces the two roots with one, so a temp copy with a planted fault can be run.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CASE_SCHEMA, INDEX_SCHEMA, BENCHMARK_SCHEMA, MODELS_SCHEMA, type CaseArtifact, type CaseIndex, type CaseManifest, type ModelsFile, type Readiness } from './contract.types';
import { conform, propertyNames, SCHEMA_FILES, type SchemaName } from './contract.conform';

const override = process.env.CONTRACT_TEST_ROOT?.trim();
const roots: Record<string, URL> = override
  ? { [`CONTRACT_TEST_ROOT ${override}`]: new URL(`file:///${override.replace(/\\/g, '/').replace(/\/?$/, '/')}`) }
  : {
      'data/derived (the bake)': new URL('../../../data/derived/', import.meta.url),
      'docs/contracts/fixtures/data/derived (the provider)': new URL('../../../docs/contracts/fixtures/data/derived/', import.meta.url),
    };
const catalogUrl = new URL('../../../docs/contracts/catalog.md', import.meta.url);
const genUrl = new URL('./contract.gen.ts', import.meta.url);
const openapiUrl = new URL('../../../docs/contracts/api.openapi.json', import.meta.url);

/** The rows of the `## Contracts` table of the catalog: id and schema file. */
function catalogRows(): { id: string; schemaFile: string }[] {
  const rows: { id: string; schemaFile: string }[] = [];
  let inTable = false;
  let schemaColumn = -1;
  for (const line of readFileSync(catalogUrl, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      inTable = line.trim() === '## Contracts';
      continue;
    }
    if (!inTable || !line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells[0] === 'id') schemaColumn = cells.findIndex((c) => c.toLowerCase() === 'schema file');
    else if (!/^-+$/.test(cells[0])) rows.push({ id: cells[0], schemaFile: cells[schemaColumn] });
  }
  return rows;
}

function readFrom(root: URL, rel: string): unknown {
  const url = new URL(rel, root);
  if (!existsSync(url)) throw new Error(`missing committed document: ${fileURLToPath(url)}`);
  return JSON.parse(readFileSync(url, 'utf8'));
}

const expectConforms = (doc: unknown, schema: SchemaName, where: string) => {
  const problems = conform(doc, schema);
  assert.deepEqual(problems, [], `${where} does not conform to ${schema}:\n${problems.slice(0, 12).join('\n')}`);
};

for (const [label, root] of Object.entries(roots)) {
  describe(`CONTRACT: ${label} is exactly what the web declares`, () => {
    const read = (rel: string): unknown => readFrom(root, rel);
    const index = read('manifests/index.json') as CaseIndex;

    it('the index conforms, counts its cases and names each once', () => {
      expectConforms(index, 'case-index', 'manifests/index.json');
      assert.equal(index.schema, INDEX_SCHEMA);
      assert.equal(index.n_cases, index.cases.length);
      assert.ok(index.cases.length > 0, 'the index lists no case');
      const ids = index.cases.map((c) => c.case_id);
      assert.equal(new Set(ids).size, ids.length, 'a case id repeats');
    });

    for (const entry of index.cases) {
      it(`${entry.case_id}: the manifest and the artifact conform and agree with the index`, () => {
        const manifest = read(entry.manifest_path) as CaseManifest;
        expectConforms(manifest, 'case-manifest', entry.manifest_path);
        assert.equal(manifest.case_id, entry.case_id);
        assert.equal(manifest.artifact.path, entry.artifact_path);
        const artifact = read(entry.artifact_path) as CaseArtifact;
        expectConforms(artifact, 'case-artifact', entry.artifact_path);
        assert.equal(artifact.schema, CASE_SCHEMA);
        assert.equal(artifact.case.id, entry.case_id);
        assert.equal(readFileSync(new URL(entry.artifact_path, root)).length, entry.bytes, `${entry.artifact_path}: bytes`);
      });
    }

    for (const entry of index.models ?? []) {
      it(`models file ${entry.scope} conforms and agrees with the index`, () => {
        const file = read(entry.path) as ModelsFile;
        expectConforms(file, 'models-file', entry.path);
        assert.equal(file.schema, MODELS_SCHEMA);
        assert.equal(file.scope, entry.scope);
        assert.deepEqual(Object.keys(file.arms).sort(), [...entry.arms].sort());
        assert.equal(readFileSync(new URL(entry.path, root)).length, entry.bytes, `${entry.path}: bytes`);
      });
    }

    it('the benchmark conforms and agrees with the index', () => {
      assert.ok(index.benchmark, 'the index names no benchmark');
      const benchmark = read(index.benchmark.path) as { schema: string };
      expectConforms(benchmark, 'benchmark', index.benchmark.path);
      assert.equal(benchmark.schema, BENCHMARK_SCHEMA);
      assert.equal(readFileSync(new URL(index.benchmark.path, root)).length, index.benchmark.bytes);
    });

    it('the readiness document conforms and lists the catalog rows in order, readiness itself aside', () => {
      const r = read('readiness.json') as Readiness;
      expectConforms(r, 'readiness', 'readiness.json');
      const expected = catalogRows().map((row) => row.id).filter((id) => id !== 'readiness');
      assert.deepEqual(r.contracts.map((c) => c.id), expected);
    });
  });
}

describe('CONTRACT: the checker holds a document to its schema in both directions', () => {
  const base = JSON.parse(readFileSync(new URL('../../../docs/contracts/fixtures/data/derived/readiness.json', import.meta.url), 'utf8')) as Readiness;
  const copy = () => structuredClone(base) as unknown as Record<string, unknown>;

  it('adversarial: a field the schema does not name fails, at the top and two levels down, and is named', () => {
    const top = copy();
    top.extra = 1;
    assert.match(conform(top, 'readiness').join('\n'), /extra: written by the pipeline, not declared/);
    const deep = copy();
    (deep.contracts as Record<string, unknown>[])[0].reason = { en: 'x', es: 'y', fr: 'z' };
    assert.match(conform(deep, 'readiness').join('\n'), /contracts\[0\]\.reason\.fr: written by the pipeline, not declared/);
  });
  it('adversarial: a required field the document lacks fails, and is named', () => {
    const doc = copy();
    delete doc.catalog_sha256;
    assert.match(conform(doc, 'readiness').join('\n'), /catalog_sha256: declared by the schema, not written/);
  });
  it('adversarial: a wrong type fails, and a boolean is not a number or a string', () => {
    const doc = copy();
    doc.product_version = true;
    (doc.contracts as unknown) = 7;
    const problems = conform(doc, 'readiness').join('\n');
    assert.match(problems, /product_version: expected a string/);
    assert.match(problems, /contracts: expected an array/);
  });
  it('a value outside an enum or a const fails', () => {
    const doc = copy();
    doc.schema = 'fragmenta.readiness/v2';
    (doc.contracts as Record<string, unknown>[])[0].state = 'half';
    const problems = conform(doc, 'readiness').join('\n');
    assert.match(problems, /schema: expected "fragmenta.readiness\/v1"/);
    assert.match(problems, /state: not one of/);
  });
  it('adversarial: an absent document is a failure naming its path', () => {
    const nowhere = new URL('./no-such-root/', import.meta.url);
    assert.throws(() => readFrom(nowhere, 'manifests/index.json'), /missing committed document: .*no-such-root.*index\.json/);
  });
  it('the document it accepts: the committed fixture readiness conforms', () => {
    assert.deepEqual(conform(copy(), 'readiness'), []);
  });
});

describe('CONTRACT: the generated types, the schemas and the catalog agree', () => {
  const gen = readFileSync(genUrl, 'utf8');
  const openapi = JSON.parse(readFileSync(openapiUrl, 'utf8')) as {
    paths: Record<string, unknown>;
    components: { schemas: Record<string, { $ref?: string }> };
  };

  it('the catalog lists the eight rows, in order', () => {
    assert.deepEqual(
      catalogRows().map((row) => row.id),
      ['blast-record', 'case-index', 'case-manifest', 'case-artifact', 'models-file', 'benchmark', 'readiness', 'api'],
    );
  });
  it('every catalog row with a schema file is a component of contract.gen.ts, and the api row has its paths', () => {
    for (const row of catalogRows()) {
      if (row.id === 'api') {
        for (const path of Object.keys(openapi.paths)) {
          assert.ok(gen.includes(`"${path}": {`), `contract.gen.ts has no path ${path}`);
        }
        continue;
      }
      const component = Object.entries(openapi.components.schemas).find(([, s]) => s.$ref?.endsWith(row.schemaFile.split('/').pop() ?? '!'));
      assert.ok(component, `${row.id}: no component of api.openapi.json references ${row.schemaFile}`);
      assert.match(gen, new RegExp(`^ {8}${component[0]}: `, 'm'), `${row.id}: contract.gen.ts has no component ${component[0]}`);
    }
  });
  it('every schema file the catalog names is one the checker knows', () => {
    const named = catalogRows().filter((r) => r.id !== 'api').map((r) => r.schemaFile.split('/').pop());
    assert.deepEqual(named.sort(), Object.values(SCHEMA_FILES).sort());
  });
  it('contract.gen.ts names every property of every schema (the field-name check of the former mirror, on the generated file)', () => {
    const declared = new Set([...gen.matchAll(/["']?([A-Za-z0-9_][A-Za-z0-9_.-]*)["']?\??\s*:/g)].map((m) => m[1]));
    const missing: string[] = [];
    for (const name of Object.keys(SCHEMA_FILES) as SchemaName[]) {
      for (const key of propertyNames(name)) if (!declared.has(key)) missing.push(`${name}.${key}`);
    }
    assert.deepEqual(missing, [], `properties the generated types never name: ${missing.join(', ')}`);
  });
});
