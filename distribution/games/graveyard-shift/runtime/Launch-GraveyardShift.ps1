Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$modulesRoot = Join-Path $PSScriptRoot 'modules'
$moduleFiles = @(
    'Paths.ps1'
    'Ui.ps1'
    'GameCore.ps1'
    'Entrypoint.ps1'
)

foreach ($moduleFile in $moduleFiles) {
    . (Join-Path $modulesRoot $moduleFile)
}

Invoke-GraveyardShiftLauncher -LauncherPath $PSCommandPath