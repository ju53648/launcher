Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'modules\00-Config.ps1')
. (Join-Path $PSScriptRoot 'modules\10-Paths.ps1')
. (Join-Path $PSScriptRoot 'modules\20-Checks.ps1')
. (Join-Path $PSScriptRoot 'modules\90-Bootstrap.ps1')

Start-LegacyRuntime
