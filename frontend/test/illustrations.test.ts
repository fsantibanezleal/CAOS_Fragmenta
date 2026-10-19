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

/**
 * Label widths at font-size 22, weight 600, in px of the 800 wide viewBox: the larger of Verdana (the shell gate's wide font) and
 * DejaVu Sans (the Linux runner's font), measured in Chromium with getComputedTextLength(). A chip must hold the wider language
 * with 8 units of padding each side.
 */
const WIDTH22: Record<string, number> = {
  "Mine cost": 119.5,
  "Costo mina": 138.6,
  "Plant cost": 124.1,
  "Costo planta": 156.8,
  "No link": 86.7,
  "Sin enlace": 127.6,
  "Energy": 86.6,
  "Energía": 94.6,
  "Tonnage": 106.1,
  "Tonelaje": 106.1,
  "Boulders": 109.7,
  "Bolones": 98.2,
  "Fines": 66.3,
  "Finos": 66.5,
  "Trucks wait": 143.7,
  "Camiones esperan": 228,
  "Crusher": 97.2,
  "Trituradora": 140.9,
  "Mills": 57.6,
  "Molinos": 96,
  "One site": 103,
  "only": 52.7,
  "Un solo": 92.1,
  "sitio": 53.8,
  "Unproven at": 153.2,
  "a new mine": 142.7,
  "Sin validar en": 170.7,
  "otra mina": 120,
  "Varies": 77.6,
  "by site": 83.8,
  "Varía según": 146.7,
  "el sitio": 83.9,
  "Mixed": 74.3,
  "accuracy": 109.7,
  "Precisión": 113.9,
  "dispar": 77.8,
  "Thin hand-off": 167.1,
  "Traspaso débil": 179.9,
  "Blast": 62.8,
  "engineer": 110.2,
  "Ingeniero de": 159,
  "voladura": 109,
  "Geology and": 154.8,
  "geotechnics": 149.3,
  "Geología y": 130.9,
  "geotecnia": 122.3,
  "Mine": 60,
  "operations": 133.4,
  "Operaciones": 154.5,
  "mina": 61.2,
  "Site general": 151,
  "manager": 109.8,
  "Gerente": 99.9,
  "general": 94.5,
  "Concentrator": 163.3,
  "Gerente de": 138.2,
  "planta": 79.2,
  "Shared record": 176.1,
  "Registro común": 194.8,
  "Fewer boulders": 191.5,
  "Menos bolones": 185.5,
  "Fewer fines": 143.7,
  "Menos finos": 149.3,
  "No queue": 118.1,
  "Sin espera": 131.1
};

interface Chip { x: number; y: number; w: number; h: number; texts: { lang: string; x: number; y: number; size: number; str: string }[] }

/** Each chip: its rect (rx 8) with the label texts that follow it. */
function chips(svg: string): Chip[] {
  const out: Chip[] = [];
  const re = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="8"[^>]*\/>\s*((?:<text [^>]*>[^<]*<\/text>\s*)+)/g;
  for (const m of svg.matchAll(re)) {
    const texts = [...m[5].matchAll(/<text data-lang="(\w+)" x="([\d.]+)" y="([\d.]+)"[^>]*font-size="(\d+)"[^>]*>([^<]*)<\/text>/g)].map((t) => ({ lang: t[1], x: +t[2], y: +t[3], size: +t[4], str: t[5] }));
    out.push({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], texts });
  }
  return out;
}

test('every label is at size 22 or more (9 px at a 352 px column), on a chip, in both languages', () => {
  for (const n of NAMES) {
    const all = tags(files[n]).filter((t) => t.name === 'text' && t.kind === 'open');
    const onChips = chips(files[n]).flatMap((c) => c.texts);
    assert.equal(onChips.length, all.length, `${n}: every text sits on a chip`);
    for (const t of all) assert.ok(Number(attr(t.attrs, 'font-size')) >= 22, `${n}: a label under size 22`);
  }
});

test('every chip holds its wider language at size 22 with 8 units of padding, centred, inside the frame', () => {
  for (const n of NAMES) {
    for (const c of chips(files[n])) {
      for (const t of c.texts) {
        const w = WIDTH22[t.str];
        assert.ok(w !== undefined, `${n}: "${t.str}" is missing from the width table`);
        assert.ok(c.w >= w + 16, `${n}: chip of "${t.str}" is ${c.w} wide, needs ${w + 16}`);
        assert.equal(t.x, c.x + c.w / 2, `${n}: "${t.str}" is not centred on its chip`);
      }
      assert.ok(c.x >= 2 && c.y >= 2 && c.x + c.w <= 798 && c.y + c.h <= 398, `${n}: chip "${c.texts[0].str}" leaves the 800 by 400 frame`);
    }
  }
});

test('no chip overlaps another chip', () => {
  for (const n of NAMES) {
    const cs = chips(files[n]);
    for (let i = 0; i < cs.length; i += 1) {
      for (let j = i + 1; j < cs.length; j += 1) {
        const a = cs[i];
        const b = cs[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        assert.ok(apart, `${n}: chips "${a.texts[0].str}" and "${b.texts[0].str}" overlap`);
      }
    }
  }
});

test('a two-line label has baselines 28 apart or more and both glyph boxes inside the chip with 3 units to spare; a one-line label has its box inside too', () => {
  for (const n of NAMES) {
    for (const c of chips(files[n])) {
      for (const lang of ['en', 'es']) {
        const ts = c.texts.filter((t) => t.lang === lang);
        assert.ok(ts.length >= 1 && ts.length <= 2, `${n}: ${ts.length} lines in "${c.texts[0].str}"`);
        if (ts.length === 2) assert.ok(ts[1].y - ts[0].y >= 28, `${n}: "${ts[0].str}" baselines ${ts[1].y - ts[0].y} apart`);
        const size = ts[0].size;
        const top = ts[0].y - 0.95 * size; // ascent
        const bottom = ts[ts.length - 1].y + 0.25 * size; // descent
        assert.ok(top >= c.y + 3, `${n}: "${ts[0].str}" glyph box above the chip`);
        assert.ok(bottom <= c.y + c.h - 3, `${n}: "${ts[0].str}" glyph box below the chip`);
      }
    }
  }
});
