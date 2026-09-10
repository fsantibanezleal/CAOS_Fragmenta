# Everything that decides whether this may ship, in the order it fails fastest.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
ruff check data-pipeline tests
pytest -q
python data-pipeline/run.py --validate
Push-Location frontend; npm test; npm run build; Pop-Location
