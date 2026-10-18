/**
 * The Experiments page's own figures: hand-authored, theme-aware SVG in a viewBox, every label bilingual and inside the
 * drawing, in the same style as ../Diagrams.tsx (figure, drawing, caption outside the SVG). The browser gate measures the
 * text overprint of every figure on every documentation sub-tab: a tile's text stays inside its tile, free labels sit
 * clear of the tiles, and no drawn line crosses a text.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';

import { num } from '../../lib/format';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const BORDER = 'var(--color-border, rgba(128,128,128,0.3))';
const GOOD = 'var(--color-good, #3aa675)';
const BAD = 'var(--color-bad, #cc4b4b)';
const SURFACE = 'var(--color-surface-2, transparent)';

const W = 900;
const TILE_W = 46;
const TILE_H = 34;
const PITCH = 52;

/** One blast of the corpus drawn as a tile: its label on the first line, the side of the split it fell on on the second. */
function Tile({ x, y, id, side, tone }: { x: number; y: number; id: string; side: string; tone: 'neutral' | 'bad' | 'good' }) {
  const stroke = tone === 'bad' ? BAD : tone === 'good' ? GOOD : MUTED;
  return (
    <g data-figure-box="">
      <rect x={x} y={y} width={TILE_W} height={TILE_H} rx={5} fill={SURFACE} stroke={stroke} strokeWidth={tone === 'neutral' ? 1 : 2} />
      <text x={x + 6} y={y + 14} fill={FG} fontSize={11.5} fontWeight={600}>
        {id}
      </text>
      <text x={x + 6} y={y + 27} fill={MUTED} fontSize={10}>
        {side}
      </text>
    </g>
  );
}

/**
 * The forbidden anti-pattern next to the protocol that replaces it, drawn on the corpus's own duplicates: seven blasts of
 * one campaign share two input vectors. In a random split a test row has the same seven inputs as a training row; held
 * out as a whole campaign, no test row has a twin in training. The blasts, the sizes and the counts are read from the
 * committed benchmark (`duplicate_groups`, `site_counts`).
 */
