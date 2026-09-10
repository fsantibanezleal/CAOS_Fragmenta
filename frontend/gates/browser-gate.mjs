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
    return {
      title: document.title,
      theme: de.getAttribute('data-theme') || getComputedStyle(de).colorScheme,
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
      benchDisclaimer: !!document.querySelector('[data-bench-disclaimer]'),
      tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim()),
      tabRows: new Set(
        [...document.querySelectorAll('[role="tab"]')].map((t) =>
          Math.round(t.getBoundingClientRect().top),
        ),
      ).size,
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
        // The theme and the language are user settings the shell persists, so set them explicitly
        // rather than trusting the colour-scheme hint alone.
        await page.evaluate(
          ([t, l]) => {
            localStorage.setItem('caos-theme', t);
            localStorage.setItem('caos-lang', l);
            document.documentElement.setAttribute('data-theme', t);
          },
          [theme, lang],
        );
        await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);

        const info = await inspect(page);

        if (problems.length) fail(where, problems.slice(0, 3).join(' | '));
        else if (info.overflowX) fail(where, 'the document scrolls horizontally');
        else if (info.bodyText < 400) fail(where, `only ${info.bodyText} characters rendered`);
        else if (info.brokenPanels.length)
          fail(where, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
        else pass(where, `${info.panels.length} panels, ${info.charts.length} charts`);

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
        const button = page.locator('[role="tab"]').nth(TABS.indexOf(tab));
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
