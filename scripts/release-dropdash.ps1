param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$ReleaseDate,
    [string]$Description,
    [string]$CommitMessage,
    [switch]$NoPush
)

$script = Join-Path $PSScriptRoot "release-game.ps1"

$params = @{
    ConfigPath = "distribution/release-config/games/lumorix-dropdash.json"
    Version = $Version
    ReleaseDate = $ReleaseDate
    Description = $Description
    CommitMessage = $CommitMessage
    NoPush = $NoPush
}

& $script @params
