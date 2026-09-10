// The browser gate: does the built site actually WORK, in every theme and both languages.
//
// It lives here, in the product, rather than in a shared screenshot harness, because a gate written
// against another product's DOM passes by accident and proves nothing.
//
// It earned itself on its first run. The deployed site had been serving 200 on every route while
// rendering a completely blank page: two copies of react-router were installed, the shell's
// useLocation read a different context than the app's BrowserRouter provided, and every route threw
// before painting a character. Nothing in the pipeline noticed, because every check upstream of the
// browser was green and the HTTP status was 200. A 200 on an SPA says the file was served, and
// nothing whatsoever about whether the application mounted.
//
// The second thing it caught, once the first was fixed: a chart was passed `hooks.draw: undefined`,
// which uPlot copies onto its hook table and then calls .forEach on, taking three views to a blank
// page.
//
// What it asserts, per route, per theme, per language:
//   - the page loaded with no console error and no failed request;
//   - the document does not scroll horizontally at any of three viewports;
//   - no panel fell into its error boundary;
//   - every chart on screen DECLARES what it drew, and the declaration is non-zero. The renderer
//     sets data-chart-* itself, because sampling pixels cannot tell an empty canvas from a canvas
//     that never mounted;
//   - the workbench opens all six tabs and each one renders the panels it owns;
//   - the idle page is at rest: no chart rebuilding itself when nobody is touching it.
//
// Usage:
//   npm run build && npx vite preview --port 4173 &
//   node gates/browser-gate.mjs --url http://localhost:4173
//   node gates/browser-gate.mjs --url https://fragmenta.fasl-work.com --shots ./out
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1]]);
    return acc;
  }, []),
);
const BASE = (args.url || 'https://fragmenta.fasl-work.com').replace(/\/$/, '');
const SHOTS = args.shots || null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Both forms of every deep route, and the trailing slash is not padding.
//
// GitHub Pages serves a route as a directory, so it redirects /benchmark to /benchmark/ and the
// page's base URL gains a path segment. Any relative fetch then resolves UNDER the route: a
// `data/benchmark.json` becomes `/benchmark/data/benchmark.json` and 404s. A local preview server
// answers /benchmark directly with no redirect, so the base URL stays at the root, the relative
// path resolves correctly and the bug is invisible until it is in production. It was: the site
// 404ed its data on every route except the landing page while every local check passed.
const ROUTES = [
  '/',
  '/introduction',
  '/introduction/',
  '/methodology/',
  '/implementation/',
  '/experiments',
  '/experiments/',
  '/benchmark',
  '/benchmark/',
];
const TABS = ['predict', 'distribution', 'bench', 'rock', 'explain', 'decide'];
/**
 * ADR-0071 rule 8 asks for at least 0.50 of the viewport, and this product cannot reach it.
 *
 * The App route's instrument is a parity plot, which has to be SQUARE: unequal scales put the
 * identity line at an angle a reader interprets as bias. A square's area on a 16:9 screen is capped
 * by the pane HEIGHT, and the pane is the viewport minus the header, the footer, the tab strip and
 * the page padding. At 1600x900 that leaves about 680px, so the largest honest square is about 0.32
 * of the screen; at 2560x1440 it reaches 0.36. Reaching 0.50 would need a side of 848px in a 680px
 * pane, which is not a layout problem.
 *
 * So this floor is what the layout can actually deliver, measured after the fixes of 0.03.000, and
 * the shortfall against the ADR is written down rather than hidden by a looser number. Changing it
 * to meet 0.50 means changing WHICH chart lands on the App route, which is a product decision.
 */
const INSTRUMENT_FLOOR = 0.26;

const VIEWPORTS = [
  [1280, 800],
  [1600, 900],
  [2560, 1440],
];

// Noise from the host page rather than from this product. Anything else is a failure.
const IGNORE = [/favicon/i, /Download the React DevTools/i, /ResizeObserver loop/i];

let failures = 0;
const report = [];

function fail(where, message) {
  failures++;
  report.push(`FAIL ${where}: ${message}`);
  console.log(`  FAIL ${where}: ${message}`);
}

