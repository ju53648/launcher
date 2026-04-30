$runtimeRoot = $PSScriptRoot
$moduleRoot = Join-Path $runtimeRoot 'modules'

. (Join-Path $moduleRoot 'TempoTrashfire-Ui.ps1')
. (Join-Path $moduleRoot 'TempoTrashfire-Logic.ps1')
. (Join-Path $moduleRoot 'TempoTrashfire-Entrypoint.ps1')

Start-TempoTrashfireRuntime -RuntimeRoot $runtimeRoot