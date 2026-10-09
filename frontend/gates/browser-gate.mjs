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
//   - the workbench opens every group and sub-tab and each one renders the views it owns; the Design
//     group's surface declares its grid and cells, and moving its marker moves the distribution (0.07.000);
//   - the idle page is at rest: no chart rebuilding itself when nobody is touching it;
//   - on every documentation route, the footer is ONE line at 1600 px (ADR-0016 section 2), and
//     every sub-tab is opened by a pointer click and every figure in it MEASURED: no text on another
//     text, no text crossing a box it does not belong to, no text outside the drawing. Until
//     0.05.000 the gate never clicked a documentation sub-tab and never measured a figure, which is
//     how a note running through the Group 2 box of the router diagram shipped;
//   - the architecture modal's drawings, measured the same way.
//   - every size column states one unit, the rail leaves no empty band above its last control, and
//     the Benchmark's published-reproductions sub-tab carries the width sweep, drawn (0.06.000);
//   - every drawn view of the App measured as a figure is (no label outside its drawing, none on
//     another), and the App again at 390 and 768 px in both languages: no table cut, no text cut
//     without a title, no label fault in a drawing (0.07.000).
//
// Usage:
//   npm run build && npx vite preview --port 4173 &
//   node gates/browser-gate.mjs --url http://localhost:4173
//   node gates/browser-gate.mjs --url https://fragmenta.fasl-work.com --shots ./out
//   GATE_FONTS=dejavu node gates/browser-gate.mjs --url http://localhost:4173   (the runner's fonts)
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
const TABS = ['predict', 'distribution', 'design', 'rock', 'compare', 'context'];
// ADR-0071 rule 8 (the drawn views cover half the viewport) is measured by the base's own gate, caos-shell-gate G6,
// through frontend/scripts/gate.mjs. Until 0.07.000 this gate held the largest single drawing to 0.25 of the
// viewport instead, because the App's square parity plot could not reach 0.50 alone; on the shell's workbench the
// views of a group share the instrument and G6 counts their union.

const VIEWPORTS = [
  [1280, 800],
  [1600, 900],
  [2560, 1440],
];

// Noise from the host page rather than from this product. Anything else is a failure.
// The favicon is NOT exempt any more. It used to be, and the exemption hid that the site had no
// favicon at all: every first visit logged a 404 and every tab showed a blank icon. The headless
// build never asked for one, so nothing noticed until the gate ran on a full Chrome.
const IGNORE = [/Download the React DevTools/i, /ResizeObserver loop/i];

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

/**
 * Every figure on screen, measured. Returns a list of human-readable hits.
 *
 * Text inside a `[data-figure-box]` group must stay inside that group's own rect. Any other text (a
 * free label, the notes band) must not intersect any box rect. No two texts may intersect, and no
 * text may leave its SVG. One pixel of tolerance, because text bounding boxes are rounded.
 */
