import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import { Hammer } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

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
  architecture,
  footer: {
    // One line of provenance and one of disclaimer. The long-form versions live on Implementation
    // and Benchmark and in the architecture modal, where there is room to read them.
    provenance: {
      en:
        'Engine: blastfrag (MIT), a separately published package. Data: 97 published bench blasts ' +
        '(doi:10.1002/nag.957), a 14-blast published hold-out (doi:10.1007/s10706-012-9496-3) and 5 ' +
        'field blasts (doi:10.3390/app15031254, CC BY). Numeric values reused with citation; the ' +
        'source articles are not redistributed.',
      es:
        'Motor: blastfrag (MIT), un paquete publicado aparte. Datos: 97 tiros de banco publicados ' +
        '(doi:10.1002/nag.957), un conjunto de validacion de 14 tiros (doi:10.1007/s10706-012-9496-3) ' +
        'y 5 tiros de terreno (doi:10.3390/app15031254, CC BY). Valores numericos reutilizados con ' +
        'cita; los articulos fuente no se redistribuyen.',
    },
    disclaimer: {
      en:
        'Every prediction is a model, shown with the name of its statistic and a constant predictor ' +
        'beside it. No mechanistic simulation, no flyrock, no ground vibration, no comminution model. ' +
        'Not for production blast design.',
      es:
        'Toda prediccion es un modelo, mostrada con el nombre de su estadistico y un predictor ' +
        'constante al lado. Sin simulacion mecanicista, sin proyeccion de rocas, sin vibracion, sin ' +
        'modelo de conminucion. No apto para diseno de voladura de produccion.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
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
