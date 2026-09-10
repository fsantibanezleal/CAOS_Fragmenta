# Bringing your own blasts

The models here are not specific to the ten campaigns they were fitted on. Running them on your own
designs is the point, and the engine is a separate installable package for exactly that reason.

```bash
pip install blastfrag
```

## The minimum a blast needs

Seven dimensionless ratios:

| Symbol | Meaning | Corpus range |
|---|---|---|
| `S_over_B` | spacing over burden | 1.00 to 1.75 |
| `H_over_B` | bench height over burden | 1.33 to 6.82 |
| `B_over_D` | burden over hole diameter | 17.98 to 39.47 |
| `T_over_B` | stemming over burden | 0.50 to 4.67 |
| `Pf_kg_m3` | powder factor | 0.22 to 1.26 |
| `XB_m` | in situ block size, metres | 0.02 to 2.35 |
| `E_GPa` | Young modulus | 9.57 to 60.00 |

```python
import blastfrag as bf

blast = bf.Blast(
    blast_id="my-bench-01",
    site="my-mine",
    S_over_B=1.20, H_over_B=3.00, B_over_D=28.0,
    T_over_B=1.10, Pf_kg_m3=0.55, XB_m=0.90, E_GPa=25.0,
)

arm = bf.PublishedRegression()
print(arm.predict_one(blast))
```

## What happens if you are outside the range

The contract refuses, and that refusal is the useful part:

```python
bf.validate_blast(blast)                            # raises if outside the fitted envelope
bf.validate_blast(blast, allow_extrapolation=True)  # returns the warnings instead
```

The default is refusal because predicting outside the data should be a decision, not an accident.
When you do opt in, every prediction is stamped `extrapolated` and should be read as one.

Two bands, and they are different things. Outside the **contract bounds** is a unit or entry error
and is always rejected. Outside the **fitted envelope** is an extrapolation and is admitted on
request.

## The classical models need more than ratios

They need a rock volume and a charge mass per hole, so they need an absolute pattern:

```python
pattern = bf.Pattern(
    burden_m=7.0, spacing_m=8.5, bench_height_m=15.0,
    hole_diameter_mm=250, stemming_m=7.5, powder_factor_kg_m3=0.62,
)
print(bf.kuznetsov_x50_m(pattern, rock_factor=9.2))
```

If you do not have the pattern, the classical models will **abstain** rather than guess. That is
correct behaviour and it is what the geometry negative control exists to prove.

## The rock factor is the hard part

It multiplies everything, so predicted size is linear in it, and the two published rating schemes
disagree by up to 0.85 on the same rock. The package ships both, plus a lookup, plus the per-site
values recovered from the published predictions.

```python
bf.rock_factor(rock, scheme="lilly-hudaverdi")
bf.rock_factor(rock, scheme="lilly-babaeian")
```

Each scheme **refuses** if it is missing a property it needs. It will not assume a compressive
strength. A rock factor produced from an assumed input is a prediction with no evidence behind it,
and it looks exactly like one that has evidence.

The most defensible thing you can do at your own mine is calibrate: take blasts you have measured,
back-solve the factor, and check it is stable across them.

```python
bf.back_solve_rock_factor(measured_x50_m, rock_volume_m3=..., charge_mass_kg=...)
```

If it scatters, something upstream is wrong, which is exactly how the geometry reconstruction in this
product was validated.

## Which model to use

On the evidence in this product, and only on that evidence:

- for a mine unlike the ten in the corpus, the **published regression** transfers best, at 0.802
  variance explained under leave-one-site-out;
- the **classical model** is second at 0.311, and it needs a rock factor you have to supply;
- **no fitted model** transfers at all. Every one scores below predicting a constant.

If you have enough of your own measured blasts to fit something, fit it on your own blasts. What this
corpus shows is that a model fitted on ten other campaigns will not reach yours.
