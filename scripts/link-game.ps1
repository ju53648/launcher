param(
    [Parameter(Mandatory = $true)]
    [string]$GameFolder,

    [string]$Executable,
    [string]$Id,
    [string]$Name,
    [string]$ManifestFolder,
    [string]$Developer = "Local",
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"

function Get-Slug([string]$Value) {
    $lower = $Value.ToLowerInvariant()
    $slug = [regex]::Replace($lower, "[^a-z0-9]+", "-")
    return $slug.Trim('-')
}

$resolvedGameFolder = (Resolve-Path -LiteralPath $GameFolder).Path
if (-not (Test-Path -LiteralPath $resolvedGameFolder -PathType Container)) {
    throw "GameFolder not found: $GameFolder"
}

if ([string]::IsNullOrWhiteSpace($Name)) {
    $Name = Split-Path -Leaf $resolvedGameFolder
}

if ([string]::IsNullOrWhiteSpace($Id)) {
    $slug = Get-Slug $Name
    if ([string]::IsNullOrWhiteSpace($slug)) {
        $slug = "local-game"
    }
    $Id = "local.$slug"
}

if ([string]::IsNullOrWhiteSpace($Executable)) {
    $exeCandidate = Get-ChildItem -LiteralPath $resolvedGameFolder -File -Filter *.exe | Select-Object -First 1
    if ($null -eq $exeCandidate) {
        throw "No executable provided and no .exe found in game root: $resolvedGameFolder"
    }
    $Executable = $exeCandidate.Name
}

$resolvedExecutablePath = Join-Path $resolvedGameFolder $Executable
if (-not (Test-Path -LiteralPath $resolvedExecutablePath -PathType Leaf)) {
    throw "Executable not found: $resolvedExecutablePath"
}

if ([string]::IsNullOrWhiteSpace($ManifestFolder)) {
    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    $ManifestFolder = Join-Path $localAppData "Lumorix Launcher\Manifests"
}

if (-not (Test-Path -LiteralPath $ManifestFolder)) {
    New-Item -ItemType Directory -Path $ManifestFolder | Out-Null
}

$manifest = [ordered]@{
    id = $Id
    itemType = "game"
    name = $Name
    version = $Version
    description = "Local linked game from folder '$resolvedGameFolder'."
    developer = $Developer
    releaseDate = (Get-Date).ToString("yyyy-MM-dd")
    categories = @("Local")
    tags = @(
        @{ id = "offline"; weight = 3 },
        @{ id = "local"; weight = 3 }
    )
    coverImage = "/assets/games/echo-protocol-cover.svg"
    bannerImage = "/assets/games/echo-protocol-banner.svg"
    iconImage = "/assets/games/echo-protocol-icon.svg"
    executable = $Executable
    installSizeBytes = 0
    defaultInstallFolder = $Name
    supportedActions = @("install", "launch", "repair", "uninstall", "openFolder")
    installStrategy = @{
        kind = "directFolder"
        sourcePath = $resolvedGameFolder
    }
    download = @{
        kind = "localSynthetic"
        integrity = "local-link-$Id"
    }
    changelog = @(
        @{
            version = $Version
            date = (Get-Date).ToString("yyyy-MM-dd")
            items = @("Local folder link created via scripts/link-game.ps1")
        }
    )
}

$manifestName = (Get-Slug $Id)
if ([string]::IsNullOrWhiteSpace($manifestName)) {
    $manifestName = "local-game"
}
$manifestPath = Join-Path $ManifestFolder ("$manifestName.json")

$json = $manifest | ConvertTo-Json -Depth 8
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, $json, $utf8NoBom)

Write-Host "Linked game created"
Write-Host "  Id: $Id"
Write-Host "  Name: $Name"
Write-Host "  Source folder: $resolvedGameFolder"
Write-Host "  Executable: $Executable"
Write-Host "  Manifest: $manifestPath"
