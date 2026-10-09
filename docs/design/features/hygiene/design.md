# Design: the hygiene items of issue #14

- **One unit per column.** `formatSize` (`frontend/src/lib/artifacts.ts`) picked millimetres or centimetres by
  magnitude, so the model comparison's RMSE column read "22 mm, 52 mm, 61 mm, 11.0 cm" on the live 0.05.001. The
  design first had each table pass a fixed unit for its column; as built, `formatSize` states every fragment size
  in centimetres to one decimal, which fixes every table and every readout at once and leaves no call site that can
  pick a unit. A unit test pins the formatter; the gate reads each table column and fails when its cells end in
  different units.
- **The rail.** The design blamed an automatic margin. Measured, the cause was the reading pane: `flex: 1 1 auto`
  grew it to fill the rail, so the full-screen link sat at the bottom under the pane's empty part, 206 px on the
  default case and up to 243 px at 1600x900, against 10 px between the other controls. The pane now shrinks and
  scrolls when a case is long and never grows (`flex: 0 1 auto`). The pane's box reached the link either way, so the
  gate measures the pane's VISIBLE bottom (its last child's bottom plus that child's margin and the pane's padding
  and border) against the gaps between the other controls.
- **"Está".** "Esta" is a demonstrative and "está" the verb; a word list cannot tell them apart, which is why the
  accent guard leaves them alone. Before a participle or an adjective that only follows the verb ("esta rota",
  "esta completamente"), the verb is required; the guard checks a short list of such followers in the Spanish
  strings.
- **"Él".** The article never ends a clause, so "el" directly before a stop, a comma or a closing bracket is the
  pronoun without its accent ("sobre el." on the Distribution tab). Found while fixing "está"; added as HY-004.
