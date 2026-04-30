function Get-GraveyardShiftPaths {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LauncherPath
    )

    $runtimeRoot = Split-Path -Parent $LauncherPath
    $modulesRoot = Join-Path $runtimeRoot 'modules'
    $assetManifestPath = Join-Path $runtimeRoot 'asset-manifest.json'
    $saveRoot = Join-Path $env:LOCALAPPDATA 'Lumorix\graveyard-shift'

    if (-not (Test-Path $saveRoot)) {
        New-Item -Path $saveRoot -ItemType Directory -Force | Out-Null
    }

    return @{
        RuntimeRoot = $runtimeRoot
        ModulesRoot = $modulesRoot
        AssetManifestPath = $assetManifestPath
        SaveRoot = $saveRoot
        BestScorePath = Join-Path $saveRoot 'best-score.txt'
    }
}
