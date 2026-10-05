# React and the shell: applying the pattern to another product

What this product does that carries over to another CAOS product built on the shell:

1. **Read every number from an artifact through one module.** `lib/facts.ts` is the only place pages
   get corpus-level numbers, so a re-bake changes the pages without editing them, and a missing field
   shows `n/a` instead of a stale value.
2. **Write the bilingual text in one place per string.** Every string is `es ? '...' : '...'` or
   `t('en', 'es')`; the accent guard (`scripts/check_spanish_accents.py`) scans the second form and the
   drawing generator, so the Spanish half is checked like the English half.
3. **Let figures size themselves.** `viz/Diagrams.tsx` lays out each box from its text (`place`,
   `column`, a notes band below the drawing) instead of fixed coordinates, so translated text cannot
   overflow a box, and the browser gate measures every figure for overlaps, including lines over text.
4. **Keep the focus view outside the shell.** A full-screen view that sits inside `AppShell` inherits
   its header and footer; this product mounts it as a sibling route and applies the theme itself.
5. **Copy the walker, not the training stack.** `engine/learned.ts` walks the engine's portable models
   in about 200 lines with no dependency; another product can run fitted forests, boosters, networks and
   kernels the same way ([architecture/05](../../architecture/05_portable-models.md)).
