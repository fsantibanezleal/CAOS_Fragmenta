/**
 * What every topic of the Implementation page shares: its props, the registry entry it is listed by, the language
 * picker and the two number formats the topics repeat. A topic is a leaf panel of the page (one top-level group's
 * sub-tab); it holds one or more `DocSection`s, each declaring the area of ADR-0017 section 2.1 it covers.
 */

import type { ReactElement } from 'react';

import type { BenchmarkArtifact, CaseIndex } from '../../lib/contract.types';
import { notAvailable, num } from '../../lib/format';

/** What a topic reads: the language, the benchmark and the case index (each null until the committed document loads). */
export interface TopicProps {
  es: boolean;
  b: BenchmarkArtifact | null;
  index: CaseIndex | null;
}

/** The six areas of the Implementation page (the shell's `DOC_AREAS['/implementation']`). */
export type Area = 'architecture' | 'reproducibility' | 'engine' | 'lanes' | 'contract' | 'deployment';

export interface Bi {
  en: string;
  es: string;
}

export interface TopicSpec {
  id: string;
  /** The id of the top-level group the topic sits in. */
  group: string;
  label: Bi;
  /** The areas its sections declare, as the gate reads them. */
  areas: Area[];
  Component: (props: TopicProps) => ReactElement;
}

/** The picker of the interface language: `tr(es)(english, spanish)`. */
export const tr = (es: boolean) => (en: string, sp: string) => (es ? sp : en);

/** A size in kB as the page has always written it; absent reads as "not available". */
export const kb = (bytes: number | undefined) => (bytes === undefined ? notAvailable() : `${num(bytes / 1024, 0)} kB`);

/** A size in MB with one decimal, in the interface language. */
export const mb = (bytes: number | undefined) => (bytes === undefined ? notAvailable() : `${num(bytes / 1048576, 1)} MB`);

/** A count read from a committed document, or "not available" when the document has not loaded. */
export const count = (n: number | undefined) => (n === undefined ? notAvailable() : String(n));
