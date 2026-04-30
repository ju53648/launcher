Set-StrictMode -Version Latest

function Start-LegacyRuntime {
  Test-RuntimeLaunchExists
  Test-RuntimeLaunchParser

  $launchPath = Get-RuntimeLaunchPath
  & $launchPath
}
