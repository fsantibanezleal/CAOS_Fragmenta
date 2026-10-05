# three.js: applying it

For a to-scale engineering view in another product:

- draw from the artifact's measured or reconstructed dimensions, never from defaults that look plausible;
- pause animation by default and stop it when the document is hidden (`visibilitychange`);
- dispose geometries, materials and the renderer when the component unmounts;
- declare what was drawn (`data-*` counts) so a browser test can check it without reading pixels;
- say on the view what it is not: a firing animation that enters no model is a drawing, not a result.