function pass(where, detail) {
  report.push(`ok   ${where}${detail ? ': ' + detail : ''}`);
  console.log(`  ok   ${where}${detail ? ': ' + detail : ''}`);
}

/** What the page says about itself, read from the DOM rather than guessed from pixels. */
async function inspect(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const charts = [...document.querySelectorAll('[data-chart]')].map((el) => ({
      chart: el.getAttribute('data-chart'),
      declared: Object.fromEntries(
        [...el.attributes]
          .filter((a) => a.name.startsWith('data-chart-'))
          .map((a) => [a.name.replace('data-chart-', ''), Number(a.value)]),
      ),
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
    }));
    // Read the settings back from where the shell keeps them, rather than from a class name that
    // might be stale or from a colour sample that cannot tell a dark page from a dark image.
    let stored = {};
    try {
      stored = { lang: localStorage.getItem('caos.lang'), theme: localStorage.getItem('caos.theme') };
    } catch {
      stored = {};
    }
    return {
      title: document.title,
      lang: stored.lang || 'en',
      theme: de.getAttribute('data-theme') || stored.theme || getComputedStyle(de).colorScheme,
      overflowX: de.scrollWidth > window.innerWidth + 1,
      bodyText: (document.body.innerText || '').trim().length,
      panels: [...document.querySelectorAll('.fr-panel')].map((el) => ({
        id: el.getAttribute('data-panel') || '',
        heading: el.querySelector('h3')?.textContent?.trim() || '',
        height: Math.round(el.getBoundingClientRect().height),
      })),
      brokenPanels: [...document.querySelectorAll('.fr-panel-error')].map(
        (el) => el.closest('.fr-panel')?.querySelector('h3')?.textContent?.trim() || '?',
      ),
      charts,
      benchHoles: document.querySelector('[data-bench-holes]')?.getAttribute('data-bench-holes') ?? null,

      // ADR-0071, measured rather than judged by eye.
      //
      // `documentElement` is the WRONG element to ask about scrolling here: the shell makes `body`
      // the scroll container, so the root stays exactly the viewport height on every route and a
      // check against it passes whatever the page does. Ask the real scroller.
      bodyOverflowY: document.body.scrollHeight - document.body.clientHeight,
      bodyOverflowX: document.body.scrollWidth - document.body.clientWidth,
      // Rule 6: every CONTROL in the rail is reachable without scrolling it. The reading pane inside
      // the rail may scroll, because it is reading and not controls.
      railControlsBelowFold: (() => {
        const controls = [...document.querySelectorAll('.fr-rail select, .fr-railtabs, .fr-focus-link')];
        if (!controls.length) return null;
        const lowest = Math.max(...controls.map((el) => el.getBoundingClientRect().bottom));
        return Math.max(0, Math.round(lowest - window.innerHeight));
      })(),
      // Rule 7: a categorised one-of-N choice is a select with optgroups, not N buttons.
      caseSelectOptgroups: document.querySelector('.fr-rail select')?.querySelectorAll('optgroup').length ?? null,
      // Rule 8: the share of the screen the instrument actually occupies.
      instrumentFraction: (() => {
        let best = 0;
        for (const el of document.querySelectorAll('canvas, .fr-chart-canvas svg')) {
          const b = el.getBoundingClientRect();
          best = Math.max(best, b.width * b.height);
        }
        return +(best / (window.innerWidth * window.innerHeight)).toFixed(3);
      })(),
      // ADR-0017 rule 1: the shell owns the width. A page root that is not `.page-body` has picked
      // its own, which is the divergence that ADR banned by name.
      pageRoot: (() => {
        const el = document.querySelector('.page-body');
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return {
          wide: el.classList.contains('wide'),
          gutterLeft: Math.round(b.left),
          gutterRight: Math.round(window.innerWidth - b.right),
        };
      })(),
      benchDisclaimer: !!document.querySelector('[data-bench-disclaimer]'),
      // Per TABLIST, not across every tab on the page. There are two tablists on the App route now,
      // the workbench tabs and the rail's two sections, and counting the distinct tops of all of
      // them together reported "the tab strip wrapped onto 2 rows" for two strips that were each
      // perfectly on one row. ADR-0071 rule 4 is about one strip wrapping, not about how many
      // strips exist.
      tabs: [...document.querySelectorAll('.fr-main [role="tab"]')].map((t) => t.textContent?.trim()),
      tabRows: Math.max(
        0,
        ...[...document.querySelectorAll('[role="tablist"]')].map(
          (list) =>
            new Set(
              [...list.querySelectorAll('[role="tab"]')].map((t) =>
                Math.round(t.getBoundingClientRect().top),
              ),
            ).size,
        ),
      ),
    };
  });
}

