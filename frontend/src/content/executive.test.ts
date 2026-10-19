/**
 * The executive view's data file (content/executive.json, boundary B10, contract `executive`): valid against the shell's
 * schema 2.0.0 and its writing limits through the installed shell's own validator, the 4 C's in their order, the cause
 * weights, the owners as roles, the sources by id, the illustrations under frontend/public/, and the four flip groups as
 * small cards in both languages (shell 0.14.0, gate check G16). The words the shell prints on the back of a card are counted.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { FLIP_LIMITS, FOUR_CS, validateExecutive } from '@fasl-work/caos-app-shell';

const frontend = join(import.meta.dirname, '..', '..');
const executive = JSON.parse(readFileSync(join(frontend, '..', 'content', 'executive.json'), 'utf8'));

type Text = { en: string; es: string };
type Lang = keyof Text;
const LANGS: Lang[] = ['en', 'es'];
const words = (text: string) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** The labels the shell prints on the back of a card (its UI strings), counted with the card's own text. */
const LABELS = {
  cost: { en: 'Cost', es: 'Costo' },
  measure: { en: 'Measured by', es: 'Se mide por' },
  decides: { en: 'Decides', es: 'Decide' },
  needs: { en: 'Needs', es: 'Necesita' },
  achieves: { en: 'Achieves', es: 'Logra' },
  fallsShort: { en: 'Falls short', es: 'Se queda corto' },
  source: { en: 'Source', es: 'Fuente' },
} as const;

/** One flip card: its title and the words of its back, per language. */
type Card = { group: string; title: Text; back: (lang: Lang) => number };
const cards = (): Card[] => {
  const out: Card[] = [];
  for (const b of executive.pain.bearers) {
    out.push({
      group: 'pain.bearers',
      title: b.who,
      back: (l) => words(LABELS.cost[l]) + words(b.cost[l]) + words(LABELS.measure[l]) + words(b.measure[l]),
    });
  }
  for (const r of executive.situation.roles) {
    out.push({
      group: 'situation.roles',
      title: r.role,
      back: (l) => words(LABELS.decides[l]) + words(r.decides[l]) + words(LABELS.needs[l]) + words(r.needs[l]),
    });
  }
  for (const a of executive.situation.state_of_the_art) {
    // The back ends with the label "Source" and the citation marker (one numbered word).
    out.push({
      group: 'situation.state_of_the_art',
      title: a.approach,
      back: (l) =>
        words(LABELS.achieves[l]) + words(a.achieves[l]) + words(LABELS.fallsShort[l]) + words(a.falls_short[l]) + words(LABELS.source[l]) + 1,
    });
  }
  executive.proposal.four_cs.forEach((c: { c: Text; applies: Text }, i: number) => {
    // The back holds the C's definition (printed by the shell) and what it means for this proposal.
    out.push({
      group: 'proposal.four_cs',
      title: c.c,
      back: (l) => words(FOUR_CS[i].definition[l]) + words(c.applies[l]),
    });
  });
  return out;
};

test('the executive data is valid against schema 2.0.0 and its writing limits', () => {
  const problems = validateExecutive(executive);
  assert.deepEqual(problems, [], problems.map((p: { path: string; message: string }) => `${p.path}: ${p.message}`).join('\n'));
});

test('the 4 C\'s are Choice, Context, Cost and Control, in that order, in both languages', () => {
  assert.deepEqual(
    executive.proposal.four_cs.map((c: { c: Text }) => c.c),
    [
      { en: 'Choice', es: 'Elección' },
      { en: 'Context', es: 'Contexto' },
      { en: 'Cost', es: 'Costo' },
      { en: 'Control', es: 'Control' },
    ],
  );
});

test('the cause weights are whole percents that add to at most 100', () => {
  const weights: number[] = executive.pain.causes.map((c: { weight: number }) => c.weight);
  assert.ok(weights.every((w) => Number.isInteger(w) && w >= 1));
  assert.ok(weights.reduce((a, b) => a + b, 0) <= 100);
});

test('every action owner is the text of a role of the current situation, in both languages', () => {
  const roles: Text[] = executive.situation.roles.map((r: { role: Text }) => r.role);
  for (const a of executive.proposal.actions as { owner: Text }[]) {
    assert.ok(
      roles.some((r) => r.en === a.owner.en && r.es === a.owner.es),
      `owner "${a.owner.en}" is not a role`,
    );
  }
});

test('every cited id is a source, every source is cited, and no sub-tab names more than six', () => {
  const ids: string[] = executive.sources.map((s: { id: string }) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'source ids are unique');
  const tabs: Record<string, string[]> = {
    landing: executive.headline_figures.map((f: { source: string }) => f.source),
    pain: executive.pain.figures.map((f: { source: string }) => f.source),
    context: executive.context.evidence.map((e: { source: string }) => e.source),
    situation: [
      ...executive.situation.state_of_the_art.map((a: { source: string }) => a.source),
      executive.situation.status.source,
    ],
    trends: executive.trends.items.map((t: { signal: { source: string } }) => t.signal.source),
  };
  const cited = new Set(Object.values(tabs).flat());
  for (const id of cited) assert.ok(ids.includes(id), `"${id}" cites no source`);
  for (const id of ids) assert.ok(cited.has(id), `source "${id}" is cited by nothing`);
  for (const [tab, list] of Object.entries(tabs)) {
    assert.ok(new Set(list).size <= 6, `sub-tab ${tab} names ${new Set(list).size} sources`);
  }
  for (const s of executive.sources as { url: string }[]) assert.match(s.url, /^https:\/\/\S+$/);
});

test('the three illustrations are named pain, situation and proposal, each at a path under frontend/public/', () => {
  assert.deepEqual(Object.keys(executive.illustrations).sort(), ['pain', 'proposal', 'situation']);
  for (const name of ['pain', 'situation', 'proposal']) {
    const file = executive.illustrations[name].file as string;
    assert.equal(file, `executive/${name}.svg`);
    assert.ok(!file.startsWith('/') && !file.includes('..'), `${file} stays under frontend/public/`);
    const resolved = join(frontend, 'public', file);
    assert.ok(resolved.startsWith(join(frontend, 'public')), `${file} resolves under frontend/public/`);
  }
});

test('both languages carry the same counts', () => {
  const walk = (node: unknown, path: string): void => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const o = node as Record<string, unknown>;
      if (typeof o.en === 'string' && typeof o.es === 'string' && Object.keys(o).length === 2) {
        assert.ok(o.en.trim() && o.es.trim(), `${path} has both languages`);
        return;
      }
      for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
    } else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`));
  };
  walk(executive, 'executive');
});

test('every flip card of the four flip groups is small, in both languages (shell gate G16)', () => {
  const all = cards();
  assert.equal(all.length, 5 + 5 + 5 + 4);
  for (const c of all) {
    for (const l of LANGS) {
      assert.ok(words(c.title[l]) <= FLIP_LIMITS.title[l], `${c.group} "${c.title[l]}": a title of ${words(c.title[l])} words (${l})`);
      assert.ok(c.back(l) <= FLIP_LIMITS.back[l], `${c.group} "${c.title[l]}": a back of ${c.back(l)} words (${l})`);
    }
  }
});

test('the view writes no acronym it does not spell out (the units are spelled out)', () => {
  const text = JSON.stringify(executive);
  assert.doesNotMatch(text, /\bSAG\b|\bCO2\b|\bTJ\b|\bkWh\b|\bTWh\b/);
});
