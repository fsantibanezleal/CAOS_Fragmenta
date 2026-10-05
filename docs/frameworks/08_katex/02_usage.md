# KaTeX: how this product uses it

```tsx
<Equation
  tex={String.raw`x_{50} = A\left(\frac{V}{Q}\right)^{0.8} Q^{1/6}\left(\frac{\mathrm{RWS}}{115}\right)^{-19/30}`}
  caption={es ? 'Hudaverdi et al. 2010, Ec. 1. ...' : 'Hudaverdi et al. 2010, Eq. 1. ...'}
/>
<InlineMath tex="R^2_{\mathrm{id}}" />
```

- Every equation is a `String.raw` template, so a backslash in TeX is not an escape in JavaScript.
- Every display equation has a bilingual caption that names its source and equation number, or says
  that it is this product's calibration and not a published relation.
- The same TeX is used in the wiki's `$$` blocks, so the two cannot disagree on a symbol.
