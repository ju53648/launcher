$ErrorActionPreference = "Stop"

Write-Output "[1] Processes"
$procs = Get-Process | Where-Object { $_.ProcessName -match "lumorix" } | Select-Object ProcessName, Id, Path
if ($procs) {
  $procs | Format-Table -AutoSize | Out-String | Write-Output
} else {
  Write-Output "Not found"
}

Write-Output "`n[2] Uninstall registry entries"
$regPaths = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$apps = foreach ($rp in $regPaths) {
  Get-ItemProperty -Path $rp -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*Lumorix*" } |
    Select-Object DisplayName, DisplayVersion, InstallLocation, UninstallString
}
if ($apps) {
  $apps | Format-List | Out-String | Write-Output
} else {
  Write-Output "Not found"
}

Write-Output "`n[3] Shortcuts"
$desktopPaths = @([Environment]::GetFolderPath("Desktop"), "$env:Public\Desktop")
$startMenuPaths = @(
  "$env:AppData\Microsoft\Windows\Start Menu\Programs",
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
)

foreach ($path in $desktopPaths + $startMenuPaths) {
  Write-Output "Path: $path"
  if (-not (Test-Path $path)) {
    Write-Output "  Missing"
    continue
  }

  $entries = Get-ChildItem -Path $path -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*Lumorix*" }

  if ($entries) {
    $entries | Select-Object FullName | Format-Table -AutoSize | Out-String | Write-Output
  } else {
    Write-Output "  Not found"
  }
}

Write-Output "`n[4] Local app state"
foreach ($statePath in @("$env:LocalAppData\Lumorix Launcher", "$env:AppData\Lumorix Launcher")) {
  if (Test-Path $statePath) {
    Write-Output "Found: $statePath"
    Get-ChildItem -Path $statePath -Force -ErrorAction SilentlyContinue |
      Select-Object FullName, PSIsContainer |
      Format-Table -AutoSize |
      Out-String |
      Write-Output
  } else {
    Write-Output "Not found: $statePath"
  }
}
