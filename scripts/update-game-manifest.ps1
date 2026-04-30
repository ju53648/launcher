param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
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

if ([string]::IsNullOrWhiteSpace($config.version)) {
    throw "Config must contain a non-empty version"
}

if ([string]::IsNullOrWhiteSpace($config.manifestPath)) {
    throw "Config must contain manifestPath"
}

if ([string]::IsNullOrWhiteSpace($config.archivePath)) {
    throw "Config must contain archivePath"
}

if ([string]::IsNullOrWhiteSpace($config.archiveUrl)) {
    throw "Config must contain archiveUrl"
}

$manifestPath = Join-Path $repoRoot $config.manifestPath
$archivePath = Join-Path $repoRoot $config.archivePath
$shaPath = "$archivePath.sha256"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Manifest file not found: $manifestPath"
}

if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
    throw "Archive file not found: $archivePath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$archiveSize = (Get-Item -LiteralPath $archivePath).Length

$archiveHash = if (Test-Path -LiteralPath $shaPath -PathType Leaf) {
    (Get-Content -LiteralPath $shaPath -Raw).Trim().ToLowerInvariant()
} else {
    (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
}

$manifest.version = [string]$config.version

if (-not [string]::IsNullOrWhiteSpace($config.description)) {
    $manifest.description = [string]$config.description
}

if (-not [string]::IsNullOrWhiteSpace($config.releaseDate)) {
    $manifest.releaseDate = [string]$config.releaseDate
}

if ($config.installSizePath) {
    $installSizePath = Join-Path $repoRoot $config.installSizePath
    if (Test-Path -LiteralPath $installSizePath -PathType Leaf) {
        $manifest.installSizeBytes = (Get-Item -LiteralPath $installSizePath).Length
    } elseif (Test-Path -LiteralPath $installSizePath -PathType Container) {
        $manifest.installSizeBytes = (
            Get-ChildItem -LiteralPath $installSizePath -File -Recurse |
            Measure-Object -Property Length -Sum
        ).Sum
    }
}

$manifest.download = [pscustomobject]@{
    kind = "httpArchive"
    url = [string]$config.archiveUrl
    sha256 = $archiveHash
    sizeBytes = $archiveSize
}

if ($config.changelogItems -and $config.changelogItems.Count -gt 0) {
    $changelogEntry = [pscustomobject]@{
        version = [string]$config.version
        date = if (-not [string]::IsNullOrWhiteSpace($config.releaseDate)) { [string]$config.releaseDate } else { (Get-Date -Format "yyyy-MM-dd") }
        items = @($config.changelogItems)
    }

    $existing = @()
    if ($manifest.changelog) {
        $existing = @($manifest.changelog | Where-Object { $_.version -ne $config.version })
    }
    $manifest.changelog = @($changelogEntry) + $existing
}

if ($config.setZipInstallStrategy -eq $true) {
    $rootFolder = "."
    if (-not [string]::IsNullOrWhiteSpace($config.zipRootFolder)) {
        $rootFolder = [string]$config.zipRootFolder
    }

    $manifest.installStrategy = [pscustomobject]@{
        kind = "zipArchive"
        rootFolder = $rootFolder
    }
}

if ($config.ensureUpdateAction -eq $true) {
    $actions = @()
    if ($manifest.supportedActions) {
        $actions = @($manifest.supportedActions)
    }
    if (-not ($actions -contains "update")) {
        $actions += "update"
    }
    $manifest.supportedActions = $actions
}

$manifestJson = $manifest | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

$assetValidatorScript = Join-Path $repoRoot "scripts/validate-game-assets.mjs"
if (Test-Path -LiteralPath $assetValidatorScript -PathType Leaf) {
    $manifestPathRelative = [string]$config.manifestPath
    node $assetValidatorScript --manifest $manifestPathRelative
    if ($LASTEXITCODE -ne 0) {
        throw "Game image validation failed for manifest: $manifestPathRelative"
    }
}

$catalogRelativePath = "distribution/manifests/catalog.json"
if (-not [string]::IsNullOrWhiteSpace($config.catalogPath)) {
    $catalogRelativePath = [string]$config.catalogPath
}

$catalogPath = Join-Path $repoRoot $catalogRelativePath
if ((Test-Path -LiteralPath $catalogPath -PathType Leaf) -and -not [string]::IsNullOrWhiteSpace($config.catalogManifestUrl)) {
    $catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
    $targetBaseUrl = [string]$config.catalogManifestUrl
    $manifestFileName = [System.IO.Path]::GetFileName([string]$config.manifestPath)
    $versionedUrl = "${targetBaseUrl}?v=$($config.version)"
    $catalogChanged = $false
    $matchedEntry = $false

    if ($catalog.manifests) {
        foreach ($entry in $catalog.manifests) {
            if (-not $entry.url) {
                continue
            }

            $entryUrl = [string]$entry.url
            $entryBaseUrl = $entryUrl.Split("?")[0]
            if ($entryBaseUrl -eq $targetBaseUrl -or ($entryBaseUrl.EndsWith("/$manifestFileName"))) {
                $matchedEntry = $true
                if ($entryUrl -ne $versionedUrl) {
                    $entry.url = $versionedUrl
                    $catalogChanged = $true
                }
            }
        }
    }

    if (-not $matchedEntry) {
        throw "Catalog entry for '$targetBaseUrl' was not found in $catalogPath"
    }

    $nextTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    if ([string]$catalog.timestamp -ne $nextTimestamp) {
        $catalog.timestamp = $nextTimestamp
        $catalogChanged = $true
    }

    if ($catalogChanged) {
        $catalogJson = $catalog | ConvertTo-Json -Depth 30
        [System.IO.File]::WriteAllText($catalogPath, $catalogJson, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Updated catalog: $catalogPath"
        Write-Host "Catalog manifest URL: $versionedUrl"
    }
}

Write-Host "Updated manifest: $manifestPath"
Write-Host "Version: $($manifest.version)"
Write-Host "Archive bytes: $archiveSize"
Write-Host "Archive sha256: $archiveHash"
