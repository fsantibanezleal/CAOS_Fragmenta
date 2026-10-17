/**
 * The three executive illustrations (public/executive/*.svg; CAOS_MANAGE conventions/problem-context-first.md, "The illustrations"):
 * hand-authored scenes in theme tokens only, with one bilingual label set per file and, for the pain scene, an animation that
 * has its reduced-motion block. The shell gate (G10, G13, G17) measures the rendered scenes at integration; this test holds the
 * source contract on the product's side.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const FRONTEND = process.cwd();
const NAMES = ['pain', 'situation', 'proposal'] as const;
const read = (path: string): string => readFileSync(join(FRONTEND, path), 'utf8');
const files = Object.fromEntries(NAMES.map((n) => [n, read(`public/executive/${n}.svg`)])) as Record<(typeof NAMES)[number], string>;
const shellCss = read('node_modules/@fasl-work/caos-app-shell/styles.css');
const shellTokens = new Set(shellCss.match(/--color-[a-z0-9-]+/g) ?? []);

/** Opening and closing tags with their attribute text, enough to prove the file is balanced XML. */
function tags(svg: string): { name: string; attrs: string; kind: 'open' | 'close' | 'self' }[] {
  const body = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '<style></style>');
  const out: { name: string; attrs: string; kind: 'open' | 'close' | 'self' }[] = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    out.push({ name: m[2], attrs: m[3], kind: m[1] ? 'close' : m[4] ? 'self' : 'open' });
  }
  return out;
}

function attr(attrs: string, name: string): string | undefined {
  return new RegExp(String.raw`(?:^|\s)${name}="([^"]*)"`).exec(attrs)?.[1];
}

test('each file is balanced XML with a viewBox, a role, an English aria-label and a title', () => {
  for (const n of NAMES) {
    const all = tags(files[n]);
    const stack: string[] = [];
    for (const t of all) {
      if (t.kind === 'open') stack.push(t.name);
      else if (t.kind === 'close') assert.equal(stack.pop(), t.name, `${n}: unbalanced </${t.name}>`);
    }
    assert.equal(stack.length, 0, `${n}: unclosed ${stack.join(',')}`);
    const root = all[0];
    assert.equal(root.name, 'svg', n);
    assert.match(attr(root.attrs, 'viewBox') ?? '', /^0 0 \d+ \d+$/, `${n}: viewBox`);
    assert.equal(attr(root.attrs, 'role'), 'img', `${n}: role`);
    assert.ok((attr(root.attrs, 'aria-label') ?? '').length > 20, `${n}: aria-label`);
    assert.match(files[n], /<title>[^<]{20,}<\/title>/, `${n}: title`);
    assert.ok(files[n].length < 40_000, `${n}: under 40 KB (${files[n].length})`);
  }
});

test('every fill, stroke and stop-color is a theme token, none or currentColor, in attributes and in the style block', () => {
  const ok = /^(var\(--color-[a-z0-9-]+\)|none|currentColor)$/;
  for (const n of NAMES) {
    for (const m of files[n].matchAll(/\s(?:fill|stroke|stop-color|flood-color)="([^"]*)"/g)) {
      assert.match(m[1], ok, `${n}: attribute colour ${m[1]}`);
    }
    for (const m of files[n].matchAll(/(?:^|[;{\s"])(?:fill|stroke|stop-color|flood-color|color|background|background-color)\s*:\s*([^;}"]+)/g)) {
      assert.match(m[1].trim(), ok, `${n}: style colour ${m[1]}`);
    }
    assert.doesNotMatch(files[n], /#[0-9a-fA-F]{3,8}\b(?![^<]*<\/title>)/, `${n}: a hex colour`);
    assert.doesNotMatch(files[n], /\b(?:rgb|rgba|hsl|hsla)\(/, `${n}: a functional colour`);
  }
});

test('every --color-* used is defined by the installed shell', () => {
  for (const n of NAMES) {
    const used = new Set(files[n].match(/--color-[a-z0-9-]+/g) ?? []);
    assert.ok(used.size > 4, `${n}: uses tokens`);
    for (const t of used) assert.ok(shellTokens.has(t), `${n}: ${t} is not a shell token`);
  }
});

test('every text carries data-lang en or es, the two sets are equal in size, no text sets a font family', () => {
  for (const n of NAMES) {
    const texts = tags(files[n]).filter((t) => t.name === 'text' && t.kind === 'open');
    assert.ok(texts.length >= 8, `${n}: labels`);
    const count = { en: 0, es: 0 };
    for (const t of texts) {
      const lang = attr(t.attrs, 'data-lang');
      assert.ok(lang === 'en' || lang === 'es', `${n}: a text without data-lang`);
      count[lang] += 1;
      assert.equal(attr(t.attrs, 'font-family'), undefined, `${n}: font-family on a text`);
      assert.doesNotMatch(attr(t.attrs, 'style') ?? '', /font-family/, `${n}: font-family in style`);
      const size = Number(attr(t.attrs, 'font-size') ?? '0');
      assert.ok(size >= 19, `${n}: font-size ${size} is under 19 (9 px at a 390 px column)`);
    }
    assert.equal(count.en, count.es, `${n}: en ${count.en} against es ${count.es}`);
    assert.doesNotMatch(files[n], /font-family/, `${n}: font-family anywhere`);
  }
});

test('no chart marker, image, link or event attribute, and no script', () => {
  for (const n of NAMES) {
    assert.doesNotMatch(files[n], /data-chart/, `${n}: data-chart`);
    assert.doesNotMatch(files[n], /<image\b/, `${n}: image`);
    assert.doesNotMatch(files[n], /\b(?:xlink:)?href\s*=/, `${n}: href`);
    assert.doesNotMatch(files[n], /\son[a-z]+\s*=/, `${n}: event attribute`);
    assert.doesNotMatch(files[n], /<script\b|<foreignObject\b/, `${n}: script or foreignObject`);
    assert.doesNotMatch(files[n], /[\u2014\u2192\u2190]/u, `${n}: em-dash or arrow`);
  }
});

test('the pain scene is animated with a bounded loop and a reduced-motion block; situation and proposal are stills', () => {
  const pain = files.pain;
  assert.match(pain, /@keyframes\s+[\w-]+/);
  assert.match(pain, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^]*animation:\s*none/);
  for (const m of pain.matchAll(/animation:[^;]*?(\d+(?:\.\d+)?)s/g)) assert.ok(Number(m[1]) <= 10, `loop of ${m[1]} s`);
  assert.doesNotMatch(files.situation, /@keyframes|<animate/);
  assert.doesNotMatch(files.proposal, /@keyframes|<animate/);
});

test('pain and proposal share one layout: the same labelled objects at the same places', () => {
  const place = (svg: string, key: string): string | undefined => new RegExp(`data-slot="${key}"[^>]*`).exec(svg)?.[0].replace(/\sdata-state="[^"]*"/, '');
  for (const slot of ['rig', 'table', 'pile', 'camera', 'shovel', 'truck-1', 'truck-2', 'truck-3', 'crusher', 'belt', 'mill-a', 'mill-b', 'control-room', 'dial-energy', 'dial-output']) {
    const a = place(files.pain, slot);
    assert.ok(a, `pain: slot ${slot}`);
    assert.equal(a, place(files.proposal, slot), `slot ${slot} differs between pain and proposal`);
  }
});
