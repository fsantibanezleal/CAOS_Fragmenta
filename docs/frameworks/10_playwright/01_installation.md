# Playwright: installation

A development dependency in `frontend/package.json`. The browser binaries are installed separately:

```bash
cd frontend
npx playwright install chromium            # the deploy adds --with-deps on its Linux runner
```

On a Windows development machine, keep the browsers off the system drive by setting
`PLAYWRIGHT_BROWSERS_PATH` before installing and running (the CAOS convention puts them under the data
drive's temporary folder). `GATE_CHANNEL=chrome` runs the gate on an installed Chrome instead of the
downloaded Chromium.
