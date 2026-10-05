# blastfrag: applying it to your own blasts

The runnable version of everything on this page is [example.py](example.py); run it against the pinned
version and compare its output with the comments here.

## 1. A blast of your own

The ratios, and the measured size if you have one (`x50_m=None` for a design):

```python
import blastfrag as bf

mine = bf.Blast(blast_id="my-bench-01", site="my-mine",
                S_over_B=1.20, H_over_B=3.00, B_over_D=28.0, T_over_B=1.10,
                Pf_kg_m3=0.55, XB_m=0.90, E_GPa=25.0, x50_m=None)
bf.validate_blast(mine)                            # raises outside the contract bounds or the envelope
bf.validate_blast(mine, allow_extrapolation=True)  # returns the out-of-envelope fields instead
```

Outside the contract bounds is an entry or unit error and always raises. Outside the training envelope
is an extrapolation: refused by default, admitted on request, and every prediction then carries the
`extrapolated` stamp ([data/04](../../data/04_data-contract.md)).

## 2. Which arm answers what

| You have | Arms that can answer | Notes |
|---|---|---|
| the seven ratios | `PublishedRegression`, the learned arms (fit them first) | the published regression was fitted on the corpus; the learned arms are only as good as their site-held-out scores |
| the ratios and the absolute pattern | add `kuznetsov_x50_m` with a rock factor, and the curves | the classical equation needs volume and charge per hole |
| measured blasts at your mine | back-solve the rock factor; fit your own model | the most defensible route, see 4 |

```python
regression = bf.PublishedRegression()
print(regression.predict_one(mine).x50_m, bf.assign_group(mine))

pattern = bf.Pattern(burden_m=4.2, spacing_m=5.0, bench_height_m=12.6, hole_diameter_mm=150,
                     stemming_m=4.6, powder_factor_kg_m3=0.55)
print(bf.kuznetsov_x50_m(pattern, rock_factor=7.4))
```

Without a pattern the classical arms abstain rather than guess; that is what the Miami campaign shows on
the corpus.

## 3. The rock factor is the hard part

The predicted size is linear in it, and the published schemes disagree:

```python
rock = bf.Rock(E_GPa=25.0, in_situ_block_m=0.90, ucs_mpa=90.0, density_t_m3=2.6,
               rock_mass_description="massive", joint_spacing_m=0.5,
               joint_plane_orientation="strike_normal_to_face")
bf.rock_factor(rock, scheme="lilly-hudaverdi")   # 3.58 on this rock
bf.rock_factor(rock, scheme="lilly-babaeian")    # 4.35 on the same rock
bf.KuznetsovTransfer().fit(bf.load_training_corpus()).rock_factor_for(25.0)   # 7.41 from the modulus line
```

The three answers for one rock span a factor of two, and the classical prediction moves with them. A
scheme that lacks a property it needs raises rather than assuming it, and the two Lilly tables do not
share a rock-mass vocabulary (`blocky` is in the 2010 table only, `vertically_jointed` in the 2019 one).

## 4. Calibrate on your own measured blasts

The most defensible use at a new mine: back-solve the factor from blasts you have measured and check
that it is stable across them.

```python
a = bf.back_solve_rock_factor(0.28, rock_volume_m3=pattern.rock_volume_m3,
                              charge_mass_kg=pattern.charge_mass_kg)
```

If it scatters across blasts of one rock, something upstream (the pattern, the measurement) is wrong;
that is how the geometry reconstruction of the corpus was validated ([data/03](../../data/03_geometry.md)).

## 5. Which result to expect from the corpus models

On the evidence in this product's benchmark ([relevance](../../relevance.md)):

- no predictor fitted on these ten campaigns has a site-resampled interval above zero at a campaign it
  did not see, except the published regression, whose score is in sample;
- the classical equation's score barely depends on the protocol or on where its rock factor comes from,
  and is still not distinguishable from the corpus mean with ten sites;
- the learned arms lose most of their random-split score when a whole campaign is held out.

So the corpus models are a starting point for a design study, not a validated prediction at a new
mine. With enough measured blasts of your own, fit on them and test by holding out whole campaigns, as
[02_scikit-learn/example.py](../02_scikit-learn/example.py) does.

## 6. Run the benchmark on another corpus

`run_benchmark` takes any list of `Blast` rows with a `site` and the arm factories:

```python
result = bf.run_benchmark(my_blasts, bf.default_arms(), n_repeats=100, n_boot=2000)
print(result.verdict["outcome"])
```

Leave one site out needs at least two sites, and the transfer line refuses to fit on fewer than three
training sites, so a corpus needs four sites for every arm to answer under that protocol. With few
sites the intervals will be wide, which is the point of reporting them.

## 7. Export a fitted model for a browser

```python
document = bf.export_arm(bf.default_arms()["random-forest"]().fit(bf.load_training_corpus()))
value, reason = bf.predict_portable(document, mine)
```

The format and the TypeScript walker are described in [architecture/05](../../architecture/05_portable-models.md);
`frontend/src/engine/learned.ts` is a self-contained walker you can copy into another web application.
