# Bake every case plus the cross-case benchmark.
#
# This is the heavy lane and it is a deliberate, versioned operation. It is never run at deploy time.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
python data-pipeline/run.py @args
