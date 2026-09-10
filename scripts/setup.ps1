# Isolated environments only: a Python venv here and a local node_modules there. Never global.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-precompute.txt -r requirements-dev.txt
Push-Location frontend; npm ci; Pop-Location
Write-Host "ready: python data-pipeline/run.py --validate, then scripts/dev.ps1"
