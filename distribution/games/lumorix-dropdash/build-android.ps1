$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriAppDir = Join-Path $scriptDir "tauri-app"

if (-not (Test-Path -LiteralPath $tauriAppDir -PathType Container)) {
  throw "Tauri app directory not found: $tauriAppDir"
}

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME is not set. Install the Android SDK and set ANDROID_HOME before building DropDash Android."
}

if (-not $env:NDK_HOME) {
  throw "NDK_HOME is not set. Install the Android NDK and set NDK_HOME before building DropDash Android."
}

Push-Location $tauriAppDir
try {
  npm exec tauri android build -- --config tauri.android.conf.json
  if ($LASTEXITCODE -ne 0) {
    throw "tauri android build failed"
  }
} finally {
  Pop-Location
}