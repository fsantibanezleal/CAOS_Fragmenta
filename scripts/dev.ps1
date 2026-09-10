# Run the site locally against the committed artifacts.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot ".." "frontend")
npm run dev
