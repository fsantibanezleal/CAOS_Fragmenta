# Hold-outs and field blasts

Two published validation sets from the same sites as the corpus, one row that is in both training and
validation, and five field blasts from a mine outside the corpus envelope.

---

## 1. The published hold-outs, fourteen rows

The engine ships the union of two published validation sets, with flags that reproduce either one:

| Set | Rows | Source | What it prints |
|---|---|---|---|
| `2012` | 12 | Kulatilake, Hudaverdi and Wu (2012), Tables 4 and 5 | the measurement and three models' predictions on the same rows: classical, regression, network |
| `2010` | 13 | Hudaverdi et al. (2010), Table VIII | the measurement and the regression prediction |
| union | 14 | both | |

The benchmark artifact carries the twelve 2012 rows and the two rows only in the 2010 set
(`holdout_rows`), so the Benchmark page can re-score them in the browser with the models fitted on the
whole corpus ("Live check"), and the five field rows below.

All fourteen come from sites in the corpus. A score on them measures how a model does on new blasts at
known sites, which is a weaker question than a new mine; the leave-one-site-out protocol asks the
stronger one.

## 2. One validation blast is also a training blast

Rc1 appears in the 2010 Table I as one of the 35 high-modulus training blasts, and again in the 2012
Table 4 as one of the five high-modulus validation blasts, with the same measured size of 0.46 m. The
2012 paper states that its high-modulus network was trained on those 35 and validated on those five.
The 2010 set does not contain Rc1 (it lists Mi7 and Ad25 instead), so the substitution happened between
the two papers and carried training membership with it.

The effect was measured rather than assumed. Removing Rc1 and rescoring the remaining eleven printed
predictions lowers the regression and network columns slightly (0.708 to 0.696, and 0.910 to 0.905)
and raises the classical column from 0.232 to 0.448, because Rc1 is one of the classical column's worst
rows. The network does get a row it has seen: this product's reproduction, trained on the same 35
blasts, predicts Rc1 at 0.46 m on every seed, the measured value. On twelve rows that is worth little
of its score. The table is in [results/05](../results/05_published-reproductions.md).

The 2012 paper also states the cross-set duplicate itself: En13 (validation) has the same seven inputs
as En4 (training), and its prediction is almost the same. Fixed hold-out numbers are not moved by this;
anything computed from a random split of the 97 is, which is one reason the benchmark repeats its
random protocol after collapsing duplicates.

## 3. The field blasts, outside the envelope

Five production blasts at a granite mine in north-east China, from Sui et al. (2025), open access under
CC BY 4.0, with fragment size measured by Split-Desktop against a one-metre on-site scale.

| | Field set | Corpus |
|---|---|---|
| Young modulus | 5.6 GPa | 9.57 to 60 GPa |
| absolute pattern published | yes | no (recovered, see [data/03](03_geometry.md)) |
| in any training scope | never | |

Every prediction on these five is an extrapolation, on the feature both 2025 studies rank as the most
important. They are carried for two reasons: they are the only real out-of-envelope test available,
and, because the source publishes the absolute pattern and the ratios, they are the one place the
geometry reconstruction is checked against a published answer rather than a narrative range. In the
App they are the case `real-granite-ne`, whose predictions carry the extrapolation stamp.

## 4. How each set is used

| Set | Benchmark | App | Docs |
|---|---|---|---|
| corpus, 97 | the three protocols | nine real-campaign cases, each without its own site in training | [data/01](01_corpus.md) |
| 2012 hold-out, 12 | the published reproductions; the browser live check | | [results/05](../results/05_published-reproductions.md) |
| 2010-only, 2 | the 2010 regression reproduction | | |
| field, 5 | the extrapolation control | `real-granite-ne` | this page |

## Sources

- Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). *Geotech. Geol. Eng.* [doi:10.1007/s10706-012-9496-3](https://doi.org/10.1007/s10706-012-9496-3)
- Hudaverdi, T., Kulatilake, P. H. S. W. and Kuzu, C. (2010). *Int. J. Numer. Anal. Methods Geomech.* 35:1318-1333. [doi:10.1002/nag.957](https://doi.org/10.1002/nag.957)
- Sui, Y., Zhou, Z., Zhao, R., Yang, Z. and Zou, Y. (2025). *Applied Sciences* 15:1254. [doi:10.3390/app15031254](https://doi.org/10.3390/app15031254)
