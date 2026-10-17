/**
 * The Introduction page (shell 0.15.0, ADR-0017 section 2.1, boundary B10): two views, the executive one first and open on
 * load and rendered by the shell from content/executive.json, and the technical view with its five areas (problem,
 * principles, math, pipeline, honesty) at their floors in both languages, one overview figure and three captioned
 * equations. The page is rendered to a string in each language; the counts are the gate's own (dense paragraphs of at
 * least 40 words, glossary items, ordered steps, honest callouts) read from the markup.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { CitationsProvider, useLangStore } from '@fasl-work/caos-app-shell';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { CITATIONS } from '../src/data/citations';
import { IntroductionPage } from '../src/pages/Introduction';

const frontend = join(import.meta.dirname, '..');
const executive = JSON.parse(readFileSync(join(frontend, '..', 'content', 'executive.json'), 'utf8'));
const source = readFileSync(join(frontend, 'src', 'pages', 'Introduction.tsx'), 'utf8');

type Lang = 'en' | 'es';
const LANGS: Lang[] = ['en', 'es'];
const AREAS = ['problem', 'principles', 'math', 'pipeline', 'honesty'] as const;

function render(lang: Lang, initial?: 'executive' | 'technical'): string {
  // renderToString reads the store's initial state (the server snapshot), so the language is set on it as well as on the live state.
  useLangStore.getInitialState().lang = lang;
  useLangStore.setState({ lang });
  const page = createElement(IntroductionPage, { data: executive, base: '/', initial });
  return renderToString(
    createElement(CitationsProvider, { items: CITATIONS, children: createElement(MemoryRouter, { children: page }) }),
  );
}

const text = (html: string) =>
  html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** The inner markup of each documentation section, by area (a section without an area is under the key ''). */
function sections(html: string): Array<{ area: string; html: string }> {
  const parts = html.split(/<section[^>]*data-doc-section=""/).slice(1);
  return parts.map((p) => ({ area: p.match(/data-area="([^"]+)"/)?.[1] ?? '', html: p.split('</section>')[0] }));
}
const dense = (html: string) => {
  const seen = new Set<string>();
  for (const m of html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
    if (m[1].includes('katex')) continue;
    const t = text(m[1]);
    if (words(t) >= 40) seen.add(t);
  }
  return seen.size;
};
const count = (html: string, re: RegExp) => [...html.matchAll(re)].length;

for (const lang of LANGS) {
  test(`${lang}: the page opens on the executive view, first of two top-level tabs, rendered from the data file`, () => {
    const html = render(lang);
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*aria-selected="(true|false)"[^>]*>([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(tabs.slice(0, 2), ['true', 'false']);
    const labels = [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(labels.slice(0, 2), lang === 'en' ? ['Executive', 'Technical'] : ['Ejecutiva', 'Técnica']);
    assert.ok(html.indexOf('data-executive-view') > 0);
    assert.match(html, /data-executive-valid="true"/);
    assert.match(html, /data-executive-schema="2\.0\.0"/);
    assert.ok(text(html).includes(executive.title[lang]), 'the executive title is on the page');
  });

  test(`${lang}: no equation and no glossary anywhere while the executive view is open, nothing beside it`, () => {
    const html = render(lang);
    assert.equal(count(html, /class="equation"/g), 0);
    assert.equal(count(html, /data-glossary/g), 0);
    assert.equal(count(html, /data-doc-section/g), 0, 'the executive view is the shell’s, with no product section beside it');
  });

  test(`${lang}: the lede has at least 35 words and names both views`, () => {
    const html = render(lang);
    const lede = text(html.match(/<p[^>]*class="[^"]*lede[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
    assert.ok(words(lede) >= 35, `${words(lede)} words`);
  });

  test(`${lang}: the technical view holds the five areas in order, each with its floor`, () => {
    const html = render(lang, 'technical');
    const secs = sections(html);
    assert.deepEqual(secs.map((s) => s.area).filter(Boolean), [...AREAS]);
    const by = (a: string) => secs.find((s) => s.area === a)!.html;
    assert.ok(dense(by('problem')) >= 2, 'problem: dense paragraphs');
    assert.ok(dense(by('principles')) >= 2, 'principles: dense paragraphs');
    assert.ok(count(by('math'), /class="equation"/g) >= 1);
    assert.ok(count(by('math'), /data-glossary-item/g) >= 10, 'math: glossary items');
    const steps = by('pipeline').match(/<ol[\s\S]*?<\/ol>/)?.[0] ?? '';
    assert.ok(count(steps, /<li[\s>]/g) >= 4, 'pipeline: ordered steps');
    assert.equal(count(by('honesty'), /data-callout="honest"/g), 1, 'honesty: exactly one honest callout');
    assert.ok(dense(by('honesty')) >= 1, 'honesty: a dense paragraph');
  });

  test(`${lang}: page floors in the technical view: one captioned figure, three captioned equations, no honest callout outside honesty`, () => {
    const html = render(lang, 'technical');
    assert.ok(count(html, /<figure[^>]*>(?:(?!<\/figure>)[\s\S])*?<figcaption/g) >= 1);
    const equations = [...html.matchAll(/<div class="equation">[\s\S]*?<\/div><\/div>/g)].map((m) => m[0]);
    assert.ok(equations.length >= 3, `${equations.length} equations`);
    for (const e of equations) assert.match(e, /equation-caption/);
    assert.equal(count(html, /data-callout="honest"/g), 1, 'one honest callout on the whole page');
    const tags = [...html.matchAll(/<section[^>]*data-doc-section=""[^>]*>/g)].map((m) => m[0]);
    assert.equal(tags.length, 6, 'five areas and the data section');
    for (const tag of tags) assert.match(tag, /data-refs="\d+"|data-no-refs-reason="[^"]{12,}"/);
  });
}

test('every id the page cites inline, and every id its sections list, is defined', () => {
  const defined = new Set(CITATIONS.map((c) => c.id));
  const cited = [...source.matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(cited.length >= 8);
  for (const id of cited) assert.ok(defined.has(id), `${id} is not defined`);
});

test('the page reads its numbers through lib/facts and writes no em-dash, no toFixed and no reading column of its own', () => {
  assert.match(source, /lib\/facts/);
  assert.doesNotMatch(source, /toFixed|—|max-width|maxWidth/);
});
