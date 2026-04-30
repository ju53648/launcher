function Invoke-GraveyardShiftLauncher {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LauncherPath
    )

    $paths = Get-GraveyardShiftPaths -LauncherPath $LauncherPath
    Start-GraveyardShiftRuntime -Paths $paths
}
