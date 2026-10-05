// Export the documentation figures, as rendered, into the docs wiki.
//
// The figures on the documentation pages are React components that lay themselves out from their
// text and read the theme through CSS variables. A markdown image cannot read those variables, so
// this script loads each page of a built site in the light theme and English, opens every sub-tab,
// serialises each figure with every `var(...)` replaced by its computed value, and writes it to
// docs/assets/fig-<slug>.svg. The figures in the wiki are therefore the ones the site shows.
//
// Usage (a built site served locally):
//   node gates/export-figures.mjs --url http://localhost:4173
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const BASE = (args.url || 'http://localhost:4173').replace(/\/$/, '');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'assets');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.GATE_CHANNEL ? { channel: process.env.GATE_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(BASE + '/introduction', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.setItem('caos.theme', 'light');
  localStorage.setItem('caos.lang', 'en');
});

const written = new Set();
for (const route of ['/introduction', '/methodology', '/implementation', '/experiments', '/benchmark']) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const tabs = page.locator('.subtabs-vertical .subtablist [role="tab"]');
  const n = Math.max(await tabs.count(), 1);
  for (let i = 0; i < n; i += 1) {
    if (await tabs.count()) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
    }
    const figures = await page.evaluate(() => {
      return [...document.querySelectorAll('figure svg[data-figure]')].map((svg) => {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.removeAttribute('class');
        // The clone and the live drawing list their elements in the same order, so each attribute
        // that reads a theme variable (nested fallbacks included) takes the value the browser computed.
        const live = [...svg.querySelectorAll('*')];
        [...clone.querySelectorAll('*')].forEach((el, i) => {
          const style = getComputedStyle(live[i]);
          for (const attr of ['fill', 'stroke']) {
            const v = el.getAttribute(attr);
            if (v && v.includes('var(')) el.setAttribute(attr, style.getPropertyValue(attr));
          }
          if (el.tagName === 'text') el.setAttribute('font-family', 'Inter, "Segoe UI", Helvetica, Arial, sans-serif');
        });
        const [, , w, h] = (clone.getAttribute('viewBox') || '0 0 900 300').split(/\s+/).map(Number);
        const bg = `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`;
        const html = clone.outerHTML.replace(/(<svg[^>]*>)/, `$1${bg}`);
        return { label: svg.getAttribute('aria-label') || 'figure', html };
      });
    });
    for (const fig of figures) {
      const slug = fig.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (written.has(slug)) continue;
      written.add(slug);
      writeFileSync(join(OUT, `fig-${slug}.svg`), fig.html + '\n', 'utf8');
    }
  }
}
await browser.close();
console.log(`exported ${written.size} figures to docs/assets: ${[...written].join(', ')}`);
