/**
 * Every corpus-level figure the documentation pages quote, derived from the committed benchmark.
 *
 * Until 0.05.000 several pages typed their numbers into the prose, and one of them ("thirty seeds,
 * 0.167 to 0.636") disagreed with the artifact it described (twelve seeds, 0.258 to 0.636). A page now
 * reads a figure from here or does not print it, so the text and the artifact cannot disagree.
 */

import { useEffect, useState } from 'react';

import { loadBenchmark, loadIndex, loadModels } from './artifacts';
import {
  isGrouped,
  isRepeated,
  type BenchmarkArtifact,
  type CaseIndex,
  type GroupedArmBlock,
  type ModelsFile,
  type RepeatedArmBlock,
  type Support,
} from './contract.types';

export function useBenchmark(): BenchmarkArtifact | null {
  const [value, setValue] = useState<BenchmarkArtifact | null>(null);
  useEffect(() => {
    loadBenchmark().then(setValue).catch(() => setValue(null));
  }, []);
  return value;
}

export function useIndex(): CaseIndex | null {
  const [value, setValue] = useState<CaseIndex | null>(null);
  useEffect(() => {
    loadIndex().then(setValue).catch(() => setValue(null));
  }, []);
  return value;
}

export function useModels(scope: string | null): ModelsFile | null {
  const [value, setValue] = useState<ModelsFile | null>(null);
  useEffect(() => {
    setValue(null);
    if (!scope) return;
    loadModels(scope).then(setValue).catch(() => setValue(null));
  }, [scope]);
  return value;
}

export interface Facts {
  b: BenchmarkArtifact;
  learned: string[];
  random: (arm: string) => RepeatedArmBlock | undefined;
  dedup: (arm: string) => RepeatedArmBlock | undefined;
  grouped: (arm: string) => GroupedArmBlock | undefined;
  /** Variance explained held out by site, on a support. */
  site: (arm: string, support?: Support) => number | null;
  interval: (arm: string, support?: Support) => [number, number] | null;
  learnedRandomRange: [number, number];
  learnedGapRange: [number, number];
  nBlasts: number;
  nSites: number;
}

export function facts(b: BenchmarkArtifact): Facts {
  const R = b.protocols['random-8020'].arms;
  const D = b.protocols['dedup-random'].arms;
  const L = b.protocols['leave-one-site-out'].arms;
  const learned = Object.keys(L).filter((arm) => L[arm].tier === 'learned');
  const random = (arm: string) => (isRepeated(R[arm]) ? R[arm] : undefined);
  const dedup = (arm: string) => (isRepeated(D[arm]) ? D[arm] : undefined);
  const grouped = (arm: string) => (isGrouped(L[arm]) ? L[arm] : undefined);
  const site = (arm: string, support: Support = 'all') => grouped(arm)?.supports[support].score.r2_identity ?? null;
  const interval = (arm: string, support: Support = 'all') => grouped(arm)?.supports[support].interval_95 ?? null;
  const medians = learned.map((arm) => random(arm)?.r2_identity).filter((v): v is number => typeof v === 'number');
  const gaps = learned
    .map((arm) => b.verdict.protocol_gap_random_minus_grouped[arm])
    .filter((v): v is number => typeof v === 'number');
  return {
    b,
    learned,
    random,
    dedup,
    grouped,
    site,
    interval,
    learnedRandomRange: [Math.min(...medians), Math.max(...medians)],
    learnedGapRange: [Math.min(...gaps), Math.max(...gaps)],
    nBlasts: Object.values(b.site_counts).reduce((s, n) => s + n, 0),
    nSites: b.sites.length,
  };
}

/** Fixed decimals, or "n/a". */
export const f = (value: number | null | undefined, digits = 3) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toFixed(digits);

/** "a to b", for an interval. */
export const iv = (interval: [number, number] | null | undefined, digits = 2, es = false) =>
  interval ? `${f(interval[0], digits)} ${es ? 'a' : 'to'} ${f(interval[1], digits)}` : 'n/a';

/** A share as a whole percent. */
export const pct = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : `${Math.round(value * 100)}`;
