# Isolated environments only: a Python venv here and a local node_modules there. Never global. With -Notebooks it builds
# the notebook environment instead, .venv-notebooks from notebooks/requirements.txt (scripts/run_notebooks.py runs in it).
param([switch]$Notebooks)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$py = if ($env:PYTHON) { $env:PYTHON } else { "python" }

if ($Notebooks) {
  Write-Host "[setup] .venv-notebooks (the notebook environment)"
  if (-not (Test-Path ".venv-notebooks")) { & $py -m venv .venv-notebooks }
  & .\.venv-notebooks\Scripts\python.exe -m pip install --upgrade pip -q
  & .\.venv-notebooks\Scripts\python.exe -m pip install -q -r notebooks/requirements.txt
  Write-Host "[setup] .venv-notebooks ready. Next: python scripts/run_notebooks.py --check"
  exit 0
}

& $py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-precompute.txt -r requirements-dev.txt
Push-Location frontend; npm ci; Pop-Location
Write-Host "ready: python data-pipeline/run.py --validate, then scripts/dev.ps1"
