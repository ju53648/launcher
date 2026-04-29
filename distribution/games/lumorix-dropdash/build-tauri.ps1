$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriAppDir = Join-Path $scriptDir "tauri-app"
$runtimeDir = Join-Path $scriptDir "runtime"
$releaseDir = Join-Path $scriptDir "release"
$releaseExe = Join-Path $tauriAppDir "target\release\lumorix-dropdash-app.exe"
$outExeRoot = Join-Path $scriptDir "LumorixDropDash.exe"
$outExeRuntime = Join-Path $runtimeDir "LumorixDropDash.exe"
$tauriConfigPath = Join-Path $tauriAppDir "tauri.conf.json"
$tauriUiDir = Join-Path $tauriAppDir "ui"

if (-not (Test-Path -LiteralPath $tauriAppDir -PathType Container)) {
  throw "Tauri app directory not found: $tauriAppDir"
}

if (-not (Test-Path -LiteralPath $tauriUiDir -PathType Container)) {
  throw "Tauri UI directory not found: $tauriUiDir"
}

if (-not (Test-Path -LiteralPath $runtimeDir -PathType Container)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

if (-not (Test-Path -LiteralPath $releaseDir -PathType Container)) {
  New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

if (-not (Test-Path -LiteralPath $tauriConfigPath -PathType Leaf)) {
  throw "Tauri config not found: $tauriConfigPath"
}

$tauriConfig = Get-Content -LiteralPath $tauriConfigPath -Raw | ConvertFrom-Json
$packageVersion = [string]$tauriConfig.version
if ([string]::IsNullOrWhiteSpace($packageVersion)) {
  throw "Could not resolve DropDash package version from $tauriConfigPath"
}

$archiveBaseName = "lumorix-dropdash-win64"
$archivePath = Join-Path $releaseDir ("$archiveBaseName.zip")
$archiveHashPath = "$archivePath.sha256"

Push-Location $tauriAppDir
try {
  cargo build --release
  if ($LASTEXITCODE -ne 0) {
    throw "cargo build --release failed"
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $releaseExe -PathType Leaf)) {
  throw "Built executable not found: $releaseExe"
}

Copy-Item -LiteralPath $releaseExe -Destination $outExeRoot -Force
Copy-Item -LiteralPath $releaseExe -Destination $outExeRuntime -Force

if (Test-Path -LiteralPath $archivePath -PathType Leaf) {
  Remove-Item -LiteralPath $archivePath -Force
}

if (Test-Path -LiteralPath $archiveHashPath -PathType Leaf) {
  Remove-Item -LiteralPath $archiveHashPath -Force
}

Compress-Archive -LiteralPath $outExeRuntime -DestinationPath $archivePath -Force
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText($archiveHashPath, $archiveHash, [System.Text.UTF8Encoding]::new($false))

$runtimeBytes = (Get-Item -LiteralPath $outExeRuntime).Length
$archiveBytes = (Get-Item -LiteralPath $archivePath).Length

Write-Host "Built $outExeRoot"
Write-Host "Published runtime executable to $outExeRuntime"
Write-Host "Created release archive $archivePath"
Write-Host "PACKAGE_VERSION $packageVersion"
Write-Host "RUNTIME_SIZE_BYTES $runtimeBytes"
Write-Host "ARCHIVE_SIZE_BYTES $archiveBytes"
Write-Host "ARCHIVE_SHA256 $archiveHash"