async function measureFigures(page, scope = 'figure svg, .arch-modal svg, [role="dialog"] svg') {
  return page.evaluate((selector) => {
    const hits = [];
    const svgs = [...document.querySelectorAll(selector)].filter((svg) => {
      const r = svg.getBoundingClientRect();
      return r.width > 40 && r.height > 20;
    });
    const inter = (a, b, t = 1) => a.left < b.right - t && b.left < a.right - t && a.top < b.bottom - t && b.top < a.bottom - t;
    const inside = (a, b, t = 1.5) => a.left >= b.left - t && a.right <= b.right + t && a.top >= b.top - t && a.bottom <= b.bottom + t;
    svgs.forEach((svg, k) => {
      const name = svg.getAttribute('aria-label') || `figure ${k + 1}`;
      const frame = svg.getBoundingClientRect();
      // A text that is not rendered (the other language's layout, display:none) reports a zero box
      // at the page origin and is not on screen; only rendered text is measured.
      const texts = [...svg.querySelectorAll('text')]
        .filter((t) => (t.textContent || '').trim() && t.getClientRects().length > 0 && t.getBoundingClientRect().width > 0)
        .map((t) => ({ el: t, s: (t.textContent || '').trim().slice(0, 40), b: t.getBoundingClientRect(), own: t.closest('[data-figure-box]') }));
      const boxes = [...svg.querySelectorAll('[data-figure-box] > rect')].map((r) => ({ g: r.parentElement, b: r.getBoundingClientRect() }));
      // Generic rects for drawings that are not built from the layout helper (the modal's files).
      const anyRects = boxes.length ? [] : [...svg.querySelectorAll('rect')].map((r) => r.getBoundingClientRect()).filter((b) => b.width > 30 && b.height > 18 && b.width < frame.width * 0.95);
      for (let i = 0; i < texts.length; i += 1) {
        const a = texts[i];
        if (a.b.left < frame.left - 1 || a.b.right > frame.right + 1 || a.b.top < frame.top - 1 || a.b.bottom > frame.bottom + 1) hits.push(`${name}: "${a.s}" leaves the drawing`);
        for (let j = i + 1; j < texts.length; j += 1) {
          if (inter(a.b, texts[j].b)) hits.push(`${name}: "${a.s}" overlaps "${texts[j].s}"`);
        }
        if (a.own) {
          const mine = boxes.find((x) => x.g === a.own);
          if (mine && !inside(a.b, mine.b)) hits.push(`${name}: "${a.s}" spills out of its box`);
        } else {
          for (const box of boxes) if (inter(a.b, box.b)) hits.push(`${name}: "${a.s}" sits on a box`);
        }
        for (const rect of anyRects) if (inter(a.b, rect, 1) && !inside(a.b, rect, 1)) hits.push(`${name}: "${a.s}" crosses a box edge`);
      }
      // A stroke over text is an overlay too. The protocol figure once struck its ruled-out boxes
      // through with two diagonals that crossed their own text, and none of the checks above, which
      // compare text with text and text with boxes, could see it. Every drawn line, path and polyline
      // of a diagram (not of a data chart, whose gridlines may pass behind tick labels by design) is
      // sampled every few pixels along its length and tested against every rendered text, inset by a
      // little so a stroke that only grazes a glyph box's padding is not called a crossing.
      if (svg.hasAttribute('data-figure') || svg.closest('.arch-modal, [role="dialog"]')) {
        const strokes = [...svg.querySelectorAll('line, path, polyline, polygon')].filter(
          (el) => !el.closest('defs, marker') && el.getClientRects().length > 0 && typeof el.getTotalLength === 'function',
        );
        for (const el of strokes) {
          const style = getComputedStyle(el);
          if (style.stroke === 'none' || !(parseFloat(style.strokeWidth) > 0) || style.visibility === 'hidden') continue;
          const ctm = el.getScreenCTM();
          if (!ctm) continue;
          const length = el.getTotalLength();
          const n = Math.max(2, Math.ceil((length * Math.abs(ctm.a || 1)) / 3));
          const pts = [];
          for (let s = 0; s <= n; s += 1) pts.push(new DOMPoint(el.getPointAtLength((length * s) / n).x, el.getPointAtLength((length * s) / n).y).matrixTransform(ctm));
          for (const t of texts) {
            const r = { left: t.b.left + 1, right: t.b.right - 1, top: t.b.top + 2.5, bottom: t.b.bottom - 2.5 };
            if (pts.some((p) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) {
              hits.push(`${name}: a drawn ${el.tagName} crosses "${t.s}"`);
              break;
            }
          }
        }
      }
    });
    return { n: svgs.length, hits };
  }, scope);
}

/** The footer's wrapped height, in lines of its own text, and any separator left alone at a gap. */
async function footerLines(page) {
  return page.evaluate(() => {
    const meta = document.querySelector('.site-footer .footer-meta');
    if (!meta) return null;
    // Rows by height, not by distinct tops: the version label is set smaller, so its top sits a few
    // pixels off the rest of a single row, and counting tops called one row two.
    const lh = parseFloat(getComputedStyle(meta).lineHeight) || parseFloat(getComputedStyle(meta).fontSize) * 1.5;
    const height = meta.getBoundingClientRect().height;
    // Shell defect 14: the shell pushes the version right with an auto margin and leaves its "·" behind.
    const gap = parseFloat(getComputedStyle(meta).columnGap) || 12;
    const items = [...meta.children].filter((el) => el.getClientRects().length > 0);
    const dangling = [];
    items.forEach((el, i) => {
      if (el.getAttribute('aria-hidden') !== 'true') return;
      const r = el.getBoundingClientRect();
      const after = (items[i - 1]?.textContent || '').trim();
      for (const nb of [items[i - 1], items[i + 1]]) {
        if (!nb) return void dangling.push(`after "${after}", at an end of the footer`);
        const q = nb.getBoundingClientRect();
        const apart = Math.max(q.left - r.right, r.left - q.right);
        const offRow = Math.abs(q.top + q.bottom - r.top - r.bottom) / 2 > lh / 2;
        if (apart > 2 * gap + 2 || offRow) return void dangling.push(`after "${after}", ${Math.round(apart)}px from its neighbour`);
      }
    });
    return { rows: Math.max(1, Math.round(height / lh)), height: Math.round(height), lh: Math.round(lh), dangling };
  });
}

/** Inline citations written back to back, which render as "(A)(B)". */
async function adjacentCitations(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('cite.cite-inline')]
      .filter((c) => c.previousSibling instanceof Element && c.previousSibling.matches('cite.cite-inline'))
      .map((c) => `${c.previousSibling.textContent}${c.textContent}`),
  );
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
      panels: [...document.querySelectorAll('.fr-panel, [data-plot]')].map((el) => ({
        id: el.getAttribute('data-panel') || '',
        heading: el.querySelector('h3')?.textContent?.trim() || '',
        height: Math.round(el.getBoundingClientRect().height),
      })),
      brokenPanels: [...document.querySelectorAll('.fr-panel-error')].map(
        (el) => el.closest('.fr-panel')?.querySelector('h3')?.textContent?.trim() || '?',
      ),
      charts,
      benchHoles: document.querySelector('[data-bench-holes]')?.getAttribute('data-bench-holes') ?? null,
      benchHolesVisible:
        document.querySelector('[data-bench-holes-visible]')?.getAttribute('data-bench-holes-visible') ??
        null,

      // ADR-0071, measured rather than judged by eye.
      //
      // `documentElement` is the WRONG element to ask about scrolling here: the shell makes `body`
      // the scroll container, so the root stays exactly the viewport height on every route and a
      // check against it passes whatever the page does. Ask the real scroller.
      bodyOverflowY: document.body.scrollHeight - document.body.clientHeight,
      // Shell known defect 4: the language the DOCUMENT declares, which is what a screen reader and
      // a search engine read. The setting in storage is not evidence of it.
      docLang: document.documentElement.lang,
      font: getComputedStyle(document.body).fontFamily,
      bodyOverflowX: document.body.scrollWidth - document.body.clientWidth,
      // Rule 6: every CONTROL in the rail is reachable without scrolling it. The reading pane inside
      // the rail may scroll, because it is reading and not controls.
      railControlsBelowFold: (() => {
        const controls = [...document.querySelectorAll('[data-rail] select, [data-rail] input, [data-rail] [role="tab"], [data-rail] button')].filter(
          (el) => el.getClientRects().length,
        );
        if (!controls.length) return null;
        const lowest = Math.max(...controls.map((el) => el.getBoundingClientRect().bottom));
        return Math.max(0, Math.round(lowest - window.innerHeight));
      })(),
      // Rule 7: a categorised one-of-N choice is a select with optgroups, not N buttons.
      caseSelectOptgroups: document.querySelector('select[data-control="case"]')?.querySelectorAll('optgroup').length ?? null,
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
      tabs: [...(document.querySelector('[data-instrument] [role="tablist"]')?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent?.trim()),
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
      // The shell's tablist hides vertical overflow, so a strip squeezed by a tall panel cuts its tabs.
      clippedTabRows: [...document.querySelectorAll('[role="tablist"]')]
        .filter((list) => list.getClientRects().length && list.scrollHeight > list.clientHeight + 1)
        .map((list) => `${list.querySelector('[role="tab"]')?.textContent?.trim()}: ${list.clientHeight}px of ${list.scrollHeight}px`),
      // Text an ellipsis cuts must carry its whole text where a pointer reaches it.
      truncated: [...document.querySelectorAll('body *')]
        .filter(
          (el) =>
            el.childElementCount === 0 &&
            el.getClientRects().length &&
            el.scrollWidth > el.clientWidth + 1 &&
            getComputedStyle(el).textOverflow === 'ellipsis' &&
            el.getAttribute('title') !== el.textContent.trim(),
        )
        .map((el) => el.textContent.trim().slice(0, 48)),
      // A table wider than its container is cut unless it sits in a declared horizontal scroller.
      tablesCut: [...document.querySelectorAll('table.fr-table')]
        .filter((t) => t.getClientRects().length && !t.closest('.fr-scroll-x'))
        .filter((t) => t.offsetWidth > t.parentElement.clientWidth + 1)
        .map((t) => `${t.closest('[class*="fr-"]:not(table)')?.className || 'table'}: ${t.offsetWidth}px in ${t.parentElement.clientWidth}px`),
      // Rows with the same scores read as models that agree; arms that share a mean size get no row.
      duplicateArmRows: (() => {
        const seen = new Map();
        const dup = [];
        for (const tr of document.querySelectorAll('.fr-armtable tbody tr')) {
          const cells = [...tr.cells].map((c) => c.textContent.trim());
          const key = cells.slice(1).join('|');
          if (seen.has(key)) dup.push(`${seen.get(key)} = ${cells[0]}`);
          else seen.set(key, cells[0]);
        }
        return dup;
      })(),
      // A chart axis whose labels repeat their neighbour is broken. Until 0.07.000 every null tick of the
      // distribution chart's log axis was formatted as "0mm", on the live site too, and nothing caught it.
      repeatedTicks: [...document.querySelectorAll('[data-ticks-repeat]')]
        .filter((el) => el.getClientRects().length && Number(el.getAttribute('data-ticks-repeat')) > 0)
        .map((el) => `${el.closest('[data-chart]')?.getAttribute('data-chart') ?? 'chart'}: ${el.getAttribute('data-ticks-repeat')} repeated labels`),
      // HY-001: one unit per column. Until 0.06.000 the unit was picked by magnitude, which put
      // "22 mm" above "11.0 cm" in the model comparison's RMSE column, so a reader comparing two
      // rows compared two units first.
      mixedUnits: (() => {
        const unitOf = (text) => /^[-+\u2212]?\d[\d.,]*\s*(mm|cm|m)$/.exec(text.trim())?.[1] ?? null;
        const out = [];
        for (const table of document.querySelectorAll('table')) {
          if (!table.getClientRects().length) continue;
          const columns = new Map();
          for (const tr of table.querySelectorAll('tbody tr')) {
            [...tr.cells].forEach((cell, i) => {
              const unit = unitOf(cell.textContent || '');
              if (!unit) return;
              if (!columns.has(i)) columns.set(i, new Set());
              columns.get(i).add(unit);
            });
          }
          for (const [i, units] of columns) {
            if (units.size < 2) continue;
            const head = table.querySelector('thead tr')?.cells[i]?.textContent?.trim() || `column ${i + 1}`;
            out.push(`${head}: ${[...units].join(' and ')}`);
          }
        }
        return out;
      })(),
      // HY-002: no band of empty rail above its last control. The reading pane grew to fill the rail
      // until 0.06.000, so on a short case the full-screen link sat at the bottom of the screen under
      // an empty band. The pane's box reached the link, so its VISIBLE bottom is measured: its last
      // child's bottom plus that child's margin and the pane's own padding and border.
      railGaps: (() => {
        const rail = document.querySelector('[data-rail]');
        if (!rail) return null;
        const items = [...rail.children].filter((el) => el.getClientRects().length);
        const visibleBottom = (el) => {
          const box = el.getBoundingClientRect();
          const kids = [...el.children].filter((c) => c.getClientRects().length);
          if (!kids.length) return box.bottom;
          const last = kids.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
          const own = getComputedStyle(el);
          const content =
            last.getBoundingClientRect().bottom +
            parseFloat(getComputedStyle(last).marginBottom) +
            parseFloat(own.paddingBottom) +
            parseFloat(own.borderBottomWidth);
          return Math.min(box.bottom, content);
        };
        const gaps = items.slice(1).map((el, i) => Math.round(el.getBoundingClientRect().top - visibleBottom(items[i])));
        if (gaps.length < 2) return null;
        return { last: gaps[gaps.length - 1], others: Math.max(...gaps.slice(0, -1)) };
      })(),
    };
  });
}

