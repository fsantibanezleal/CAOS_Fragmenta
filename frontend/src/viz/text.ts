/**
 * Text that fits the drawing it labels, measured in the font the page actually renders.
 *
 * Until 0.07.000 the drawn views sized their label columns from a fixed width per character. The deploy runner sets
 * text in DejaVu Sans, whose glyphs are wider than the Windows fonts', and Spanish labels are longer than English
 * ones, so a label column sized for one ran its labels out of the drawing in the other: "Tamaño medio clásico,
 * limitado al bloque in situ" read "dio clásico, limitado al bloque in situ", cut at the card's edge. Here a label is
 * measured with the canvas text metrics of the page's own font, broken over two lines at a word when it does not
 * fit, and only then shortened, with an ellipsis, keeping the whole label for the drawing's title.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

let context: CanvasRenderingContext2D | null | undefined;

/** The page's sans-serif stack, as the shell's token resolves it (the gate overrides it to the runner's fonts). */
function family(): string {
  if (typeof document === 'undefined') return 'sans-serif';
  return getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
}

/** The width of one line of text at a font size, in CSS pixels. */
export function textWidth(text: string, px: number, weight = 400): number {
  if (context === undefined) context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!context) return text.length * px * 0.6;
  context.font = `${weight} ${px}px ${family()}`;
  return context.measureText(text).width;
}

export interface FittedLabel {
  /** One or two lines, the last shortened with an ellipsis only when two lines are not enough. */
  lines: string[];
  /** Whether the label was shortened, so the drawing gives the whole label as its title. */
  shortened: boolean;
}

function shorten(line: string, width: number, px: number): string {
  if (textWidth(line, px) <= width) return line;
  let cut = line;
  while (cut.length > 1 && textWidth(`${cut}…`, px) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** A label in at most `maxLines` lines of `width` pixels: whole when it fits, broken at a word, shortened last. */
export function fitLabel(label: string, width: number, px: number, maxLines: 1 | 2 = 2): FittedLabel {
  if (textWidth(label, px) <= width) return { lines: [label], shortened: false };
  const words = label.split(' ');
  if (maxLines === 2 && words.length > 1) {
    let best: [string, string] | null = null;
    let bestWidth = Infinity;
    for (let k = 1; k < words.length; k += 1) {
      const first = words.slice(0, k).join(' ');
      const second = words.slice(k).join(' ');
      const widest = Math.max(textWidth(first, px), textWidth(second, px));
      if (widest < bestWidth) {
        bestWidth = widest;
        best = [first, second];
      }
    }
    if (best && bestWidth <= width) return { lines: best, shortened: false };
    if (best) {
      const first = shorten(best[0], width, px);
      return { lines: [first, shorten(best[1], width, px)], shortened: true };
    }
  }
  return { lines: [shorten(label, width, px)], shortened: true };
}

/** The widest a set of labels needs, each on one line. */
export function widestLabel(labels: string[], px: number): number {
  return Math.max(0, ...labels.map((label) => textWidth(label, px)));
}

/** Round ticks from zero up to `hi`, as many as leave room for labels about `labelWidth` pixels wide. */
export function ticksFor(hi: number, plotWidth: number, labelWidth: number): number[] {
  if (!(hi > 0)) return [0];
  const most = Math.max(2, Math.min(6, Math.floor(plotWidth / (labelWidth + 16)) + 1));
  const raw = hi / (most - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let k = 0; k * step <= hi * (1 + 1e-9); k += 1) ticks.push(k * step);
  return ticks;
}

/** The rendered width of an element, kept current; the drawings use it to lay out at their real size. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setWidth(Math.round(entries[0].contentRect.width)));
    observer.observe(element);
    setWidth(Math.round(element.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
