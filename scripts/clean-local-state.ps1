[CmdletBinding()]
param(
  [switch]$RunUninstall,
  [switch]$RemoveUpdaterKeys
)

$ErrorActionPreference = "Stop"

Write-Output "[Lumorix] Scanning uninstall entries"
$regPaths = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$lumorixEntries = foreach ($rp in $regPaths) {
  Get-ItemProperty -Path $rp -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*Lumorix*" } |
    Select-Object DisplayName, UninstallString
}

if ($lumorixEntries) {
  $lumorixEntries | Format-Table -AutoSize | Out-String | Write-Output
  if ($RunUninstall) {
    foreach ($entry in $lumorixEntries) {
      if ($entry.UninstallString) {
        Write-Output "Running uninstall: $($entry.DisplayName)"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $entry.UninstallString -Wait
      }
    }
  } else {
    Write-Output "Use -RunUninstall to execute uninstall commands."
  }
} else {
  Write-Output "No Lumorix uninstall entries found."
}

Write-Output "`n[Lumorix] Removing desktop/start menu shortcuts"
$shortcutRoots = @(
  [Environment]::GetFolderPath("Desktop"),
  "$env:Public\Desktop",
  "$env:AppData\Microsoft\Windows\Start Menu\Programs",
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
)

foreach ($root in $shortcutRoots) {
  if (-not (Test-Path $root)) {
    continue
  }

  Get-ChildItem -Path $root -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*Lumorix*" } |
    ForEach-Object {
      Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
      Write-Output "Removed shortcut/menu entry: $($_.FullName)"
    }
}

Write-Output "`n[Lumorix] Removing local app state"
$localState = "$env:LocalAppData\Lumorix Launcher"
$roamingState = "$env:AppData\Lumorix Launcher"

if (Test-Path $localState) {
  if ($RemoveUpdaterKeys) {
    Remove-Item -Path $localState -Recurse -Force
    Write-Output "Removed: $localState"
  } else {
    $keysPath = Join-Path $localState "keys"
    $tempKeys = Join-Path $env:TEMP "lumorix-updater-keys"
    if (Test-Path $tempKeys) {
      Remove-Item -Path $tempKeys -Recurse -Force
    }

    if (Test-Path $keysPath) {
      New-Item -ItemType Directory -Path $tempKeys | Out-Null
      Copy-Item -Path "$keysPath\*" -Destination $tempKeys -Recurse -Force -ErrorAction SilentlyContinue
    }

    Remove-Item -Path $localState -Recurse -Force
    Write-Output "Removed: $localState"

    if (Test-Path $tempKeys) {
      New-Item -ItemType Directory -Path $keysPath -Force | Out-Null
      Copy-Item -Path "$tempKeys\*" -Destination $keysPath -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path $tempKeys -Recurse -Force
      Write-Output "Restored updater keys to: $keysPath"
    }
  }
} else {
  Write-Output "Not found: $localState"
}

if (Test-Path $roamingState) {
  Remove-Item -Path $roamingState -Recurse -Force
  Write-Output "Removed: $roamingState"
} else {
  Write-Output "Not found: $roamingState"
}
