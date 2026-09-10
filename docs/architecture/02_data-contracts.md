# The two data contracts

## Contract 1, ingestion

The bring-your-own-data gate. Two bands, and they are deliberately not the same band.

**Contract bounds are rejection.** A Young modulus of 60000 is a unit error, not an unusual blast,
and it raises rather than loading. Same for a ratio, a powder factor or a measured size outside
physically possible ranges.

**The fitted envelope is the corpus own range.** A row outside it is an EXTRAPOLATION, admitted only
with an explicit opt-in, and every prediction made on it is stamped and badged. The default is
refusal, so predicting outside the data is something a caller does on purpose.

**Nothing is ever clipped.** A clipped input produces a confident prediction for a design nobody
entered, and it looks exactly like a prediction for one that was.

The ranges live in the engine rather than here, because they are properties of the published corpus,
and because a model and its admissible inputs should not be able to drift apart.

## The integrity gate

It sits behind contract 1 and does two independent things.

**It reproduces the source paper.** Minimum, maximum, mean and standard deviation for all seven
features, recomputed from the shipped rows and compared at the precision each was printed to. Minima
and maxima are gated exactly, because they are facts read straight off the data tables. Means and
standard deviations get one unit of the last printed digit, which is the measured internal
inconsistency of the source itself and no more.

**It compares a content digest.** A mean over 97 rows is a weak detector for a single-cell change:
correcting one powder factor moves it by 0.0006, well inside any rounding step.

The two answer different questions. The statistics say the file still IS the published table. The
digest says it has not MOVED since it was corrected.

That gate found five transcription defects, two of them on the variable being predicted. The tell was
that the paper prints its own descriptive statistics and nothing was reading them.

## Contract 2, the artifact

What the web reads, and the only thing it reads.

Every case file is content-addressed: the digest is computed over the canonical serialisation and
stored inside the file, and the release gate recomputes it. A hand-edited artifact fails.

A TypeScript mirror of the schema lives beside the loader, and the type-check runs before every
build. A field renamed on one side and not the other stops the build rather than rendering an empty
chart that looks exactly like a working one.

Every predicted cell carries a number or a reason. Never neither. The gate fails the bake on one
unexplained abstention.

Non-finite floats serialise as null. Python writes NaN and Infinity into JSON without complaint and
neither is valid JSON; a browser throws on the first one and the whole artifact becomes unreadable.
The writer additionally refuses to emit them, and the release gate greps the written text for the
three tokens. Three layers, because this defect is invisible until a browser hits it and the symptom
is a blank page rather than an error anybody can trace.
