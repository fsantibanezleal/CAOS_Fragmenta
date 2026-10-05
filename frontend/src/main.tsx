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
    license: { en: 'MIT', es: 'MIT' },
    disclaimer: {
      en: 'Research use only',
      es: 'Solo investigación',
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
