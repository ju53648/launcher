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

$manifest | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Host "Updated manifest: $manifestPath"
Write-Host "Version: $($manifest.version)"
Write-Host "Archive bytes: $archiveSize"
Write-Host "Archive sha256: $archiveHash"
