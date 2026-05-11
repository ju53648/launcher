$ErrorActionPreference = "Stop"

$localManifestPath = Join-Path $env:LOCALAPPDATA "Lumorix Launcher\Manifests\local-orbit-salvager-dev.json"

if (Test-Path -LiteralPath $localManifestPath -PathType Leaf) {
  Remove-Item -LiteralPath $localManifestPath -Force
  Write-Host "Removed local Orbit Salvager dev manifest"
} else {
  Write-Host "No local Orbit Salvager dev manifest was registered"
}
