Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\src\modules\00-Config.ps1')
. (Join-Path $PSScriptRoot '..\src\modules\10-Paths.ps1')
. (Join-Path $PSScriptRoot '..\src\modules\20-Checks.ps1')

Test-RuntimeLaunchExists
Test-RuntimeLaunchParser
Write-Output "Parser OK: $script:GameSlug"
