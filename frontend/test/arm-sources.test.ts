/**
 * BR-005 (BL-052): the source of every model is written in English and Spanish, and the App's case view shows the one of
 * the page's language. Before 0.08.001 the source was English only and a Spanish page read "Eqs. 9 and 10".
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ARMS } from '../src/lib/artifacts';

const here = dirname(fileURLToPath(import.meta.url));
// English words a Spanish source must not carry (a citation that is only names, a year and a DOI reads the same in both)
const ENGLISH = /\b(and|with|section|Eqs?\.|the|here|as printed|final parameters|capped|fitted|measured|published)\b/;

test('the source of every model is written in English and in Spanish', () => {
  assert.ok(ARMS.length >= 17, `only ${ARMS.length} arms`);
  for (const arm of ARMS) {
    assert.ok(arm.source.en.trim() && arm.source.es.trim(), `${arm.id}: a source is empty`);
    assert.doesNotMatch(arm.source.es, ENGLISH, `${arm.id}: the Spanish source reads English: ${arm.source.es}`);
  }
});

test('the selected model shows its source in the language of the page', () => {
  const views = readFileSync(join(here, '..', 'src', 'workbench', 'views.tsx'), 'utf8');
  assert.match(views, /\{arm\.source\[lang\]\}/, 'the case view renders arm.source in the language of the page');
  assert.doesNotMatch(views, /\{arm\.source\}|arm\.source\.en\b/, 'the case view renders one language only');
});
