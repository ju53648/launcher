$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptDir))
$gameSourceDir = Join-Path $repoRoot "games\orbit-salvager"
$tauriAppDir = Join-Path $scriptDir "tauri-app"
$tauriUiDir = Join-Path $tauriAppDir "ui"
$runtimeDir = Join-Path $scriptDir "runtime"
$releaseDir = Join-Path $scriptDir "release"
$webDistDir = Join-Path $gameSourceDir "dist"
$releaseExe = Join-Path $tauriAppDir "target\release\orbit-salvager-app.exe"
$outExeRoot = Join-Path $scriptDir "OrbitSalvager.exe"
$outExeRuntime = Join-Path $runtimeDir "OrbitSalvager.exe"
$tauriConfigPath = Join-Path $tauriAppDir "tauri.conf.json"

function Copy-FileWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [Parameter(Mandatory = $true)]
    [string]$Destination,
    [int]$Attempts = 6,
    [int]$DelayMilliseconds = 450
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    try {
      Copy-Item -LiteralPath $Source -Destination $Destination -Force
      return $true
    } catch {
      if ($attempt -eq $Attempts) {
        return $false
      }
      Start-Sleep -Milliseconds $DelayMilliseconds
    }
  }

  return $false
}

if (-not (Test-Path -LiteralPath $gameSourceDir -PathType Container)) {
  throw "Game source directory not found: $gameSourceDir"
}

if (-not (Test-Path -LiteralPath $tauriAppDir -PathType Container)) {
  throw "Tauri app directory not found: $tauriAppDir"
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
  throw "Could not resolve Orbit Salvager package version from $tauriConfigPath"
}

$archiveBaseName = "orbit-salvager-win64"
$archivePath = Join-Path $releaseDir ("$archiveBaseName.zip")
$archiveHashPath = "$archivePath.sha256"
$archiveStageDir = Join-Path $releaseDir "archive-stage"
$archiveStageExe = Join-Path $archiveStageDir "OrbitSalvager.exe"

Push-Location $gameSourceDir
try {
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed in $gameSourceDir"
  }

  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed in $gameSourceDir"
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $webDistDir -PathType Container)) {
  throw "Web build output not found: $webDistDir"
}

if (Test-Path -LiteralPath $tauriUiDir) {
  Remove-Item -LiteralPath $tauriUiDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tauriUiDir | Out-Null
Copy-Item -Path (Join-Path $webDistDir "*") -Destination $tauriUiDir -Recurse -Force

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

if (-not (Copy-FileWithRetry -Source $releaseExe -Destination $outExeRoot)) {
  throw "Could not copy built executable to $outExeRoot"
}

$runtimePublished = Copy-FileWithRetry -Source $releaseExe -Destination $outExeRuntime

if (Test-Path -LiteralPath $archiveStageDir -PathType Container) {
  Remove-Item -LiteralPath $archiveStageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $archiveStageDir | Out-Null

if (-not (Copy-FileWithRetry -Source $releaseExe -Destination $archiveStageExe)) {
  throw "Could not stage archive executable at $archiveStageExe"
}

if (Test-Path -LiteralPath $archivePath -PathType Leaf) {
  Remove-Item -LiteralPath $archivePath -Force
}

if (Test-Path -LiteralPath $archiveHashPath -PathType Leaf) {
  Remove-Item -LiteralPath $archiveHashPath -Force
}

Compress-Archive -LiteralPath $archiveStageExe -DestinationPath $archivePath -Force
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText($archiveHashPath, $archiveHash, [System.Text.UTF8Encoding]::new($false))

$runtimeBytes = (Get-Item -LiteralPath $archiveStageExe).Length
$archiveBytes = (Get-Item -LiteralPath $archivePath).Length

Write-Host "Built $outExeRoot"
if ($runtimePublished) {
  Write-Host "Published runtime executable to $outExeRuntime"
} else {
  Write-Warning "Runtime executable in $outExeRuntime could not be refreshed after multiple attempts. Archive output is current; close the running app and rebuild to refresh the runtime install copy."
}
Write-Host "Created release archive $archivePath"
Write-Host "PACKAGE_VERSION $packageVersion"
Write-Host "RUNTIME_SIZE_BYTES $runtimeBytes"
Write-Host "ARCHIVE_SIZE_BYTES $archiveBytes"
Write-Host "ARCHIVE_SHA256 $archiveHash"
