/**
 * The rail: the pickers every view shares, then the controls and live values of the open group only. A control
 * that moves only some views is shown only with them (docs/design/features/workbench-on-the-base/design.md).
 */

import { ChipGroup, Knob, Readout, useShellLang, type BiText, type ReadoutItem } from '@fasl-work/caos-app-shell';

import { FEATURES, RANGE } from '../engine/design';
import type { LiveBlast } from '../engine/live';
import { ARMS, ARM_BY_ID, FEATURE_LABEL, TIER_LABEL, TIER_ORDER } from '../lib/artifacts';
import type { CaseArtifact, Lang } from '../lib/contract.types';
import { provenanceOf, type Controls, type DesignView, type DistributionView, type GroupId, type Selection, type TieIn } from './model';
import { rockSchemes } from './views';

const t = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A categorised one-of-N, so a select with one group per tier, registered as a control. */
export function ArmPicker({ artifact, armId, onArm }: { artifact: CaseArtifact; armId: string; onArm: (id: string) => void }) {
  const lang = useShellLang();
  const available = new Set(Object.keys(artifact.predictions));
  return (
    <label className="fr-pick">
      <span>{t(lang, 'Model', 'Modelo')}</span>
      <select data-control="arm" className="fr-select" value={armId} onChange={(e) => onArm(e.target.value)}>
        {TIER_ORDER.map((tier) => {
          const inTier = ARMS.filter((a) => a.tier === tier && available.has(a.id));
          if (!inTier.length) return null;
          return (
            <optgroup key={tier} label={TIER_LABEL[tier][lang]}>
              {inTier.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label[lang]}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}

export function BlastPicker({ artifact, blastId, onBlast }: { artifact: CaseArtifact; blastId: string; onBlast: (id: string) => void }) {
  const lang = useShellLang();
  if (artifact.blasts.length < 2) return null;
  return (
    <label className="fr-pick">
      <span>{t(lang, 'Blast', 'Tiro')}</span>
      <select data-control="blast" className="fr-select" value={blastId} onChange={(e) => onBlast(e.target.value)}>
        {artifact.blasts.map((b) => (
          <option key={b.blast_id} value={b.blast_id}>
            {b.blast_id}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The selected model's score on this case, replayed from the bake. */
export function ScoreReadout({ sel }: { sel: Selection }) {
  const score = sel.artifact.scores[sel.armId];
  const items: ReadoutItem[] = score?.scoreable
    ? [
        { label: { en: 'Variance explained, R²id', es: 'Varianza explicada, R²id' }, value: score.r2_identity ?? null, unitless: true, format: { decimals: 3 }, better: 'higher', good: 0.3, bad: 0 },
        { label: { en: 'Squared correlation, r²', es: 'Correlación al cuadrado, r²' }, value: score.pearson_r2 ?? null, unitless: true, format: { decimals: 3 } },
        { label: { en: 'Root mean square error', es: 'Raíz del error cuadrático medio' }, value: score.rmse_m === null || score.rmse_m === undefined ? null : score.rmse_m * 100, unit: 'cm', format: { decimals: 1 } },
        { label: { en: 'Scored blasts', es: 'Tiros puntuados' }, value: score.n_scored ?? 0, unitless: true, format: { decimals: 0 } },
      ]
    : [{ label: { en: 'This case', es: 'Este caso' }, text: { en: 'not scoreable: no measured size', es: 'no puntuable: sin tamaño medido' } }];
  return (
    <Readout
      title={{ en: `${ARM_BY_ID.get(sel.armId)?.label.en ?? sel.armId} on this case`, es: `${ARM_BY_ID.get(sel.armId)?.label.es ?? sel.armId} en este caso` }}
      lane="replay"
      provenance={provenanceOf(sel, false)}
      dataKey={sel.stateKey}
      items={items}
    />
  );
}

type SetControls = (patch: Partial<Controls>) => void;

/** The controls and live values of the open group. */
export function GroupRail({
  sel,
  group,
  distView,
  designView,
  set,
  onDesign,
  onHole,
  part = 'geometry',
}: {
  sel: Selection;
  group: GroupId | 'compare' | 'context';
  distView: DistributionView;
  designView: DesignView;
  set: SetControls;
  onDesign: (design: LiveBlast) => void;
  onHole: (mm: number) => void;
  /** The Design controls are split in two rail sections: the geometry, then the charge and the rock. */
  part?: 'geometry' | 'charge';
}) {
  if (group === 'distribution') return distView === 'decide' ? <DecideRail sel={sel} set={set} /> : <CurvesRail sel={sel} set={set} />;
  if (group === 'design') return designView === 'bench' ? <BenchRail sel={sel} set={set} /> : <DesignRail sel={sel} set={set} onDesign={onDesign} onHole={onHole} part={part} />;
  if (group === 'rock') return <RockRail sel={sel} set={set} />;
  return null;
}

function CurvesRail({ sel, set }: { sel: Selection; set: SetControls }) {
  return (
    <>
      <Knob
        id="undulation"
        label={{ en: 'Undulation (three-parameter)', es: 'Ondulación (tres parámetros)' }}
        hint={{ en: 'The Swebrec shape parameter; no source held for this work publishes it.', es: 'El parámetro de forma de Swebrec; ninguna fuente consultada lo publica.' }}
        value={sel.controls.undulation}
        min={1}
        max={4}
        step={0.1}
        unit=""
        format={{ decimals: 1 }}
        onChange={(undulation) => set({ undulation })}
      />
      <Knob
        id="fines"
        label={{ en: 'Fines fraction (crush zone)', es: 'Fracción de finos (zona triturada)' }}
        hint={{ en: 'The share of the charge’s crushed zone in the fines branch; unpublished, yours.', es: 'La fracción de la zona triturada en la rama de finos; no publicada, suya.' }}
        value={sel.controls.finesFraction * 100}
        min={0}
        max={25}
        step={1}
        unit="%"
        format={{ decimals: 0 }}
        onChange={(v) => set({ finesFraction: v / 100 })}
      />
    </>
  );
}

function DecideRail({ sel, set }: { sel: Selection; set: SetControls }) {
  return (
    <>
      <Knob
        id="target-p80"
        label={{ en: 'Target P80', es: 'P80 objetivo' }}
        hint={{ en: 'The 80 percent passing size your crusher is specified for.', es: 'El tamaño 80 por ciento pasante para el que se especifica su chancadora.' }}
        value={sel.controls.targetP80Cm}
        min={10}
        max={150}
        step={5}
        unit="cm"
        format={{ decimals: 0 }}
        onChange={(targetP80Cm) => set({ targetP80Cm })}
      />
      <Knob
        id="oversize"
        label={{ en: 'Oversize limit', es: 'Límite de sobretamaño' }}
        hint={{ en: 'The size above which a fragment needs secondary breakage.', es: 'El tamaño sobre el cual un fragmento necesita fragmentación secundaria.' }}
        value={sel.controls.oversizeCm}
        min={40}
        max={200}
        step={5}
        unit="cm"
        format={{ decimals: 0 }}
        onChange={(oversizeCm) => set({ oversizeCm })}
      />
    </>
  );
}

const RATIO_UNIT: Partial<Record<keyof LiveBlast, BiText>> = { Pf_kg_m3: 'kg/m³', XB_m: 'm', E_GPa: 'GPa' };

// B/D and S/B are the response surface's axes, moved by its marker (pointer or arrow keys), so the rail holds the
// ratios the map keeps fixed.
const GEOMETRY: (keyof LiveBlast)[] = ['H_over_B', 'T_over_B'];
const CHARGE: (keyof LiveBlast)[] = ['Pf_kg_m3', 'XB_m', 'E_GPa'];

function DesignRail({
  sel,
  set,
  onDesign,
  onHole,
  part,
}: {
  sel: Selection;
  set: SetControls;
  onDesign: (design: LiveBlast) => void;
  onHole: (mm: number) => void;
  part: 'geometry' | 'charge';
}) {
  return (
    <>
      {FEATURES.filter((k) => (part === 'geometry' ? GEOMETRY : CHARGE).includes(k)).map((k) => {
        const [min, max, step] = RANGE[k];
        const label = FEATURE_LABEL[k] ?? { en: k, es: k };
        // The labels carry their unit after a comma ("Powder factor, kg/m3"); the knob shows the unit itself.
        const bare = { en: label.en.replace(/, [^,]*$/, ''), es: label.es.replace(/, [^,]*$/, '') };
        return (
          <Knob
            key={k}
            id={k}
            label={bare}
            value={sel.design[k]}
            min={min}
            max={max}
            step={step}
            unit={RATIO_UNIT[k] ?? ''}
            format={{ decimals: step < 0.1 ? 2 : 1 }}
            onChange={(v) => onDesign({ ...sel.design, [k]: v })}
          />
        );
      })}
      {part === 'geometry' ? (
        <Knob
          id="hole"
          label={{ en: 'Hole diameter', es: 'Diámetro de perforación' }}
          value={sel.holeMm}
          min={76}
          max={250}
          step={1}
          unit="mm"
          format={{ decimals: 0 }}
          onChange={onHole}
        />
      ) : null}
      {part === 'charge' ? (
        <ChipGroup
          id="quantity"
          label={{ en: 'The map shows', es: 'El mapa muestra' }}
          options={[
            { id: 'p80', label: 'P80', hint: { en: 'The 80 percent passing size, against the crusher specification', es: 'El tamaño 80 por ciento pasante, frente a la especificación de chancado' } },
            { id: 'x50', label: 'x50', hint: { en: 'The mean size the models predict', es: 'El tamaño medio que predicen los modelos' } },
          ]}
          value={sel.controls.quantity}
          onChange={(q) => set({ quantity: q as Controls['quantity'] })}
        />
      ) : null}
    </>
  );
}

function BenchRail({ sel, set }: { sel: Selection; set: SetControls }) {
  return (
    <>
      <ChipGroup
        id="tie-in"
        label={{ en: 'Tie-in', es: 'Amarre' }}
        options={[
          { id: 'row-by-row', label: { en: 'row by row', es: 'fila por fila' } },
          { id: 'v-cut', label: { en: 'V-cut', es: 'corte en V' } },
          { id: 'reverse', label: { en: 'reversed', es: 'invertido' } },
        ]}
        value={sel.controls.tieIn}
        onChange={(v) => set({ tieIn: v as TieIn })}
      />
      <Knob
        id="delay"
        label={{ en: 'Inter-hole delay', es: 'Retardo entre barrenos' }}
        hint={{ en: 'Moves the animation, not a prediction: the timing factor is a single number.', es: 'Mueve la animación, no una predicción: el factor de tiempo es un solo número.' }}
        value={sel.controls.delayMs}
        min={1}
        max={40}
        step={1}
        unit="ms"
        format={{ decimals: 0 }}
        onChange={(delayMs) => set({ delayMs })}
      />
    </>
  );
}

function RockRail({ sel, set }: { sel: Selection; set: SetControls }) {
  const r = rockSchemes(sel);
  return (
    <>
      <Knob id="ucs" label={{ en: 'Uniaxial compressive strength', es: 'Resistencia a la compresión uniaxial' }} value={sel.controls.ucs} min={10} max={250} step={5} unit="MPa" format={{ decimals: 0 }} onChange={(ucs) => set({ ucs })} />
      <Knob id="density" label={{ en: 'Density', es: 'Densidad' }} value={sel.controls.density} min={1.8} max={3.5} step={0.05} unit="t/m³" format={{ decimals: 2 }} onChange={(density) => set({ density })} />
      <Knob id="joints" label={{ en: 'Joint spacing', es: 'Espaciamiento de juntas' }} value={sel.controls.jointSpacing} min={0.02} max={2} step={0.02} unit="m" format={{ decimals: 2 }} onChange={(jointSpacing) => set({ jointSpacing })} />
      <Readout
        title={{ en: 'The rock factor A', es: 'El factor de roca A' }}
        lane="live"
        provenance="published"
        dataKey={sel.stateKey}
        items={[
          { label: { en: 'Scheme A', es: 'Esquema A' }, value: r.factorA, unitless: true, format: { decimals: 2 } },
          { label: { en: 'Scheme B', es: 'Esquema B' }, value: r.factorB, unitless: true, format: { decimals: 2 } },
          { label: { en: 'Recovered', es: 'Recuperado' }, value: r.recovered, unitless: true, format: { decimals: 2 } },
        ]}
      />
    </>
  );
}