// GATE_CHANNEL=chrome runs on the installed Google Chrome instead of Playwright's pinned build, for a
// machine where that build is not downloaded. CI leaves it unset and uses the pinned build.
const browser = await chromium.launch(
  process.env.GATE_CHANNEL ? { channel: process.env.GATE_CHANNEL } : {},
);

for (const [w, h] of VIEWPORTS) {
  for (const theme of ['light', 'dark']) {
    for (const lang of ['en', 'es']) {
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        colorScheme: theme,
        locale: lang === 'es' ? 'es-CL' : 'en-GB',
      });
      // Settings go in before any page script runs: a reload after setting them cancelled the first
      // route's own data fetch on a cold cache (net::ERR_ABORTED), a race of the gate, not the site.
      await context.addInitScript(
        ([t, l]) => {
          localStorage.setItem('caos.theme', t);
          localStorage.setItem('caos.lang', l);
        },
        [theme, lang],
      );
      // GATE_FONTS=dejavu sets text in the deploy runner's fonts (DejaVu Sans; Courier New has Liberation
      // Mono's metrics), so a Windows run sees the wraps that only the Linux gate saw before.
      if (process.env.GATE_FONTS === 'dejavu') {
        await context.addInitScript(() => {
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent =
              ':root{--font-sans:"DejaVu Sans",sans-serif !important;--font-mono:"Courier New",monospace !important}';
            document.head.appendChild(style);
          });
        });
      }
      const page = await context.newPage();
      const problems = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) problems.push(m.text());
      });
      page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
      page.on('requestfailed', (r) => {
        if (!IGNORE.some((x) => x.test(r.url())))
          problems.push(`request failed (${r.failure()?.errorText ?? 'no reason given'}): ${r.url()}`);
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
        // The shell persists both settings under the EXACT keys the init script writes. The first
        // version of this gate guessed 'caos-lang' and 'caos-theme' with hyphens, so every "es" run
        // rendered English and the gate reported passing checks in a language it had never displayed.
        // A gate has to verify its own subject, which is why the language is asserted below.
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);

        const info = await inspect(page);

        if (info.lang !== lang) fail(where, `asked for ${lang} and the page is in ${info.lang}`);
        if (info.docLang !== lang)
          fail(where, `the page reads ${lang} but the document declares lang="${info.docLang}"`);
        if (process.env.GATE_FONTS === 'dejavu' && !info.font.includes('DejaVu'))
          fail(where, `asked for the runner's fonts and the page is set in ${info.font}`);

        // Shell known defect 1: the document cannot scroll. Measured the way the defect record says,
        // with the content height taken through <body> as well, because the defect is precisely what
        // pins documentElement.scrollHeight to the viewport and makes a tall page look like it fits.
        if (route !== '/' && route !== '/app') {
          const scroll = await page.evaluate(() => {
            const content = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
            const tall = content > window.innerHeight + 2;
            window.scrollTo(0, 1200);
            const moved = window.scrollY;
            window.scrollTo(0, 0);
            return { tall, moved, content };
          });
          if (scroll.tall && scroll.moved <= 0)
            fail(where, `${scroll.content}px of content and scrollTo moved 0px, so the document cannot scroll`);
        }
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
        if (info.truncated.length) fail(where, `text cut with no title: ${info.truncated.join(' | ')}`);
        if (info.mixedUnits.length) fail(where, `a size column mixes units: ${info.mixedUnits.join(' | ')}`);
        if (info.repeatedTicks.length) fail(where, `an axis repeats its labels: ${info.repeatedTicks.join(' | ')}`);

        if (route === '/' || route === '/app') {
          // The App route is locked to the viewport, so NOTHING may scroll the page itself.
          if (info.bodyOverflowY > 2) fail(where, `the App route scrolls the page by ${info.bodyOverflowY}px`);
          if (info.railControlsBelowFold === null) fail(where, 'the rail has no controls to check');
          else if (info.railControlsBelowFold > 0)
            fail(where, `${info.railControlsBelowFold}px of rail controls below the fold (ADR-0071 rule 6)`);
          if (!info.caseSelectOptgroups)
            fail(where, 'the case control is not a select with optgroups (ADR-0071 rule 7)');
          if (!info.railGaps) fail(where, 'the rail has too few controls to measure its gaps');
          else if (info.railGaps.last > info.railGaps.others + 4)
            fail(where, `${info.railGaps.last}px of empty rail above its last control, against ${info.railGaps.others}px between the others`);
          else pass(`${where} rail`, `${info.railGaps.last}px above the last control, ${info.railGaps.others}px between the others`);
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

        // Documentation routes at the reading width: the footer is one line, and every sub-tab is
        // opened and every figure in it measured. Figures scale with their viewBox, so their text
        // geometry does not depend on the viewport; one width is enough.
        const isDoc = route !== '/' && route !== '/app';
        if (isDoc && w === 1600) {
          const footer = await footerLines(page);
          if (!footer) fail(where, 'no footer');
          else if (footer.rows > 1) fail(where, `the footer wraps onto ${footer.rows} rows (${footer.height}px); ADR-0016 section 2 asks for one`);
          else if (footer.dangling.length) fail(where, `a footer separator stands alone: ${footer.dangling.join(' | ')}`);
          else pass(`${where} footer`, `one row, ${footer.height}px, every separator between two items`);

          const subtabs = page.locator('.subtabs-vertical .subtablist [role="tab"]');
          const count = await subtabs.count();
          const seen = [];
          let sweepChecked = false;
          const doTab = async (label) => {
            const figures = await measureFigures(page, 'figure svg');
            seen.push(figures.n);
            if (figures.hits.length) fail(`${where} ${label}`, figures.hits.slice(0, 4).join(' | '));
            const runTogether = await adjacentCitations(page);
            if (runTogether.length) fail(`${where} ${label}`, `citations with no space between: ${runTogether.slice(0, 3).join(' | ')}`);
            const info = await inspect(page);
            if (info.brokenPanels.length) fail(`${where} ${label}`, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
            if (info.mixedUnits.length) fail(`${where} ${label}`, `a size column mixes units: ${info.mixedUnits.join(' | ')}`);
            // EN-008: the published-reproductions sub-tab carries the network's width sweep, drawn and declared.
            if (route.startsWith('/benchmark') && /published reproductions|reproducciones publicadas/i.test(label)) {
              sweepChecked = true;
              const sweep = await page.evaluate(() => {
                const el = document.querySelector('[data-width-sweep]');
                if (!el) return null;
                const chart = el.querySelector('[data-chart]');
                const drawn = chart
                  ? [...chart.attributes]
                      .filter((a) => a.name.startsWith('data-chart-'))
                      .reduce((sum, a) => sum + (Number(a.value) || 0), 0)
                  : 0;
                return { widths: Number(el.getAttribute('data-width-sweep')) || 0, drawn };
              });
              if (!sweep) fail(`${where} ${label}`, 'the width sweep is not on the published-reproductions sub-tab');
              else if (!sweep.widths || !sweep.drawn)
                fail(`${where} ${label}`, `the width sweep declares ${sweep.widths} widths and its chart ${sweep.drawn} drawn`);
              else pass(`${where} ${label} width sweep`, `${sweep.widths} widths drawn`);
            }
            for (const chart of info.charts) {
              const total = Object.values(chart.declared).reduce((a, b) => a + b, 0);
              if (!total) fail(`${where} ${label}`, `the ${chart.chart} chart declared nothing drawn`);
            }
            if (SHOTS) {
              const name = `${route.replace(/\//g, '_')}-${label.replace(/[^a-z0-9]+/gi, '-')}-${theme}-${lang}.png`;
              await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: true });
            }
          };
          if (!count) {
            await doTab('page');
          }
          for (let i = 0; i < count; i += 1) {
            const tab = subtabs.nth(i);
            const label = ((await tab.textContent()) || `tab ${i + 1}`).trim();
            await tab.click();
            await page.waitForTimeout(500);
            if ((await tab.getAttribute('aria-selected')) !== 'true') fail(`${where} ${label}`, 'the sub-tab did not open on a click');
            await doTab(label);
          }
          // A renamed sub-tab must not skip the check silently.
          if (route.startsWith('/benchmark') && !sweepChecked)
            fail(where, 'no sub-tab named "Published reproductions" ("Reproducciones publicadas") to check the width sweep on');
          pass(`${where} figures`, `${count || 1} sections, ${seen.reduce((a, b) => a + b, 0)} figures measured`);
          problems.length = 0;
        }
      }

      // The architecture modal, once per theme and language at the reading width.
      if (w === 1600) {
        const where = `${w}x${h} ${theme} ${lang} architecture`;
        await page.goto(BASE + '/introduction', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(800);
        // The label is "Architecture / How it works" in English and "Arquitectura / Cómo funciona" in
        // Spanish; the first version of this check matched only the English spelling.
        const open = page.locator('header button[aria-label*="rchitect"], header button[aria-label*="rquitect"]');
        if (!(await open.count())) {
          fail(where, 'no architecture button in the header');
        } else {
          await open.first().click();
          await page.waitForTimeout(900);
          const modalTabs = page.locator('[role="dialog"] [role="tab"]');
          const n = await modalTabs.count();
          let measured = 0;
          for (let i = 0; i < Math.max(n, 1); i += 1) {
            if (n) {
              await modalTabs.nth(i).click();
              await page.waitForTimeout(700);
            }
            const figures = await measureFigures(page, '[role="dialog"] svg');
            measured += figures.n;
            if (figures.hits.length) fail(`${where} tab ${i + 1}`, figures.hits.slice(0, 4).join(' | '));
          }
          if (!measured) fail(where, 'the modal showed no drawing');
          else pass(where, `${n} tabs, ${measured} drawings measured`);
          await page.keyboard.press('Escape');
        }
      }

      // The workbench, tab by tab. A route that renders is not the same as a route that works.
      problems.length = 0;
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1200);
      const groupTabs = page.locator('[data-instrument] [role="tablist"]').first().locator('[role="tab"]');
      const groupCount = await groupTabs.count();
      if (groupCount !== TABS.length) fail(`${w}x${h} ${theme} ${lang} workbench`, `${groupCount} groups on the default case, not ${TABS.length}`);
      for (let g = 0; g < groupCount; g += 1) {
        const tab = TABS[g] ?? `group-${g}`;
        await groupTabs.nth(g).click();
        await page.waitForTimeout(900);
        const subTabs = page.locator('[data-instrument] [role="tabpanel"] [role="tablist"] [role="tab"]');
        const subCount = await subTabs.count();
        for (let k = 0; k < Math.max(1, subCount); k += 1) {
          let subLabel = '';
          if (subCount) {
            subLabel = ((await subTabs.nth(k).textContent()) || `sub ${k + 1}`).trim();
            await subTabs.nth(k).click();
            await page.waitForTimeout(900);
          }
          const where = `${w}x${h} ${theme} ${lang} tab:${tab}${subLabel ? ` > ${subLabel}` : ''}`;
          const bench = /bench|banco/i.test(subLabel);
          const info = await inspect(page);
          if (problems.length) fail(where, problems.slice(0, 2).join(' | '));
          else if (info.brokenPanels.length) fail(where, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
          else if (info.tabRows !== 1) fail(where, `the tab strip wrapped onto ${info.tabRows} rows`);
          else if (info.clippedTabRows.length) fail(where, `a tab strip is cut: ${info.clippedTabRows.join(' | ')}`);
          else if (info.tablesCut.length) fail(where, `a table is wider than its container: ${info.tablesCut.join(' | ')}`);
          else if (info.truncated.length) fail(where, `text cut with no title: ${info.truncated.join(' | ')}`);
          else if (info.duplicateArmRows.length) fail(where, `comparison rows with identical scores: ${info.duplicateArmRows.join(' | ')}`);
          else if (info.mixedUnits.length) fail(where, `a size column mixes units: ${info.mixedUnits.join(' | ')}`);
          else if (info.repeatedTicks.length) fail(where, `an axis repeats its labels: ${info.repeatedTicks.join(' | ')}`);
          else if (info.railControlsBelowFold > 0) fail(where, `${info.railControlsBelowFold}px of rail controls below the fold (ADR-0071 rule 6)`);
          else if (!info.panels.length && !info.charts.length && info.benchHoles === null && tab !== 'context')
            fail(where, 'the view rendered neither a panel nor a chart');
          else
            pass(where, `${info.panels.length} views, ${info.charts.length} charts` + (info.benchHoles !== null ? `, ${info.benchHoles} holes` : ''));

          // The App's drawn views, measured as the documentation figures are: no label outside its drawing, no
          // label on another. Until 0.07.000 only figures were measured, and the model view shipped labels cut
          // at the card's edge in Spanish ("dio clásico, limitado al bloque in situ") and ticks printed over one
          // another ("19 cm37 cm"), under a green gate. Canvas-drawn charts carry no text elements to measure.
          const drawn = await measureFigures(page, '[data-instrument] svg[data-chart]');
          if (drawn.hits.length) fail(`${where} drawings`, `${drawn.hits.length} label fault(s): ${drawn.hits.slice(0, 3).join(' | ')}`);
          else if (drawn.n) pass(`${where} drawings`, `${drawn.n} measured`);

          if (bench && !info.benchDisclaimer) fail(where, 'the 3D bench lost its timing disclaimer');
          if (bench && info.benchHolesVisible !== null) {
            // The hole COUNT was true while nothing was visible: the columns were drawn inside an opaque block, so
            // the element said 18 and the tab showed a featureless slab. Three pixel heuristics were tried against
            // that and every one of them measured something adjacent. The renderer raycasts instead, and the two
            // states separate exactly: 18 visible against 0.
            if (Number(info.benchHolesVisible) < 1) fail(where, 'the bench declares holes but none of them is visible from the camera');
            else pass(`${where} visible`, `${info.benchHolesVisible} of ${info.benchHoles} holes`);
          }
          if (SHOTS) {
            const name = `tab-${tab}${subLabel ? '-' + subLabel.replace(/[^a-z0-9]+/gi, '-') : ''}-${theme}-${lang}-${w}x${h}.png`;
            await page.screenshot({ path: `${SHOTS}/${name}` });
          }
        }
      }

      // RS-005 and RS-004: the response surface declares its grid and cells, and moving its marker (here by the
      // arrow keys, as a keyboard reader would) moves the distribution the Distribution group draws.
      {
        const where = `${w}x${h} ${theme} ${lang} surface`;
        const percentiles = async () => {
          await groupTabs.nth(TABS.indexOf('distribution')).click();
          await page.waitForTimeout(700);
          const curves = page.locator('[data-instrument] [role="tabpanel"] [role="tablist"] [role="tab"]').first();
          if (await curves.count()) await curves.click();
          await page.waitForTimeout(700);
          return (await page.locator('[data-readout="percentiles"]').first().textContent()) ?? '';
        };
        const before = await percentiles();
        await groupTabs.nth(TABS.indexOf('design')).click();
        await page.waitForTimeout(700);
        // The group keeps its open sub-tab, and the walk above left it on the bench: open the surface, its first.
        const surfaceTab = page.locator('[data-instrument] [role="tabpanel"] [role="tablist"] [role="tab"]').first();
        if (await surfaceTab.count()) await surfaceTab.click();
        await page.waitForTimeout(900);
        const surface = page.locator('[data-chart="surface"]').first();
        const declared = await surface
          .evaluate(
            (el) => ({
              grid: Number(el.getAttribute('data-chart-grid')),
              cells: Number(el.getAttribute('data-chart-cells')),
              empty: Number(el.getAttribute('data-chart-empty')),
            }),
            null,
            { timeout: 5000 },
          )
          .catch(() => null);
        if (!declared) fail(where, 'the Design group draws no response surface');
        else if (declared.cells + declared.empty !== declared.grid ** 2)
          fail(where, `the surface declares ${declared.cells} drawn and ${declared.empty} empty cells on a ${declared.grid}x${declared.grid} grid`);
        else pass(where, `${declared.cells} cells drawn, ${declared.empty} empty, on ${declared.grid}x${declared.grid}`);
        if (declared) {
          await surface.focus();
          for (let k = 0; k < 4; k += 1) await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(600);
          const after = await percentiles();
          if (!before || after === before) fail(where, 'moving the design marker did not move the distribution');
          else pass(`${where} marker`, 'the distribution follows the marked design');
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

// The App at a phone's and a tablet's width, where the shell stacks the views and gives each a fixed height: a
// label that fits at 1280 px may not fit there, and in Spanish the words are longer. The base's gate measures
// these sizes for reach and coverage; this measures what is drawn and written in them.
for (const [w, h] of [
  [390, 844],
  [768, 1024],
]) {
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, locale: lang === 'es' ? 'es-CL' : 'en-GB' });
    await context.addInitScript((l) => {
      localStorage.setItem('caos.theme', 'light');
      localStorage.setItem('caos.lang', l);
    }, lang);
    if (process.env.GATE_FONTS === 'dejavu') {
      await context.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent =
            ':root{--font-sans:"DejaVu Sans",sans-serif !important;--font-mono:"Courier New",monospace !important}';
          document.head.appendChild(style);
        });
      });
    }
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    const groupTabs = page.locator('[data-instrument] [role="tablist"]').first().locator('[role="tab"]');
    const groupCount = await groupTabs.count();
    for (let g = 0; g < groupCount; g += 1) {
      const tab = TABS[g] ?? `group-${g}`;
      await groupTabs.nth(g).click();
      await page.waitForTimeout(900);
      const subTabs = page.locator('[data-instrument] [role="tabpanel"] [role="tablist"] [role="tab"]');
      const subCount = await subTabs.count();
      for (let k = 0; k < Math.max(1, subCount); k += 1) {
        let subLabel = '';
        if (subCount) {
          subLabel = ((await subTabs.nth(k).textContent()) || `sub ${k + 1}`).trim();
          await subTabs.nth(k).click();
          await page.waitForTimeout(900);
        }
        const where = `${w}x${h} light ${lang} tab:${tab}${subLabel ? ` > ${subLabel}` : ''}`;
        const info = await inspect(page);
        const drawn = await measureFigures(page, '[data-instrument] svg[data-chart]');
        if (info.brokenPanels.length) fail(where, `panel error boundary fired: ${info.brokenPanels.join(', ')}`);
        else if (info.tablesCut.length) fail(where, `a table is wider than its container: ${info.tablesCut.join(' | ')}`);
        else if (info.truncated.length) fail(where, `text cut with no title: ${info.truncated.join(' | ')}`);
        else if (drawn.hits.length) fail(where, `${drawn.hits.length} label fault(s): ${drawn.hits.slice(0, 3).join(' | ')}`);
        else pass(where, `${info.panels.length} views, ${drawn.n} drawings measured`);
      }
    }
    await context.close();
  }
}

await browser.close();

console.log('\n' + report.filter((r) => r.startsWith('FAIL')).join('\n'));
console.log(
  `\nFRAGMENTA GATE ${failures ? 'FAILED' : 'PASSED'}: ` +
    `${report.length - failures} checks passed, ${failures} failed, against ${BASE}`,
);
process.exit(failures ? 1 : 0);
