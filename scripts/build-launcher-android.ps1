$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME is not set. Install the Android SDK and set ANDROID_HOME before building Lumorix Launcher Android."
}

if (-not $env:NDK_HOME) {
  throw "NDK_HOME is not set. Install the Android NDK and set NDK_HOME before building Lumorix Launcher Android."
}

Push-Location $repoRoot
try {
  npm run tauri:android:build
  if ($LASTEXITCODE -ne 0) {
    throw "Launcher Android build failed"
  }
} finally {
  Pop-Location
}