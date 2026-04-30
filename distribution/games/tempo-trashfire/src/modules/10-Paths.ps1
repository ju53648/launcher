Set-StrictMode -Version Latest

function Get-GameRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-RuntimeLaunchPath {
  $root = Get-GameRoot
  return (Join-Path $root (Join-Path 'runtime' $script:RuntimeLaunchFile))
}
