/**
 * The Implementation page's own figures: hand-authored, theme-aware SVG in a viewBox, every label bilingual and inside
 * the drawing, in the same style as ../Diagrams.tsx (figure, drawing, caption outside the SVG). The browser gate measures
 * the text overprint of every figure on every documentation sub-tab.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { useId } from 'react';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const ACCENT = 'var(--color-accent, #4f8ef7)';
const OK = 'var(--color-good, #3aa675)';
const BAD = 'var(--color-bad, #cc4b4b)';
const SURFACE = 'var(--color-surface-2, transparent)';

const W = 900;
const BOX_W = 142;
const GAP = 46;
const PAD = 10;
const TITLE_LH = 16;
const BODY_LH = 14;

interface Step {
  title: string[];
  lines: string[];
  tone: 'accent' | 'good';
}

/** The publish condition of the deploy workflow as a chain: each stage must pass before the next runs. */
export function DeployGateFigure() {
  const es = useShellLang() === 'es';
  const t = (en: string[], sp: string[]) => (es ? sp : en);
  const marker = `fr-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const steps: Step[] = [
    { title: t(['Committed', 'artifacts'], ['Artefactos', 'versionados']), lines: t(['bake output,', 'in the repository'], ['el horneado, en', 'el repositorio']), tone: 'accent' },
    { title: t(['Verify the', 'digests'], ['Verificar los', 'resúmenes']), lines: t(['every file re-read,', 're-hashed'], ['cada archivo, leído', 'y resumido de nuevo']), tone: 'good' },
    { title: t(['Tests and', 'build'], ['Pruebas y', 'compilación']), lines: t(['parity, models,', 'types, bundle'], ['paridad, modelos,', 'tipos, paquete']), tone: 'good' },
    { title: t(['Browser gate', 'on the build'], ['Compuerta de', 'navegador']), lines: t(['every route, both', 'themes, languages'], ['cada ruta, ambos', 'temas e idiomas']), tone: 'good' },
    { title: t(['Publish'], ['Publicar']), lines: t(['GitHub Pages,', 'custom domain'], ['GitHub Pages,', 'dominio propio']), tone: 'accent' },
  ];
  const h = PAD * 2 + Math.max(...steps.map((s) => s.title.length * TITLE_LH + s.lines.length * BODY_LH)) + 6;
  const x0 = (W - (steps.length * BOX_W + (steps.length - 1) * GAP)) / 2;
  const top = 12;
  const boxX = (i: number) => x0 + i * (BOX_W + GAP);
  const braceY = top + h + 16;
  const total = braceY + 30;
  const label = t(['Any failure in these three stops the publish'], ['Una falla en cualquiera de las tres detiene la publicación'])[0];
  return (
    <figure className="fr-figure">
      <svg
        viewBox={`0 0 ${W} ${total}`}
        role="img"
        aria-label={es ? 'La condición de publicación: artefactos, resúmenes, pruebas y compilación, compuerta de navegador, publicación' : 'The publish condition: artifacts, digests, tests and build, browser gate, publish'}
        className="fr-svg"
        data-figure=""
      >
        <defs>
          <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
          </marker>
        </defs>
        {steps.map((s, i) => {
          const cx = boxX(i) + BOX_W / 2;
          const titleTop = top + PAD + 12;
          const bodyTop = titleTop + (s.title.length - 1) * TITLE_LH + 18;
          return (
            <g key={i}>
              <rect x={boxX(i)} y={top} width={BOX_W} height={h} rx={6} fill={SURFACE} stroke={s.tone === 'accent' ? ACCENT : OK} strokeWidth={1.5} />
              {s.title.map((line, k) => (
                <text key={`t${k}`} x={cx} y={titleTop + k * TITLE_LH} fill={FG} fontSize={12.5} fontWeight={600} textAnchor="middle" data-figure-label="">
                  {line}
                </text>
              ))}
              {s.lines.map((line, k) => (
                <text key={`b${k}`} x={cx} y={bodyTop + k * BODY_LH} fill={MUTED} fontSize={10.5} textAnchor="middle" data-figure-label="">
                  {line}
                </text>
              ))}
              {i < steps.length - 1 ? (
                <line x1={boxX(i) + BOX_W + 2} y1={top + h / 2} x2={boxX(i + 1) - 4} y2={top + h / 2} stroke={MUTED} strokeWidth={1.4} markerEnd={`url(#${marker})`} />
              ) : null}
            </g>
          );
        })}
        <path d={`M ${boxX(1)} ${braceY - 6} V ${braceY} H ${boxX(3) + BOX_W} V ${braceY - 6}`} fill="none" stroke={BAD} strokeWidth={1.4} />
        <text x={(boxX(1) + boxX(3) + BOX_W) / 2} y={braceY + 18} fill={BAD} fontSize={11} textAnchor="middle" data-figure-label="">
          {label}
        </text>
      </svg>
      <figcaption>
        {es
          ? 'La condición de publicación del flujo de despliegue como una cadena: cada etapa debe pasar antes de que corra la siguiente, y las tres del medio son las que pueden detener la publicación. Ninguna de ellas entrena, vuelve a hornear ni recalcula un benchmark.'
          : 'The deploy workflow’s condition for publishing as a chain: each stage must pass before the next runs, and the three in the middle are the ones that can stop the publish. None of them trains, re-bakes or recomputes a benchmark.'}
      </figcaption>
    </figure>
  );
}
