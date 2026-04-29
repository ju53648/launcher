param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,

    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$ReleaseDate,
    [string]$Description,
    [string]$CommitMessage,
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$configFullPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) {
    $ConfigPath
} else {
    Join-Path $repoRoot $ConfigPath
}

if (-not (Test-Path -LiteralPath $configFullPath -PathType Leaf)) {
    throw "Config file not found: $configFullPath"
}

$config = Get-Content -LiteralPath $configFullPath -Raw | ConvertFrom-Json
$config.version = $Version

if (-not [string]::IsNullOrWhiteSpace($ReleaseDate)) {
    $config.releaseDate = $ReleaseDate
}

if (-not [string]::IsNullOrWhiteSpace($Description)) {
    $config.description = $Description
}

$configJson = $config | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($configFullPath, $configJson, [System.Text.UTF8Encoding]::new($false))

Push-Location $repoRoot
try {
    & (Join-Path $PSScriptRoot "update-game-manifest.ps1") -ConfigPath $ConfigPath

    $pathsToAdd = @()
    $pathsToAdd += $ConfigPath
    $pathsToAdd += [string]$config.manifestPath
    $pathsToAdd += "distribution/manifests/catalog.json"

    if (-not [string]::IsNullOrWhiteSpace($config.archivePath)) {
        $pathsToAdd += [string]$config.archivePath
        $pathsToAdd += ([string]$config.archivePath + ".sha256")
    }

    foreach ($path in $pathsToAdd | Select-Object -Unique) {
        if (Test-Path -LiteralPath (Join-Path $repoRoot $path) -PathType Leaf) {
            git add -- $path
        }
    }

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "No staged changes detected; nothing to commit."
        return
    }

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $manifestPath = [string]$config.manifestPath
        $gameName = [System.IO.Path]::GetFileNameWithoutExtension($manifestPath)
        $CommitMessage = "game: update $gameName to v$Version"
    }

    git commit -m $CommitMessage

    if (-not $NoPush) {
        git push
    }

    Write-Host "Release flow completed for version $Version"
} finally {
    Pop-Location
}
