Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$runtimeRoot = Resolve-Path (Join-Path $PSScriptRoot '..\runtime')
$nativeExecutable = Join-Path $runtimeRoot 'GraveyardShift.exe'
if (Test-Path -LiteralPath $nativeExecutable -PathType Leaf) {
    Start-Process -FilePath $nativeExecutable -WorkingDirectory $runtimeRoot | Out-Null
    return
}

$entry = Join-Path $PSScriptRoot '..\src\Start-Game.ps1'
& (Resolve-Path $entry).Path