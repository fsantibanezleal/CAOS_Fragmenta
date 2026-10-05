# KaTeX: applying it

- Write TeX in raw template strings (`String.raw`), and keep one notation for the site and the docs.
- Caption every display equation with its source and equation number; a reader should be able to find
  the printed original.
- Define every symbol near the equation, with its unit; the classical equation's units (centimetres,
  cubic metres, kilograms) are where most transcription errors in this field come from.
- Prefer `\mathrm{}` for multi-letter names (`\mathrm{RWS}`, `\mathrm{LOSO}`), so they do not read as
  products of single-letter variables.
