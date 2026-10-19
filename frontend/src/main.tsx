import { AppShell, applyTheme, CitationsProvider, Landing, readTheme, STANDARD_ROUTES, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
// The shell's chart (the parity plot) is sized by its own stylesheet: without it the plot has no height.
import '@fasl-work/caos-app-shell/chart.css';
import { Hammer } from 'lucide-react';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router';

import './fragmenta.css';
import { architecture } from './architecture';
import { CITATIONS } from './data/citations';
import { APP_VERSION } from './lib/artifacts';
import Benchmark from './pages/Benchmark';
import Experiments from './pages/Experiments';
import Implementation from './pages/Implementation';
import Introduction from './pages/Introduction';
import Methodology from './pages/Methodology';
import { focusForwardTarget, ROUTE_TABLE, type PageName } from './routes';
import Workbench from './workbench/Workbench';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'Fragmenta', mark: <Hammer size={18} aria-hidden="true" /> },
  // The shell's order: App, Introduction, Methodology, Implementation, Experiments, Benchmark (shell 0.13.1).
  routes: STANDARD_ROUTES,
  links: { github: 'https://github.com/fsantibanezleal/CAOS_Fragmenta' },
  version: APP_VERSION,
  build: __BUILD_ID__,
  // Required since shell 0.7.0: the footer shows the product's own licence, never a default.
  license: { en: 'MIT licence', es: 'Licencia MIT' },
  visibility: 'public',
  // Every route is the viewport (ADR-0071 rule 1, the template's configuration): the workbench fills it, and a
  // documentation route scrolls inside the main container, so the header and footer stay in view. This replaces
  // the `fixedRoutes` of 0.6.x, under which only the App route was bounded.
  contain: true,
  architecture,
  footer: {
    // ONE line at the reading width (ADR-0016 section 2, the Lidar3D footer). The long forms live
    // where there is room for them: every source with its DOI on Implementation, the scope and what
    // is not modelled on Introduction and Benchmark. Measured by the browser gate, which fails if
    // the footer wraps at 1600 px on a documentation route.
    //
    // The budget is measured, not guessed: at the 1200 px reading width the shell's fixed parts and
    // its gaps leave 344 px in English and 259 px in Spanish for these two strings. The data sources
    // are cited on every page that uses them, with their DOIs.
    provenance: {
      en: 'Engine: blastfrag (MIT)',
      es: 'Motor: blastfrag (MIT)',
    },
    disclaimer: {
      en: 'Research use only',
      es: 'Solo investigación',
    },
  },
};

/** An old `/focus/<caseId>` link: the App on that case in the shell's Focus mode (see routes.ts). */
function FocusForward() {
  const { caseId = '' } = useParams<{ caseId: string }>();
  return <Navigate to={focusForwardTarget(caseId)} replace />;
}

// The Introduction is the landing: `/` and every unknown path render <Landing />, which opens /introduction and forwards
// an old App link such as /?case=B2 to /app?case=B2. The path table is routes.ts.
const ELEMENT: Record<PageName, ReactNode> = {
  landing: <Landing />,
  app: <Workbench />,
  introduction: <Introduction />,
  methodology: <Methodology />,
  implementation: <Implementation />,
  experiments: <Experiments />,
  benchmark: <Benchmark />,
  'focus-forward': <FocusForward />,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <AppShell config={config}>
          <Routes>
            {ROUTE_TABLE.map((r) => (
              <Route key={r.path} path={r.path} element={ELEMENT[r.page]} />
            ))}
          </Routes>
        </AppShell>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
