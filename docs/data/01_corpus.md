# The corpus

Ninety-seven bench blasts in ten campaigns across five countries, from Hudaverdi, Kulatilake and Kuzu
(2010), Tables I and II: what each field is, where each campaign comes from, how fragment size was
measured, and the five transcription defects a gate found and now guards against.

---

## 1. Source and assembly

Hudaverdi and colleagues assembled the database from their own fieldwork at two quarries near Istanbul
and from earlier published studies at eight other sites. The countries are Spain (Enusa, and Reocin
open pit and underground), Turkey (Murgul, Soma, Akdaglar and Ozmert), India (Dongri-Buzurg),
Indonesia (Mrica) and the United States (Miami, Arizona).

## 2. Fields

The corpus is dimensionless by design, so that blasts at very different scales sit in one table.

| Field | Meaning | Unit | Corpus range |
|---|---|---|---|
| `S_over_B` | spacing over burden | ratio | 1.00 to 1.75 |
| `H_over_B` | bench height over burden, the rock-beam stiffness | ratio | 1.33 to 6.82 |
| `B_over_D` | burden over hole diameter | ratio | 17.98 to 39.47 |
| `T_over_B` | stemming over burden | ratio | 0.50 to 4.67 |
| `Pf_kg_m3` | powder factor | kg/m3 | 0.22 to 1.26 |
| `XB_m` | in-situ block size | m | 0.02 to 2.35 |
| `E_GPa` | Young modulus | GPa | 9.57 to 60.00 |
| `x50_m` | measured mean fragment size, the target | m | 0.02 to 0.96 (mean 0.304) |
| `site`, `blast_id`, `group` | campaign, the source's row label, the published stiffness group | | |

The source explains the ratios: spacing over burden is set by energy coverage of the bench (a square
pattern is 1); stemming over burden is usually around 1, with early venting and flyrock below and
boulders above; burden over diameter is around 30 for average conditions and 25 for a low-density
explosive such as ANFO; bench height over burden indicates the stiffness of the rock beam under
blast-induced stress. Every blast used ANFO, which fixes the relative weight strength at 100 for the
whole corpus.

## 3. The campaigns

<!-- facts:campaigns -->
| campaign | mine | rock | E, GPa | hole diameter, mm | blasts | mean measured x50, m | measurement, where stated |
|---|---|---|---|---|---|---|---|
| Akdaglar | Akdaglar Quarry, Cendere basin, Istanbul | sandstone, density 2.70 g/cm3, UCS 81 MPa, E 16.9 GPa | 16.9 | 89.0 | 22 | 0.171 | Wipfrag image analysis, multiple images per muckpile (stated) |
| Dongri-Buzurg | Dongri-Buzurg open-pit manganese mine, Central India | micaceous and muscovite schist | 9.57 | 100.0 | 9 | 0.413 | not stated |
| Enusa | Enusa open-pit uranium mine, Spain | schist, moderately to heavily folded | 60.0 | 165.0 | 12 | 0.396 | not stated |
| Miami | Miami Mine, Arizona, USA | highly fractured pinal schist | 10.0 | not published | 6 | 0.080 | not stated |
| Mrica | Mrica Quarry, Indonesia | andesite | 32.0 | 76.0 | 11 | 0.166 | not stated |
| Murgul | Murgul open-pit copper mine, Turkey | dacite and altered dacite | 50.0 | 165.0 | 7 | 0.311 | not stated |
| Ozmert | Ozmert Quarry, Cendere basin, Istanbul | sandstone | 15.0 | 89.0 | 7 | 0.191 | Wipfrag image analysis, multiple images per muckpile (stated) |
| Reocin | Reocin open-pit zinc mine, Spain | carbonate-hosted zinc ore | 45.0 | 229.0 | 10 | 0.616 | not stated |
| Reocin-UG | Reocin underground mine, Spain | carbonate-hosted zinc ore | 45.0 | 91.2 | 6 | 0.593 | not stated |
| Soma | open-pit coal mine, Soma Basin, Turkey | coal measures | 13.25 | 210.0 | 7 | 0.224 | image analysis software (stated) |
<!-- /facts -->

