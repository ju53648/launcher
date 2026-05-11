$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriAppDir = Join-Path $scriptDir "tauri-app"

function Test-SymlinkSupport {
  $probeRoot = Join-Path $env:TEMP "lumorix-symlink-probe"
  $targetFile = Join-Path $probeRoot "target.txt"
  $linkFile = Join-Path $probeRoot "link.txt"

  if (Test-Path -LiteralPath $probeRoot) {
    Remove-Item -LiteralPath $probeRoot -Recurse -Force -ErrorAction SilentlyContinue
  }

  New-Item -ItemType Directory -Path $probeRoot -Force | Out-Null
  Set-Content -LiteralPath $targetFile -Value "probe"

  try {
    New-Item -ItemType SymbolicLink -Path $linkFile -Target $targetFile -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  } finally {
    Remove-Item -LiteralPath $probeRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path -LiteralPath $tauriAppDir -PathType Container)) {
  throw "Tauri app directory not found: $tauriAppDir"
}

# Prefer explicit ANDROID_HOME, but fall back to ANDROID_SDK_ROOT or standard local SDK path.
if (-not $env:ANDROID_HOME -and $env:ANDROID_SDK_ROOT) {
  $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
}

if (-not $env:ANDROID_HOME) {
  $defaultSdkPath = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path -LiteralPath $defaultSdkPath -PathType Container) {
    $env:ANDROID_HOME = $defaultSdkPath
  }
}

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME is not set. Install Android SDK Command-line Tools and set ANDROID_HOME (or ANDROID_SDK_ROOT)."
}

# Resolve NDK_HOME from environment aliases or Android SDK ndk folder.
if (-not $env:NDK_HOME -and $env:ANDROID_NDK_HOME) {
  $env:NDK_HOME = $env:ANDROID_NDK_HOME
}

if (-not $env:NDK_HOME) {
  $ndkRoot = Join-Path $env:ANDROID_HOME "ndk"
  if (Test-Path -LiteralPath $ndkRoot -PathType Container) {
    $latestNdk = Get-ChildItem -LiteralPath $ndkRoot -Directory |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($latestNdk) {
      $env:NDK_HOME = $latestNdk.FullName
    }
  }
}

if (-not $env:NDK_HOME) {
  throw "NDK_HOME is not set. Install Android NDK (recommended 26.x) and set NDK_HOME (or ANDROID_NDK_HOME)."
}

if (-not (Test-SymlinkSupport)) {
  throw "Windows symlink creation is blocked for this shell. Enable Windows Developer Mode (Settings > Privacy & security > For developers) or run this shell as Administrator, then retry Android build."
}

Push-Location $tauriAppDir
try {
  $androidGenDir = Join-Path $tauriAppDir "gen\android"
  if (-not (Test-Path -LiteralPath $androidGenDir -PathType Container)) {
    npm exec tauri android init -- --config tauri.android.conf.json
    if ($LASTEXITCODE -ne 0) {
      throw "tauri android init failed"
    }
  }

  npm exec tauri android build -- --config tauri.android.conf.json
  if ($LASTEXITCODE -ne 0) {
    throw "tauri android build failed"
  }
} finally {
  Pop-Location
}