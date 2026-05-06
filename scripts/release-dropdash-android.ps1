param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$ReleaseDate,
    [string]$Description,
    [string]$CommitMessage,
    [switch]$NoPush,
    [switch]$BuildFirst
)

$ErrorActionPreference = "Stop"

if ($BuildFirst) {
    & (Join-Path $PSScriptRoot "..\distribution\games\lumorix-dropdash\build-android.ps1")
}

$script = Join-Path $PSScriptRoot "release-game.ps1"

$params = @{
    ConfigPath = "distribution/release-config/games/lumorix-dropdash-android.json"
    Version = $Version
    ReleaseDate = $ReleaseDate
    Description = $Description
    CommitMessage = $CommitMessage
    NoPush = $NoPush
}

& $script @params