**Rows are not independent.** Akdaglar supplies 22 of the 97 rows, and rows of one campaign share a
rock, a rig, an explosive supply and a measurement method. Seventeen rows duplicate another row's input
vector, in seven groups: En1 with En2, En3 with En5, En8 with En9, En11 with En12, Mr1 with Mr3, Sm1
to Sm3, and Sm4 to Sm7. Both facts are why the benchmark holds out whole campaigns, collapses
duplicates in its second protocol, and resamples campaigns for its intervals
([protocols/02](../protocols/02_three-protocols.md)).

## 4. How fragment size was measured

Sieving a muckpile is impractical, so the corpus relies on image analysis. The Istanbul quarries used
WipFrag on several photographs per muckpile, combined, with the joint structure and in-situ block size
from WipJoint on images of the bench face taken before each blast; Soma used image analysis software.
For the other campaigns the corpus reuses the sizes of the original studies without restating the
method. Image analysis carries its own scatter, which bounds how much variance any model can explain on
this table.

## 5. Five transcription defects, and the gate that found them

The corpus as first assembled disagreed with the published tables in five cells. Two independent PDF
copies of the paper, parsed separately, agree with each other and disagree with the file in exactly
these places:

| Blast | Column | Published | As found | What happened |
|---|---|---|---|---|
| Db5 | `Pf_kg_m3` | 0.39 | 0.33 | wrong digit |
| Sm4 | `x50_m` | 0.22 | 0.24 | wrong digit, on the target |
| Ad15 | `x50_m` | 0.15 | 0.22 | wrong digit, on the target |
| Ad17 | `Pf_kg_m3` | 1.24 | 1.07 | wrong digit |
| Ad19 | `Pf_kg_m3` | 1.26 | 1.47 | the row's own block size copied into the powder-factor column |

The tell was the powder-factor maximum: 1.47 in the file against the 1.26 the paper prints in its own
summary table. The paper had printed a checksum and nothing was reading it.

**The integrity gate** now runs on every load of the corpus (`check_source_integrity` in the engine)
and does two independent things:

1. **It reproduces the source's summary table.** Minimum, maximum, mean and standard deviation of all
   seven features, recomputed from the shipped rows and compared at the precision each was printed to:

   $$
   \left|\,\hat\theta - \theta^{\mathrm{pub}}\right| \le u_k,\qquad \theta \in \{\min, \max, \bar x, s\}
   $$

   Minima and maxima are gated exactly, because they are values read straight off the data tables.
   Means and standard deviations get one unit of the last printed digit ($u_k = 10^{-k}$ at $k$ printed
   decimals), which is the measured internal inconsistency of the source: all fourteen minima and maxima
   reproduce exactly, and four of the twenty-eight cells are one unit off at the last digit (the powder
   factor's and the block size's standard deviations one low, the stiffness ratio's and the block
   size's means one high, the source having truncated rather than rounded).
2. **It compares a content digest.** A mean over 97 rows detects a one-cell change poorly: correcting
   one powder factor by 0.06 moves the mean by 0.0006, inside any rounding step. The digest catches
   any change at all.

The statistics say the file is still the published table; the digest says it has not moved since it
was corrected. The engine tests both, including a test that reintroduces the original defect and
requires the gate to fail. The benchmark artifact records the digest it ran on (`corpus_digest`), and
the release gate checks it against the installed engine.

## 6. What the gate cannot see

It compares the file with the paper, so it cannot catch an error that is already in the paper. Two
such cases are known and carried with their published inputs: the two papers print different
predictions for the same blasts on five regression rows and ten classical rows, and row Db10 matches
neither paper's regression figure by a factor of two
([methods/05](../methods/05_router-and-regressions.md)).

## Sources

- Hudaverdi, T., Kulatilake, P. H. S. W. and Kuzu, C. (2010). Prediction of blast fragmentation using multivariate analysis procedures. *Int. J. Numer. Anal. Methods Geomech.* 35:1318-1333. [doi:10.1002/nag.957](https://doi.org/10.1002/nag.957)
- Kulatilake, P. H. S. W., Hudaverdi, T. and Wu, Q. (2012). *Geotech. Geol. Eng.* [doi:10.1007/s10706-012-9496-3](https://doi.org/10.1007/s10706-012-9496-3)
- Engine: [blastfrag docs/data/01_the-corpus.md](https://github.com/fsantibanezleal/CAOS_BlastFrag/blob/main/docs/data/01_the-corpus.md)
