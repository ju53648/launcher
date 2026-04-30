Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$entry = Join-Path $PSScriptRoot '..\src\Start-Game.ps1'
& (Resolve-Path $entry).Path
