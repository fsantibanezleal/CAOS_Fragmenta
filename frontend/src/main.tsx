import {
  AppShell,
  applyTheme,
  CitationsProvider,
  readTheme,
  type ShellConfig,
  useShellLang,
} from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import { Hammer } from 'lucide-react';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import './fragmenta.css';
import { architecture } from './architecture';
import { CITATIONS } from './data/citations';
import { APP_VERSION } from './lib/artifacts';
import Benchmark from './pages/Benchmark';
import Experiments from './pages/Experiments';
import Focus from './pages/Focus';
import Implementation from './pages/Implementation';
import Introduction from './pages/Introduction';
import Methodology from './pages/Methodology';
import Tool from './pages/Tool';

applyTheme(readTheme());

/**
 * Shell known defect 4 (caos-app-shell 0.6.x): the document language never follows the interface.
 *
 * The shell keeps the language in its own store and never writes it to the document, so every
 * Spanish page declared `<html lang="en">`: measured here, switching to Spanish left the root at
 * "en". A screen reader then reads a Spanish page with an English voice, a search engine files it as
 * English, and the browser offers to translate a page already in the reader's language. Nothing on
 * screen looks wrong, which is why it shipped.
 *
 * Rendered ONCE, above the routes, rather than inside AppShell as the defect record suggests: the
 * focus route renders outside the shell on purpose, and it has a language too. The shell's language
 * lives in a global store, so this component does not need the shell around it.
 *
 * Recorded in CAOS_MANAGE conventions/shell-known-defects.md, entry 4. Remove when a shell release
 * writes the language itself, and not before.
 */
function DocumentLanguage(): null {
  const lang = useShellLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

const config: ShellConfig = {
  product: { name: 'Fragmenta', mark: <Hammer size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introducción' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/implementation', en: 'Implementation', es: 'Implementación' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_Fragmenta' },
  version: APP_VERSION,
  // The App route is an instrument, so it is sized to the viewport rather than allowed to grow
  // (ADR-0071 rules 1 and 6). The shell's `fixed` mode locks the shell to 100dvh and hands the
  // remaining height to `.page-body.wide`, which is what makes a bounded rail possible at all: a
  // rail with `height: 100%` inside an ancestor chain that has no height simply grows, and it did.
  // Measured before this: the rail was 1717px tall in an 800px viewport, so 917px of controls sat
  // below the fold on first paint. Doc routes stay scrollable and are deliberately not listed.
  fixedRoutes: ['/', '/app'],
  architecture,
  footer: {
    // COMPACT, and the word is load-bearing (ADR-0016 section 2: one wrapping line).
    //
    // What was here ran to four wrapped lines each, and the footer measured 116px. On a route the
    // shell locks to the viewport that is 13% of a 900px screen permanently gone from the
    // instrument, which is the space ADR-0071 rule 8 is trying to protect. The long forms are not
    // lost: the full provenance with every DOI is on Implementation, and the full disclaimer with
    // what is and is not modelled is on Benchmark, which is where there is room to read them.
    provenance: {
      en: 'Engine: blastfrag (MIT). Data: 116 published blasts, reused with citation; the source articles are not redistributed.',
      es: 'Motor: blastfrag (MIT). Datos: 116 tiros publicados, reutilizados con cita; los artículos no se redistribuyen.',
    },
    disclaimer: {
      en: 'Every prediction is a model, shown with its statistic beside it. Not for production blast design.',
      es: 'Toda predicción es un modelo, con su estadístico al lado. No apta para diseño de voladura de producción.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DocumentLanguage />
      <CitationsProvider items={CITATIONS}>
        <Routes>
          {/* The focus view renders OUTSIDE the shell. The header and footer are exactly the chrome
              a focus view exists to escape, so it cannot be a child of AppShell. */}
          <Route path="/focus/:caseId" element={<Focus />} />
          <Route
            path="*"
            element={
              <AppShell config={config}>
                <Routes>
                  <Route path="/" element={<Tool />} />
                  <Route path="/app" element={<Tool />} />
                  <Route path="/introduction" element={<Introduction />} />
                  <Route path="/methodology" element={<Methodology />} />
                  <Route path="/implementation" element={<Implementation />} />
                  <Route path="/experiments" element={<Experiments />} />
                  <Route path="/benchmark" element={<Benchmark />} />
                  <Route path="*" element={<Tool />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
