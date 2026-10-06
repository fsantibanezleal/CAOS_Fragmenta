/**
 * The App route (ADR-0016 s9, ADR-0071, ADR-0078): one shell `CaseWorkbench` for the selected case.
 *
 * The rail holds the case picker and the case's design variants (the shell's), then the model and blast pickers, the
 * selected model's score, and the controls and live values of the open group only. The instrument holds four
 * question groups (Predict, Distribution, Design, Rock), the comparison of the variants and the case's write-up.
 * Every control value enters the selection key, so a view still showing an earlier selection says so.
 *
 * Anything that summarises across cases belongs on Experiments or Benchmark, not here.
 */

import { CaseWorkbench, pick, useShellLang, useWorkbenchState, type CaseDef, type RailSection } from '@fasl-work/caos-app-shell';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { applyVariant, DEFAULT_HOLE_MM, designOf } from '../engine/design';
import type { LiveBlast } from '../engine/live';
import { CATEGORY_LABEL, loadCase, loadIndex } from '../lib/artifacts';
import type { CaseArtifact, CaseIndex, VariantDef } from '../lib/contract.types';
import { useModels } from '../lib/facts';
import { DesignGroup } from './design';
import {
  DEFAULT_ARM,
  DEFAULT_CASE,
  DEFAULT_CONTROLS,
  type Controls,
  type DesignView,
  type DistributionView,
  type GroupId,
  type Selection,
} from './model';
import { ArmPicker, BlastPicker, GroupRail, ScoreReadout } from './rail';
import { canDrawCurves, CompareView, ContextView, DistributionGroup, PredictGroup, RockGroup } from './views';

const LOADING = { en: 'Loading the case artifacts', es: 'Cargando los artefactos del caso' };

const LEVER: Record<string, { en: string; es: string }> = {
  B_over_D: { en: 'Burden', es: 'Bordo' },
  S_over_B: { en: 'Spacing', es: 'Espaciamiento' },
  H_over_B: { en: 'Bench', es: 'Banco' },
  T_over_B: { en: 'Stemming', es: 'Taco' },
  Pf_kg_m3: { en: 'Powder', es: 'Carga' },
  XB_m: { en: 'Blocks', es: 'Bloques' },
  E_GPa: { en: 'Modulus', es: 'Módulo' },
};

/** A variant's chip: the lever and its change ("Burden -15%"); the registry's sentence becomes the variant's note. */
function variantChip(v: VariantDef): { en: string; es: string } {
  const lever = LEVER[v.field];
  if (!lever || v.field === 'none') return v.label;
  const pct = Math.round((v.factor - 1) * 100);
  const sign = pct > 0 ? '+' : '-';
  return { en: `${lever.en} ${sign}${Math.abs(pct)}%`, es: `${lever.es} ${sign}${Math.abs(pct)} %` };
}

/** A view's data, keyed to the selection it was computed for; a case still loading reads as loading. */
function Keyed({ sel, render }: { sel: Omit<Selection, 'stateKey'> | null; render: (sel: Selection) => ReactNode }) {
  const lang = useShellLang();
  const stateKey = useWorkbenchState()?.stateKey;
  if (!sel) {
    return (
      <p className="caos-pending" data-state="loading">
        {pick(LOADING, lang)}
      </p>
    );
  }
  return <>{render({ ...sel, stateKey })}</>;
}

const initialCase = () => {
  try {
    return new URLSearchParams(window.location.search).get('case') ?? DEFAULT_CASE;
  } catch {
    return DEFAULT_CASE;
  }
};

