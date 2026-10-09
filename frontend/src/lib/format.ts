/**
 * Every number a reader sees, in the interface language.
 *
 * The shell's `formatNumber` writes a decimal point in English and a decimal comma in Spanish, and "not
 * available" in place of an absent or non-finite value (base requirement S8, `conventions/languages.md`). Until
 * 0.07.000 every view wrote its numbers with `toFixed`, so the Spanish pages printed 0.311 where a Spanish reader
 * writes 0,311, and an absent value read "n/a" in both languages. The template's web-baseline guard now fails a
 * view that calls `toFixed`; the views go through these helpers instead.
 *
 * The helpers read the language from the shell's store at call time. Every view that prints a number also reads
 * `useShellLang()` for its own text, so it renders again when the language changes and its numbers follow.
 */

import { formatNumber, NOT_AVAILABLE, useLangStore } from '@fasl-work/caos-app-shell';

import type { Lang } from './contract.types';

export const currentLang = (): Lang => useLangStore.getState().lang;

/** What an absent value reads as, in the interface language. */
export const notAvailable = (lang: Lang = currentLang()): string => NOT_AVAILABLE[lang];

/** A number with a fixed count of decimals. */
export function num(value: number | null | undefined, decimals = 3, lang: Lang = currentLang()): string {
  return formatNumber(value, lang, { decimals });
}

/** A quantity as its source states it: significant digits, no padding (16,9 GPa; 229 mm). */
export function value(v: number | null | undefined, lang: Lang = currentLang()): string {
  return formatNumber(v, lang);
}

/** A number with its sign, for a difference or a margin. */
export function signed(value: number | null | undefined, decimals = 3, lang: Lang = currentLang()): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return formatNumber(value, lang);
  return `${value >= 0 ? '+' : ''}${formatNumber(value, lang, { decimals })}`;
}

/** An interval, "a to b". */
export function interval(
  pair: readonly [number, number] | null | undefined,
  decimals = 2,
  lang: Lang = currentLang(),
): string {
  if (!pair) return notAvailable(lang);
  return `${num(pair[0], decimals, lang)} ${lang === 'es' ? 'a' : 'to'} ${num(pair[1], decimals, lang)}`;
}

/** A drawing coordinate: geometry for an SVG path or a canvas, not a reading, so it always takes a point. */
export const coord = (value: number): string => String(Math.round(value * 10) / 10);
