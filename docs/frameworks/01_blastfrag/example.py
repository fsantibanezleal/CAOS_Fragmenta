"""blastfrag on a blast of your own: the contract, the closed forms, the rock factor, a learned arm,
the portable export, and a small benchmark.

    pip install "blastfrag[learned]==0.3.0"     # the learned arms need scikit-learn and xgboost
    python docs/frameworks/01_blastfrag/example.py

Runs in well under a minute; the benchmark at the end uses 5 draws and no intervals, so its numbers
are a smoke test, not the published benchmark (which uses 100 draws and 2000 site resamples).
"""

from __future__ import annotations

import blastfrag as bf

# 1. A blast of your own: the seven ratios, and the measured size if you have one.
mine = bf.Blast(
    blast_id="my-bench-01",
    site="my-mine",
    S_over_B=1.20,
    H_over_B=3.00,
    B_over_D=28.0,
    T_over_B=1.10,
    Pf_kg_m3=0.55,
    XB_m=0.90,
    E_GPa=25.0,
    x50_m=None,
)
print("outside the training envelope:", bf.validate_blast(mine, allow_extrapolation=True) or "nothing")

# 2. The ratios alone: the router and the published power law (fitted by its source on the corpus).
regression = bf.PublishedRegression()
answer = regression.predict_one(mine)
print(f"published regression: {answer.x50_m:.3f} m, stiffness group {bf.assign_group(mine)}")

# 3. The classical equation needs the absolute pattern and a rock factor.
pattern = bf.Pattern(
    burden_m=4.2,
    spacing_m=5.0,
    bench_height_m=12.6,
    hole_diameter_mm=150,
    stemming_m=4.6,
    powder_factor_kg_m3=0.55,
)
rock = bf.Rock(
    E_GPa=25.0,
    in_situ_block_m=0.90,
    ucs_mpa=90.0,
    density_t_m3=2.6,
    # The two Lilly tables do not share a vocabulary: "blocky" exists only in the 2010 one and
    # "vertically_jointed" only in the 2019 one. "massive" is in both, so both schemes can rate it.
    rock_mass_description="massive",
    joint_spacing_m=0.5,
    joint_plane_orientation="strike_normal_to_face",
)
for scheme in ("lilly-hudaverdi", "lilly-babaeian"):
    a = bf.rock_factor(rock, scheme=scheme)
    print(f"rock factor, {scheme}: {a:.2f}; classical x50 {bf.kuznetsov_x50_m(pattern, a):.3f} m")

# 4. Calibrating the rock factor on a blast you measured: back-solve it, and check it is stable.
a_back = bf.back_solve_rock_factor(
    0.28, rock_volume_m3=pattern.rock_volume_m3, charge_mass_kg=pattern.charge_mass_kg
)
print(f"rock factor back-solved from a measured 0.28 m: {a_back:.2f}")

# 5. The transfer line: a rock factor from the modulus, fitted over training sites only.
train = bf.load_training_corpus()
transfer = bf.KuznetsovTransfer().fit(train)
print(f"transfer rock factor at 25 GPa: {transfer.rock_factor_for(25.0):.2f}")

# 6. A learned arm, fitted on the corpus, and its portable export (what the browser walks).
forest = bf.default_arms()["random-forest"]().fit(train)
document = bf.export_arm(forest)
value, reason = bf.predict_portable(document, mine)
print(f"random forest, fitted: {forest.predict_one(mine).x50_m:.4f} m; portable: {value:.4f} m ({reason or 'no refusal'})")

# 7. A small benchmark on the closed-form arms (smoke test; see the docstring).
result = bf.run_benchmark(train, bf.default_arms(include_learned=False), n_repeats=5, n_boot=0)
grouped = next(p for p in result.protocols if p.protocol == "leave-one-site-out")
for row in grouped.arms:
    if row.score is not None and row.score.r2_identity is not None:
        print(f"leave one site out, {row.arm}: {row.score.r2_identity:.3f}")
