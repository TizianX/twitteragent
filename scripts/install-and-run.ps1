$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm is required. Install Node.js 20+ and rerun."
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

Write-Host "Building desktop app..."
npm run build

Write-Host "Starting desktop app..."
npm run start
Write-Host "Starting desktop app..."
npm run dev
