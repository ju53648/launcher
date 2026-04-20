$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$targets = @(
  "dist",
  "src-tauri/target",
  "lumorix-vite.err.log",
  "lumorix-vite.out.log"
)

foreach ($target in $targets) {
  if (Test-Path $target) {
    Remove-Item -Path $target -Recurse -Force
    Write-Output "Removed: $target"
  } else {
    Write-Output "Not found: $target"
  }
}
