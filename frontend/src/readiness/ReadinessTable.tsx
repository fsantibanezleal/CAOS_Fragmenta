// Every catalog row with its declared state: the Implementation page's "what is real in this build".
import { useShellLang } from '@fasl-work/caos-app-shell';

import { NoteLine, PROVENANCE_LABEL, STATE_LABEL, WRAP } from './ReadinessNote';
import { viewState } from './readiness';
import { useReadiness } from './useReadiness';

export function ReadinessTable() {
  const lang = useShellLang();
  const doc = useReadiness();
  if (doc === undefined) {
    return (
      <p className="caos-pending" data-state="loading">
        {lang === 'es' ? 'Cargando el documento de disponibilidad' : 'Loading the readiness document'}
      </p>
    );
  }
  if (doc === null) return <NoteLine view={viewState(null, [])} lang={lang} />;
  const head =
    lang === 'es'
      ? ['Contrato', 'Versión', 'Estado del catálogo', 'Procedencia', 'Estado', 'Razón']
      : ['Contract', 'Version', 'Catalog status', 'Provenance', 'State', 'Reason'];
  return (
    <div className="fr-scroll-x">
      <table className="fr-table" data-state="ready">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.contracts.map((c) => (
            <tr key={c.id} data-readiness={c.state}>
              <td>
                <code>{c.id}</code>
              </td>
              <td>{c.version}</td>
              <td>{c.status}</td>
              <td>{c.provenance ? PROVENANCE_LABEL[c.provenance][lang] : '-'}</td>
              <td>{STATE_LABEL[c.state][lang]}</td>
              <td style={WRAP}>{c.reason ? c.reason[lang] : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
