$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptDir))
$baseManifestPath = Join-Path $repoRoot "src-tauri\manifests\orbit-salvager.json"
$runtimeDir = Join-Path $scriptDir "runtime"
$runtimeExe = Join-Path $runtimeDir "OrbitSalvager.exe"
$localManifestDir = Join-Path $env:LOCALAPPDATA "Lumorix Launcher\Manifests"
$localManifestPath = Join-Path $localManifestDir "local-orbit-salvager-dev.json"

if (-not (Test-Path -LiteralPath $baseManifestPath -PathType Leaf)) {
  throw "Base manifest not found: $baseManifestPath"
}

if (-not (Test-Path -LiteralPath $runtimeDir -PathType Container)) {
  throw "Runtime directory not found: $runtimeDir"
}

if (-not (Test-Path -LiteralPath $runtimeExe -PathType Leaf)) {
  throw "Runtime executable not found: $runtimeExe"
}

if (-not (Test-Path -LiteralPath $localManifestDir -PathType Container)) {
  New-Item -ItemType Directory -Path $localManifestDir | Out-Null
}

$manifest = Get-Content -LiteralPath $baseManifestPath -Raw | ConvertFrom-Json
$manifest.installSizeBytes = [int64](Get-Item -LiteralPath $runtimeExe).Length
$manifest.installStrategy = [pscustomobject]@{
  kind = "directFolder"
  sourcePath = $runtimeDir
}
$manifest.download = [pscustomobject]@{
  kind = "localSynthetic"
  integrity = "orbit-salvager-dev-local-$($manifest.version)"
}

$json = $manifest | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($localManifestPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Registered local Orbit Salvager dev manifest at $localManifestPath"
Write-Host "DIRECT_SOURCE $runtimeDir"
