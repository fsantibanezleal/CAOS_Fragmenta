/**
 * The route table (shell 0.15.0, ADR-0016): the App at /app, the Introduction as the landing at / and at every unknown
 * path, the five documentation routes, and one forward for the retired focus page.
 *
 * The header order is the shell's STANDARD_ROUTES (App, Introduction, Methodology, Implementation, Experiments,
 * Benchmark); this table only says which page each path renders. main.tsx maps each page name to its element.
 */

export type PageName = 'landing' | 'app' | 'introduction' | 'methodology' | 'implementation' | 'experiments' | 'benchmark' | 'focus-forward';

/** The product's own focus page lived here until 0.08.000; old links to it are forwarded to the shell's Focus mode. */
export const FOCUS_FORWARD_PATH = '/focus/:caseId';

export const ROUTE_TABLE: ReadonlyArray<{ path: string; page: PageName }> = [
  { path: '/', page: 'landing' },
  { path: '/app', page: 'app' },
  { path: '/introduction', page: 'introduction' },
  { path: '/methodology', page: 'methodology' },
  { path: '/implementation', page: 'implementation' },
  { path: '/experiments', page: 'experiments' },
  { path: '/benchmark', page: 'benchmark' },
  { path: FOCUS_FORWARD_PATH, page: 'focus-forward' },
  { path: '*', page: 'landing' },
];

/**
 * Where an old `/focus/<caseId>` link goes: the App on that case with Focus mode open (`?focus=1`, ADR-0070). The
 * workbench holds its open group itself and opens on Predict, the group the old page drew (the parity plot), so no
 * `view` parameter is named.
 */
export const focusForwardTarget = (caseId: string): string => `/app?case=${encodeURIComponent(caseId)}&focus=1`;
