# numpy: applying it to the measurement

Two measurement habits this product depends on, each a few lines of numpy ([example.py](example.py)
runs both on the corpus). The engine writes them in plain Python; this is the same method in the form
most analysis code uses.

## 1. Name the statistic

```python
def r2_identity(y, p):
    return 1 - np.sum((y - p) ** 2) / np.sum((y - y.mean()) ** 2)

def r2_pearson(y, p):
    return np.corrcoef(y, p)[0, 1] ** 2
```

On the 2012 hold-out the printed classical column scores 0.232 on the first and 0.570 on the second.
Report both, and call only the first "variance explained".

## 2. Resample the groups, not the rows

```python
rng = np.random.default_rng(0)
draws = []
for _ in range(2000):
    pick = rng.choice(sites, size=len(sites), replace=True)        # sites, with replacement
    sample = np.vstack([by_site[s] for s in pick])                 # every row of each drawn site
    draws.append(r2_identity(sample[:, 0], sample[:, 1]))
low, high = np.percentile(draws, [2.5, 97.5])
```

`by_site[s]` holds the measured and predicted values of site `s`, with predictions already made by a
model fitted without that site. Resampling rows instead would treat rows of one campaign as
independent and give an interval narrower than the data support. On the corpus the classical arm's
score is 0.311 with a site-resampled interval of about -0.95 to 0.70.

## 3. Fix and record the seed

Draw every seed before any fitting, record it in the output, and treat a different number from a
different seed as a result to report (the published network's 30-seed sweep, [results/05](../../results/05_published-reproductions.md)),
not as noise to average away silently.