export default function Workbench() {
  const lang = useShellLang();
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string>(initialCase);
  const [artifact, setArtifact] = useState<CaseArtifact | null>(null);
  const models = useModels(artifact?.case.id === caseId ? (artifact.live_models?.scope ?? null) : null);
  const [armId, setArmId] = useState(DEFAULT_ARM);
  const [blastId, setBlastId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState('base');
  // The reader's changes to the design, valid only for the case, blast and variant they were made on.
  const [edits, setEdits] = useState<{ key: string; design: LiveBlast; holeMm: number } | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [group, setGroup] = useState<string>('predict');
  const [distView, setDistView] = useState<DistributionView>('curves');
  const [designView, setDesignView] = useState<DesignView>('surface');

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    let live = true;
    loadCase(caseId)
      .then((loaded) => {
        if (!live) return;
        setArtifact(loaded);
        setBlastId(loaded.representative_blast_id);
        setVariantId('base');
        setEdits(null);
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [caseId]);

  const ready = artifact && artifact.case.id === caseId ? artifact : null;
  const blast = ready ? (ready.blasts.find((b) => b.blast_id === blastId) ?? ready.blasts[0]) : null;
  const variant = ready?.variants.find((v) => v.id === variantId);
  const editKey = `${caseId}|${blast?.blast_id ?? ''}|${variantId}`;
  const base = useMemo(() => (blast ? applyVariant(designOf(blast), variant) : null), [blast, variant]);
  const baseHole = blast?.pattern?.hole_diameter_mm ?? DEFAULT_HOLE_MM;
  const current = edits && edits.key === editKey ? edits : null;
  const design = current?.design ?? base;
  const holeMm = current?.holeMm ?? baseHole;
  const asFired = variantId === 'base' && current === null;

  const sel: Omit<Selection, 'stateKey'> | null = useMemo(
    () =>
      ready && blast && design
        ? { artifact: ready, models, blast, armId, variantId, design, holeMm, asFired, controls }
        : null,
    [ready, models, blast, armId, variantId, design, holeMm, asFired, controls],
  );

  const set = useCallback((patch: Partial<Controls>) => setControls((c) => ({ ...c, ...patch })), []);
  const onDesign = useCallback(
    (next: LiveBlast) => setEdits({ key: editKey, design: next, holeMm }),
    [editKey, holeMm],
  );
  const onHole = useCallback(
    (mm: number) => design && setEdits({ key: editKey, design, holeMm: mm }),
    [editKey, design],
  );
  const onReset = useCallback(() => {
    setEdits(null);
    setVariantId('base');
  }, []);

  if (error) {
    return (
      <div className="page-body fr-error" role="alert">
        <h2>{lang === 'es' ? 'No se pudieron cargar los artefactos' : 'The artifacts did not load'}</h2>
        <p>{error}</p>
      </div>
    );
  }

  const cases: CaseDef[] = (index?.cases ?? []).map((entry) => ({
    id: entry.case_id,
    name: entry.title[lang],
    category: CATEGORY_LABEL[entry.category]?.[lang] ?? entry.category,
    kind: entry.real_or_synthetic === 'real' ? 'real' : 'synthetic',
  }));

  const realCase = ready?.case.real_or_synthetic === 'real';
  // A group is offered only where it has something to draw: no curve without a geometry and a rock factor.
  const curvesHere = sel ? canDrawCurves(sel) : true;
  const shownGroup = !curvesHere && group === 'distribution' ? 'predict' : group;
  const openGroup = shownGroup as GroupId | 'compare' | 'context';
  // The shell keeps the open rail section by id and falls back to the first when that id is gone. The ids carry
  // the group, and a group's own controls come first, so opening a group opens its controls.
  const railSections: RailSection[] = [
    {
      id: `model-${openGroup}`,
      label: { en: 'Model', es: 'Modelo' },
      content: ready && blast ? (
        <Keyed
          sel={sel}
          render={(s) => (
            <>
              <ArmPicker artifact={ready} armId={armId} onArm={setArmId} />
              <BlastPicker artifact={ready} blastId={blast.blast_id} onBlast={(id) => setBlastId(id)} />
              {openGroup === 'predict' ? <ScoreReadout sel={s} /> : null}
            </>
          )}
        />
      ) : (
        <p className="caos-pending" data-state="loading">{pick(LOADING, lang)}</p>
      ),
    },
  ];
  const scoped = (part?: 'geometry' | 'charge') =>
    sel ? (
      <Keyed
        sel={sel}
        render={(s) => (
          <GroupRail sel={s} group={openGroup} distView={distView} designView={designView} set={set} onDesign={onDesign} onHole={onHole} part={part} />
        )}
      />
    ) : null;
  if (openGroup === 'design' && designView === 'surface') {
    railSections.unshift(
      { id: 'view-design-geometry', label: { en: 'Geometry', es: 'Geometría' }, content: scoped('geometry') },
      { id: 'view-design-charge', label: { en: 'Charge', es: 'Carga' }, content: scoped('charge') },
    );
  } else if (openGroup === 'distribution' || openGroup === 'design' || openGroup === 'rock') {
    railSections.unshift({
      id: `view-${openGroup}-${openGroup === 'distribution' ? distView : openGroup === 'design' ? designView : 'rock'}`,
      label:
        openGroup === 'distribution'
          ? distView === 'decide'
            ? { en: 'Your specification', es: 'Su especificación' }
            : { en: 'The curves', es: 'Las curvas' }
          : openGroup === 'design'
            ? designView === 'bench'
              ? { en: 'Initiation', es: 'Iniciación' }
              : { en: 'The design', es: 'El diseño' }
            : { en: 'The rock', es: 'La roca' },
      content: scoped(),
    });
  }

  return (
    <CaseWorkbench
      caseId={caseId}
      source={ready?.case.real_or_synthetic}
      cases={{
        cases,
        selectedId: caseId,
        onSelect: (id) => {
          if (id !== caseId) setCaseId(id);
        },
        layout: 'select',
        deepLink: true,
        lang,
        modifiedFromId: current ? caseId : null,
        onResetToCanonical: onReset,
      }}
      variants={
        ready && ready.variants.length > 1 && (openGroup === 'distribution' || (openGroup === 'design' && designView === 'surface') || openGroup === 'compare')
          ? {
              variants: ready.variants.map((v) => ({ id: v.id, label: variantChip(v), note: v.field === 'none' ? undefined : v.label, lane: 'live' as const })),
              activeId: variantId,
              onSelect: (id) => {
                setVariantId(id);
                setEdits(null);
              },
              title: { en: 'Design variant', es: 'Variante de diseño' },
              lane: 'live',
            }
          : undefined
      }
      controls={{ arm: armId, blast: blast?.blast_id ?? null, ...controls, design: current?.design ?? null, hole: current?.holeMm ?? null }}
      rail={railSections}
      railLabel={{ en: 'Case, model and controls', es: 'Caso, modelo y controles' }}
      group={shownGroup}
      onGroupChange={setGroup}
      groups={[
        {
          id: 'predict',
          label: { en: 'Predict', es: 'Predecir' },
          lane: 'replay',
          provenance: realCase ? 'real' : 'synthetic',
          content: <Keyed sel={sel} render={(s) => <PredictGroup sel={s} onSelectBlast={setBlastId} onArm={setArmId} />} />,
        },
        ...(curvesHere
          ? [
              {
                id: 'distribution',
                label: { en: 'Distribution', es: 'Distribución' },
                lane: 'live' as const,
                provenance: realCase && asFired ? ('real' as const) : ('synthetic' as const),
                content: <Keyed sel={sel} render={(s) => <DistributionGroup sel={s} view={distView} onView={setDistView} />} />,
              },
            ]
          : []),
        {
          id: 'design',
          label: { en: 'Design', es: 'Diseño' },
          lane: 'live',
          provenance: 'synthetic',
          content: <Keyed sel={sel} render={(s) => <DesignGroup sel={s} view={designView} onView={setDesignView} onDesign={onDesign} />} />,
        },
        {
          id: 'rock',
          label: { en: 'Rock', es: 'Roca' },
          lane: 'live',
          provenance: 'published',
          content: <Keyed sel={sel} render={(s) => <RockGroup sel={s} />} />,
        },
      ]}
      compare={{
        label: { en: 'Compare the variants', es: 'Comparar las variantes' },
        lane: 'replay',
        provenance: 'synthetic',
        content: <Keyed sel={sel} render={(s) => <CompareView sel={s} onVariant={(id) => { setVariantId(id); setEdits(null); }} />} />,
      }}
      context={{
        label: { en: 'The case', es: 'El caso' },
        content: <Keyed sel={sel} render={(s) => <ContextView sel={s} />} />,
      }}
      ariaLabel={{ en: 'Workbench views', es: 'Vistas del banco de trabajo' }}
    />
  );
}
