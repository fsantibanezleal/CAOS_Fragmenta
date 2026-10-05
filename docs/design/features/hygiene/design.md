# Design: the hygiene items of issue #14

- **One unit per column.** `formatSize` (`frontend/src/lib/artifacts.ts`) picks millimetres or centimetres by
  magnitude, so one RMSE column read "22 mm" beside "11.0 cm". A table passes a fixed unit for its column; the gate
  reads each table column and fails when its cells end in different units.
- **The rail.** The full-screen link was pushed to the bottom of the rail by an automatic margin, leaving a gap
  above it as tall as half the rail. It follows the last control at the rail's own gap; the gate measures the gap
  above the rail's last child against the gaps between the others.
- **"Está".** "Esta" is a demonstrative and "está" the verb; a word list cannot tell them apart, which is why the
  accent guard leaves them alone. Before a participle or an adjective that only follows the verb ("esta rota",
  "esta completamente"), the verb is required; the guard checks a short list of such followers in the Spanish
  strings.
