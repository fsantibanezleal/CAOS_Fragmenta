/**
 * The focus route: one case, full screen, outside the shell.
 *
 * The header and footer are exactly the chrome a focus view exists to escape, so this cannot be a
 * child of the shell. It renders at the top of the router instead.
 *
 * The instrument owns at least 80 percent of the viewport here. Everything else is a thin bar.
 */

import { applyTheme, readTheme, useShellLang } from '@fasl-work/caos-app-shell';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ARM_BY_ID, formatScore, formatSize, loadCase } from '../lib/artifacts';
import type { CaseArtifact } from '../lib/contract.types';
import { ParityChart } from '../viz/Charts';

export default function Focus() {
  const { caseId } = useParams<{ caseId: string }>();
  const lang = useShellLang();
  const es = lang === 'es';
  const [artifact, setArtifact] = useState<CaseArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armId, setArmId] = useState('published-regression');
  const [selected, setSelected] = useState<string | null>(null);

  // A cold deep link into this route boots the app with no shell above it, so the theme has to be
  // applied here as well. Without it the page renders in the default theme regardless of choice.
  useEffect(() => {
    applyTheme(readTheme());
  }, []);

  useEffect(() => {
    if (!caseId) return;
    loadCase(caseId)
      .then((loaded) => {
        setArtifact(loaded);
        setSelected(loaded.representative_blast_id);
      })
      .catch((e) => setError(String(e)));
  }, [caseId]);

  if (error) {
    return (
      <div className="fr-focus">
        <div className="fr-error" role="alert">
          <h2>{es ? 'No se pudo cargar el caso' : 'The case did not load'}</h2>
          <p>{error}</p>
          <Link to="/">{es ? 'Volver al taller' : 'Back to the workbench'}</Link>
        </div>
      </div>
    );
  }
  if (!artifact) return <div className="fr-focus fr-loading">{es ? 'Cargando' : 'Loading'}</div>;

  const row = artifact.predictions[armId] ?? {};
  const score = artifact.scores[armId];
  const points = artifact.blasts
    .filter((b) => b.x50_measured_m !== null && row[b.blast_id]?.x50_m !== null)
    .map((b) => ({
      blastId: b.blast_id,
      site: b.site,
      measuredM: b.x50_measured_m as number,
      predictedM: row[b.blast_id].x50_m as number,
      extrapolated: row[b.blast_id].extrapolated,
    }));

  const available = Object.keys(artifact.predictions).filter(
    (arm) => artifact.scores[arm]?.scoreable,
  );

  return (
    <div className="fr-focus">
      <header className="fr-focus-bar">
        <Link className="fr-focus-back" to={`/?case=${artifact.case.id}`}>
          <ArrowLeft size={15} aria-hidden="true" />
          {es ? 'Taller' : 'Workbench'}
        </Link>
        <h1>{artifact.case.title[lang]}</h1>
        <select
          className="fr-select fr-select-compact"
          value={armId}
          onChange={(e) => setArmId(e.target.value)}
          aria-label={es ? 'Modelo' : 'Model'}
        >
          {available.map((arm) => (
            <option key={arm} value={arm}>
              {ARM_BY_ID.get(arm)?.label[lang] ?? arm}
            </option>
          ))}
        </select>
        {score?.scoreable ? (
          <span className="fr-focus-metrics">
            <b>{formatScore(score.r2_identity)}</b>{' '}
            {es ? 'varianza explicada' : 'variance explained'} · RMSE {formatSize(score.rmse_m)}
            {score.n_abstained ? ` · ${score.n_abstained} ${es ? 'abstenciones' : 'abstentions'}` : ''}
          </span>
        ) : null}
      </header>
      <main className="fr-focus-stage">
        {points.length >= 2 ? (
          <ParityChart
            points={points}
            nullMeanM={artifact.null_mean_m}
            selected={selected}
            onSelect={setSelected}
            height={640}
          />
        ) : (
          <p className="fr-note">
            {es
              ? 'Este caso no tiene mediciones que graficar, o el modelo se abstiene en todas ellas.'
              : 'This case has no measurements to plot, or the model abstains on all of them.'}
          </p>
        )}
      </main>
      <footer className="fr-focus-foot">
        <span>{artifact.provenance.leakage_note}</span>
      </footer>
    </div>
  );
}