const browser = await chromium.launch();

for (const [w, h] of VIEWPORTS) {
  for (const theme of ['light', 'dark']) {
    for (const lang of ['en', 'es']) {
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        colorScheme: theme,
        locale: lang === 'es' ? 'es-CL' : 'en-GB',
      });
      const page = await context.newPage();
      const problems = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) problems.push(m.text());
      });
      page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
      page.on('requestfailed', (r) => {
        if (!IGNORE.some((x) => x.test(r.url()))) problems.push('request failed: ' + r.url());
      });
      // A 404 is a SUCCESSFUL http exchange, so requestfailed never sees it. And on a static host
      // with a single-page fallback, a missing artifact comes back as the app's own index.html with
      // a 200, which a status check cannot see either. Both were real here: the data paths were
      // written relative, so they resolved under the current route and 404ed on every page except
      // the landing one, while a dev server answered the same wrong URL with HTML and a 200 and hid
      // it completely. So this checks the status AND, for a data URL, that what came back is JSON.
      page.on('response', async (r) => {
        const url = r.url();
        if (IGNORE.some((x) => x.test(url))) return;
        if (r.status() >= 400) {
          problems.push(`${r.status()} on ${url}`);
          return;
        }
        if (/\/data\//.test(url) && !/\.(png|jpg|svg|woff2?)/.test(url)) {
          const type = r.headers()['content-type'] || '';
          if (!/json/i.test(type)) {
            problems.push(`${url} came back as ${type || 'no content-type'} rather than JSON`);
          }
        }
      });

      for (const route of ROUTES) {
        const where = `${w}x${h} ${theme} ${lang} ${route}`;
        problems.length = 0;
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
        // The shell persists both settings under these EXACT keys. The first version of this gate
        // guessed 'caos-lang' and 'caos-theme' with hyphens, so every "es" run rendered English and
        // the gate reported passing checks in a language it had never displayed. A gate has to
        // verify its own subject, which is why the language is asserted below rather than assumed.
        await page.evaluate(
          ([t, l]) => {
            localStorage.setItem('caos.theme', t);
            localStorage.setItem('caos.lang', l);
          },
          [theme, lang],
        );
        await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);

        const info = await inspect(page);

        if (info.lang !== lang) fail(where, `asked for ${lang} and the page is in ${info.lang}`);
        if (info.theme !== theme) fail(where, `asked for the ${theme} theme and the page is ${info.theme}`);

        if (problems.length) fail(where, problems.slice(0, 3).join(' | '));
        else if (info.overflowX) fail(where, 'the document scrolls horizontally');
        else if (info.bodyText < 400) fail(where, `only ${info.bodyText} characters rendered`);
        else if (info.brokenPanels.length)
          fail(where, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
        else pass(where, `${info.panels.length} panels, ${info.charts.length} charts`);

        // ADR-0071 and ADR-0017, asserted. These were all failing before 0.03.000, and none of them
        // was visible from any check that did not open a browser at a stated size.
        if (!info.pageRoot) {
          fail(where, 'the page root is not the shell .page-body, so this route picked its own width');
        } else if (!info.pageRoot.wide && Math.abs(info.pageRoot.gutterLeft - info.pageRoot.gutterRight) > 2) {
          fail(
            where,
            `capped but not centred: ${info.pageRoot.gutterLeft}px left against ` +
              `${info.pageRoot.gutterRight}px right`,
          );
        }
        if (info.bodyOverflowX > 1) fail(where, `the page is ${info.bodyOverflowX}px wider than the screen`);

        if (route === '/' || route === '/app') {
          // The App route is locked to the viewport, so NOTHING may scroll the page itself.
          if (info.bodyOverflowY > 2) fail(where, `the App route scrolls the page by ${info.bodyOverflowY}px`);
          if (info.railControlsBelowFold === null) fail(where, 'the rail has no controls to check');
          else if (info.railControlsBelowFold > 0)
            fail(where, `${info.railControlsBelowFold}px of rail controls below the fold (ADR-0071 rule 6)`);
          if (!info.caseSelectOptgroups)
            fail(where, 'the case control is not a select with optgroups (ADR-0071 rule 7)');
          if (info.instrumentFraction < INSTRUMENT_FLOOR)
            fail(
              where,
              `the instrument is ${info.instrumentFraction} of the viewport, under the ` +
                `${INSTRUMENT_FLOOR} this layout can reach`,
            );
          else pass(`${where} instrument`, `${info.instrumentFraction} of the viewport`);
        }

        for (const chart of info.charts) {
          const total = Object.values(chart.declared).reduce((a, b) => a + b, 0);
          if (!total) fail(where, `the ${chart.chart} chart declared nothing drawn`);
          if (chart.width < 200 || chart.height < 120)
            fail(where, `the ${chart.chart} chart is ${chart.width}x${chart.height}, too small to read`);
        }

        if (SHOTS) {
          const name = `${route.replace(/\//g, '_') || '_root'}-${theme}-${lang}-${w}x${h}.png`;
          await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: false });
        }
      }

      // The workbench, tab by tab. A route that renders is not the same as a route that works.
      problems.length = 0;
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1200);
      for (const tab of TABS) {
        const where = `${w}x${h} ${theme} ${lang} tab:${tab}`;
        const button = page.locator('.fr-main [role="tab"]').nth(TABS.indexOf(tab));
        if (!(await button.count())) {
          fail(where, 'the tab is not on the page');
          continue;
        }
        await button.click();
        await page.waitForTimeout(900);
        const info = await inspect(page);
        if (problems.length) fail(where, problems.slice(0, 2).join(' | '));
        else if (info.brokenPanels.length)
          fail(where, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
        else if (info.tabRows !== 1) fail(where, `the tab strip wrapped onto ${info.tabRows} rows`);
        else if (!info.panels.length && !info.charts.length && info.benchHoles === null)
          fail(where, 'the tab rendered neither a panel nor a chart');
        else
          pass(
            where,
            `${info.panels.length} panels, ${info.charts.length} charts` +
              (info.benchHoles !== null ? `, ${info.benchHoles} holes` : ''),
          );

        if (tab === 'bench' && !info.benchDisclaimer)
          fail(where, 'the 3D bench lost its timing disclaimer');

        if (SHOTS) {
          await page.screenshot({ path: `${SHOTS}/tab-${tab}-${theme}-${lang}-${w}x${h}.png` });
        }
      }

      // Idle at rest: nothing may redraw while nobody is touching the page.
      const redraws = await page.evaluate(async () => {
        const canvases = [...document.querySelectorAll('canvas')];
        if (!canvases.length) return -1;
        let n = 0;
        for (const c of canvases) {
          const ctx = c.getContext('2d');
          if (!ctx) continue;
          const original = ctx.clearRect.bind(ctx);
          ctx.clearRect = (...a) => {
            n++;
            return original(...a);
          };
        }
        await new Promise((r) => setTimeout(r, 3000));
        return n;
      });
      const idleWhere = `${w}x${h} ${theme} ${lang} idle`;
      // The 3D bench animates on a WebGL canvas by design and is not counted here; this counts 2D
      // canvas clears, which should be zero on a page nobody is touching.
      if (redraws > 2) fail(idleWhere, `${redraws} canvas redraws in 3 idle seconds`);
      else pass(idleWhere, `${Math.max(redraws, 0)} redraws in 3 idle seconds`);

      await context.close();
    }
  }
}

await browser.close();

console.log('\n' + report.filter((r) => r.startsWith('FAIL')).join('\n'));
console.log(
  `\nFRAGMENTA GATE ${failures ? 'FAILED' : 'PASSED'}: ` +
    `${report.length - failures} checks passed, ${failures} failed, against ${BASE}`,
);
process.exit(failures ? 1 : 0);
