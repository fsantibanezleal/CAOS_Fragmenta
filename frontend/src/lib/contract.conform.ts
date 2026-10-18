/**
 * The consumer-side checker of the contract tests (never bundled into the app: it reads the schema files from disk).
 *
 * The TypeScript types of the app are generated from docs/contracts/schemas/ (contract.gen.ts), so the schema files are
 * what a document is held to here, in both directions and with types: a key the document carries that the schema does
 * not name ("written by the pipeline, not declared"), a required key the document lacks ("declared by the schema, not
 * written"), a value of the wrong type, and a value outside an enum or a const. The value rules that need the whole
 * document (bounds, patterns, the if/then of a state) are the producer side's, tests/contracts/ in Python; this
 * checker is the structure the web reads.
 */

import { readFileSync } from 'node:fs';

export const SCHEMA_FILES = {
  'blast-record': 'blast-record.schema.json',
  'case-index': 'case-index.schema.json',
  'case-manifest': 'case-manifest.schema.json',
  'case-artifact': 'case-artifact.schema.json',
  'models-file': 'models-file.schema.json',
  benchmark: 'benchmark.schema.json',
  readiness: 'readiness.schema.json',
} as const;

export type SchemaName = keyof typeof SCHEMA_FILES;

interface Schema {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  prefixItems?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  $ref?: string;
  $defs?: Record<string, Schema>;
}

const loaded = new Map<SchemaName, Schema>();

function schemaOf(name: SchemaName): Schema {
  let schema = loaded.get(name);
  if (!schema) {
    schema = JSON.parse(readFileSync(new URL(`../../../docs/contracts/schemas/${SCHEMA_FILES[name]}`, import.meta.url), 'utf8')) as Schema;
    loaded.set(name, schema);
  }
  return schema;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const kindOf = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v);

const ARTICLE: Record<string, string> = { string: 'a string', number: 'a finite number', integer: 'an integer', boolean: 'a boolean', array: 'an array', object: 'an object', null: 'null' };

/** Whether `value` is of the JSON Schema `type` (an integer is a number; a boolean is neither; NaN is no number). */
function isType(value: unknown, type: string): boolean {
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  return kindOf(value) === type;
}

/** The problems of `value` against `schema` at `path`, resolving `$ref` in the document of `root`. */
function check(value: unknown, schema: Schema, root: Schema, path: string, out: string[]): void {
  const at = path || 'document';
  if (schema.$ref !== undefined) {
    const name = schema.$ref.replace('#/$defs/', '');
    const target = root.$defs?.[name];
    if (!schema.$ref.startsWith('#/$defs/') || !target) throw new Error(`${at}: unresolved reference ${schema.$ref}`);
    check(value, target, root, path, out);
    return;
  }
  if (schema.const !== undefined) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) out.push(`${at}: expected ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
    return;
  }
  if (schema.enum) {
    if (!schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) out.push(`${at}: not one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}`);
    return;
  }
  const branch = schema.oneOf ?? schema.anyOf;
  if (branch) {
    const attempts = branch.map((b) => {
      const sub: string[] = [];
      check(value, b, root, path, sub);
      return sub;
    });
    if (!attempts.some((a) => a.length === 0)) out.push(`${at}: matches none of ${branch.length} alternatives (${attempts.map((a) => a[0]).join(' | ')})`);
    return;
  }
  for (const part of schema.allOf ?? []) check(value, part, root, path, out);
  const types = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.length && !types.some((t) => isType(value, t))) {
    out.push(`${at}: expected ${types.map((t) => ARTICLE[t] ?? t).join(' or ')}, got ${kindOf(value)}`);
    return;
  }
  if (isObject(value) && (schema.properties || schema.required || schema.additionalProperties !== undefined || types.includes('object'))) {
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!(key in value)) out.push(`${path ? `${path}.` : ''}${key}: declared by the schema, not written`);
    }
    for (const [key, v] of Object.entries(value)) {
      const child = `${path ? `${path}.` : ''}${key}`;
      if (key in props) check(v, props[key], root, child, out);
      else if (isObject(schema.additionalProperties)) check(v, schema.additionalProperties, root, child, out);
      else if (schema.additionalProperties === false) out.push(`${child}: written by the pipeline, not declared`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const tuple = schema.prefixItems?.[i];
      const item_schema = tuple ?? schema.items;
      if (item_schema) check(item, item_schema, root, `${path}[${i}]`, out);
    });
  }
}

/** The problems of `doc` against the schema file `name`; an empty list is a document the web reads whole. */
export function conform(doc: unknown, name: SchemaName): string[] {
  const root = schemaOf(name);
  const out: string[] = [];
  check(doc, root, root, '', out);
  return out;
}

/** Every property name any object of the schema file `name` declares, definitions included. */
export function propertyNames(name: SchemaName): Set<string> {
  const names = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!isObject(node)) return;
    if (isObject(node.properties)) {
      for (const key of Object.keys(node.properties)) names.add(key);
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(schemaOf(name));
  return names;
}