export function LeakageSplitFigure({ groups, total, campaign, published }: { groups: string[][]; total: number; campaign: { site: string; n: number }; published: number | null }) {
  const es = useShellLang() === 'es';
  const t = (en: string, sp: string) => (es ? sp : en);
  // The campaign's duplicated vectors: the groups of three or more blasts (they sit in one campaign).
  const ids = groups.filter((g) => g.length >= 3).flat();
  const train = t('train', 'entren.');
  const test = t('test', 'prueba');
  // The illustrative random draw sends every second member of a group to test, so each test blast has a twin in training.
  const sides = groups.filter((g) => g.length >= 3).flatMap((g) => g.map((_, i) => i % 2 === 1));
  const leftX = 12;
  const rightX = 468;
  const top = 40;
  const arrowY = top + TILE_H + 14;
  const twins: [number, number][] = [];
  let at = 0;
  for (const g of groups.filter((x) => x.length >= 3)) {
    g.forEach((_, i) => {
      if (i % 2 === 1) twins.push([at + i - 1, at + i]);
    });
    at += g.length;
  }
  const rest = total - campaign.n;
  const height = 164;
  return (
    <figure className="fr-figure">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={t('A random split leaks duplicated rows; holding out a campaign does not', 'Una partición aleatoria filtra filas repetidas; retener una campaña no')}
        className="fr-svg"
        data-figure=""
      >
        <text x={leftX} y={22} fill={BAD} fontSize={12} fontWeight={600} data-figure-label="">
          {t('Ruled out: a random split of the rows', 'Descartado: una partición aleatoria de las filas')}
        </text>
        <text x={rightX} y={22} fill={GOOD} fontSize={12} fontWeight={600} data-figure-label="">
          {t('What is done: the whole campaign is held out', 'Lo que se hace: se retiene la campaña entera')}
        </text>
        {ids.map((id, i) => (
          <Tile key={`l${id}`} x={leftX + i * PITCH} y={top} id={id} side={sides[i] ? test : train} tone={sides[i] ? 'bad' : 'neutral'} />
        ))}
        {twins.map(([a, c], i) => {
          const xa = leftX + a * PITCH + TILE_W / 2;
          const xc = leftX + c * PITCH + TILE_W / 2;
          return <path key={i} d={`M ${xc} ${top + TILE_H} V ${arrowY} H ${xa} V ${top + TILE_H + 2}`} fill="none" stroke={BAD} strokeWidth={1.4} />;
        })}
        <text x={leftX} y={arrowY + 24} fill={MUTED} fontSize={10.5} data-figure-label="">
          {t('Each test blast has the same seven inputs as a training blast:', 'Cada tiro de prueba repite las siete entradas de uno de entrenamiento:')}
        </text>
        <text x={leftX} y={arrowY + 39} fill={MUTED} fontSize={10.5} data-figure-label="">
          {t('the model is scored on a row it has already seen.', 'el modelo se puntúa sobre una fila que ya vio.')}
        </text>
        {ids.map((id, i) => (
          <Tile key={`r${id}`} x={rightX + i * PITCH} y={top} id={id} side={test} tone="good" />
        ))}
        <g data-figure-box="">
          <rect x={rightX} y={arrowY - 2} width={ids.length * PITCH - (PITCH - TILE_W)} height={TILE_H} rx={5} fill={SURFACE} stroke={MUTED} />
          <text x={rightX + 8} y={arrowY + 13} fill={FG} fontSize={11.5} fontWeight={600}>
            {t(`Train: the other nine campaigns, ${num(rest, 0)} rows`, `Entrenamiento: las otras nueve campañas, ${num(rest, 0)} filas`)}
          </text>
          <text x={rightX + 8} y={arrowY + 26} fill={MUTED} fontSize={10}>
            {t('no campaign on both sides of the split', 'ninguna campaña en ambos lados de la partición')}
          </text>
        </g>
        <text x={rightX} y={arrowY + 44} fill={MUTED} fontSize={10.5} data-figure-label="">
          {t('A duplicated vector never crosses the split: the duplicates', 'Un vector repetido nunca cruza la partición: los repetidos')}
        </text>
        <text x={rightX} y={arrowY + 59} fill={MUTED} fontSize={10.5} data-figure-label="">
          {t(`sit in one campaign (${campaign.site}, ${num(campaign.n, 0)} blasts, drawn).`, `están en una campaña (${campaign.site}, ${num(campaign.n, 0)} tiros, dibujada).`)}
        </text>
        <line x1={W / 2 - 2} y1={12} x2={W / 2 - 2} y2={height - 12} stroke={BORDER} strokeDasharray="3 4" />
      </svg>
      <figcaption>
        {t(
          `The forbidden anti-pattern, drawn on the corpus’s own duplicates. Left: a random split sends one blast of a duplicated vector to test and its twin to training (an illustrative draw), so the test score rewards recognising a row, not predicting a blast; this is how a random split of the same ${num(total, 0)} blasts can report a variance explained of ${num(published, 3)}. Right: the protocol of this page holds out the whole campaign, so no test blast has a twin among the training rows.`,
          `El antipatrón prohibido, dibujado sobre los repetidos del propio corpus. Izquierda: una partición aleatoria manda un tiro de un vector repetido a prueba y su gemelo a entrenamiento (un sorteo ilustrativo), así que el puntaje de prueba premia reconocer una fila y no predecir un tiro; así una partición aleatoria de los mismos ${num(total, 0)} tiros puede informar una varianza explicada de ${num(published, 3)}. Derecha: el protocolo de esta página retiene la campaña entera, y ningún tiro de prueba tiene un gemelo entre las filas de entrenamiento.`,
        )}
      </figcaption>
    </figure>
  );
}
