# Data

What the product is fed, where each value comes from, what was wrong with it and how that was found,
how an absolute pattern is recovered from a dimensionless table, and the contract every row and every
artifact passes.

| | Page | Contents |
|---|---|---|
| 1 | [The corpus](data/01_corpus.md) | 97 bench blasts in ten campaigns: sources, fields, campaigns, measurement, duplicates, the five transcription defects and the integrity gate |
| 2 | [Hold-outs and field blasts](data/02_holdouts-and-field.md) | the two published validation sets, the row in both training and hold-out, the five field blasts outside the envelope |
| 3 | [Recovering the geometry](data/03_geometry.md) | the diameters in the source prose, the reconstruction, the fifteen constraints, Soma's conflict, Miami |
| 4 | [The data contract](data/04_data-contract.md) | fields, units, rejection bounds, the training envelope, extrapolation, missing values, outliers, and the artifacts the web reads |

![The two data contracts](assets/fig-the-two-data-contracts.svg)

## Licensing of the data

The numeric values are experimental facts published in the cited papers and reused here with
citation; the papers themselves are not redistributed. The field set comes from an open-access paper
under CC BY 4.0 (Sui et al. 2025). The data ship inside the engine,
[blastfrag](https://github.com/fsantibanezleal/CAOS_BlastFrag), with their sources; this product loads
them through the engine and never keeps a private copy.
