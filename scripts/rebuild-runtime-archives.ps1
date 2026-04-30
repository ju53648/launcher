param(
    [string[]]$GameSlugs
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$gamesRoot = Join-Path $repoRoot "distribution\games"
$distributionManifestRoot = Join-Path $repoRoot "distribution\manifests\games"
$embeddedManifestRoot = Join-Path $repoRoot "src-tauri\manifests"
$catalogPath = Join-Path $repoRoot "distribution\manifests\catalog.json"
$buildRuntimeHostsScript = Join-Path $PSScriptRoot "build-runtime-hosts.ps1"

if (-not $GameSlugs -or $GameSlugs.Count -eq 0) {
    $GameSlugs = Get-ChildItem -LiteralPath $gamesRoot -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName "runtime\modules") } |
        Select-Object -ExpandProperty Name
}

& $buildRuntimeHostsScript -GameSlugs $GameSlugs

function Write-JsonFile([string]$Path, $Value) {
    $json = $Value | ConvertTo-Json -Depth 30
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Get-DirectorySize([string]$Path) {
    $measure = Get-ChildItem -LiteralPath $Path -File -Recurse | Measure-Object -Property Length -Sum
    if ($null -eq $measure.Sum) {
        return 0
    }
    return [int64]$measure.Sum
}

foreach ($gameSlug in $GameSlugs) {
    $runtimeDir = Join-Path $gamesRoot "$gameSlug\runtime"
    $modulesDir = Join-Path $runtimeDir "modules"
    $releaseDir = Join-Path $gamesRoot "$gameSlug\release"
    $archivePath = Join-Path $releaseDir "$gameSlug-win64.zip"
    $hashPath = "$archivePath.sha256"
    $distributionManifestPath = Join-Path $distributionManifestRoot "$gameSlug.json"
    $embeddedManifestPath = Join-Path $embeddedManifestRoot "$gameSlug.json"

    if (-not (Test-Path -LiteralPath $runtimeDir -PathType Container)) {
        throw "Runtime directory not found for ${gameSlug}: $runtimeDir"
    }
    if (-not (Test-Path -LiteralPath $modulesDir -PathType Container)) {
        throw "Expected modules directory is missing for ${gameSlug}: $modulesDir"
    }
    if (-not (Test-Path -LiteralPath $distributionManifestPath -PathType Leaf)) {
        throw "Distribution manifest not found for ${gameSlug}: $distributionManifestPath"
    }
    if (-not (Test-Path -LiteralPath $embeddedManifestPath -PathType Leaf)) {
        throw "Embedded manifest not found for ${gameSlug}: $embeddedManifestPath"
    }

    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $runtimeDir,
        $archivePath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $archiveSize = (Get-Item -LiteralPath $archivePath).Length
    $installSize = Get-DirectorySize $runtimeDir
    [System.IO.File]::WriteAllText($hashPath, $archiveHash, [System.Text.UTF8Encoding]::new($false))

    foreach ($manifestPath in @($distributionManifestPath, $embeddedManifestPath)) {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        $manifest.installSizeBytes = $installSize
        $requiredPaths = @("modules")

        if ($manifest.PSObject.Properties.Name -contains "requiredPaths") {
            $manifest.requiredPaths = $requiredPaths
        } else {
            $manifest | Add-Member -NotePropertyName requiredPaths -NotePropertyValue $requiredPaths
        }

        if ($manifestPath -eq $distributionManifestPath -and $manifest.download.kind -eq "httpArchive") {
            $manifest.download.sha256 = $archiveHash
            $manifest.download.sizeBytes = $archiveSize
        }

        Write-JsonFile $manifestPath $manifest
    }

    Write-Host "Rebuilt $gameSlug archive"
}

if (Test-Path -LiteralPath $catalogPath -PathType Leaf) {
    $catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
    $catalog.timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Write-JsonFile $catalogPath $catalog
}
