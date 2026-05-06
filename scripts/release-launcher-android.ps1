param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$Title,
    [string[]]$NotesList,
    [string]$ReleaseUrl,
    [string]$Signature,
    [string]$CommitMessage,
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $repoRoot "distribution/latest-android.json"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Android update manifest not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$manifest.version = $Version

if (-not [string]::IsNullOrWhiteSpace($Title)) {
    $manifest.title = $Title
}

if ($NotesList -and $NotesList.Count -gt 0) {
    $manifest.notesList = @($NotesList)
    $manifest.notes = ($NotesList -join " ")
}

$manifest.pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if (-not $manifest.platforms) {
    $manifest | Add-Member -NotePropertyName platforms -NotePropertyValue @{} -Force
}

if (-not $manifest.platforms."android-aarch64") {
    $manifest.platforms."android-aarch64" = @{
        url = "__GENERATED_IN_CI__"
        signature = "__GENERATED_IN_CI__"
    }
}

if (-not [string]::IsNullOrWhiteSpace($ReleaseUrl)) {
    $manifest.platforms."android-aarch64".url = $ReleaseUrl
}

if (-not [string]::IsNullOrWhiteSpace($Signature)) {
    $manifest.platforms."android-aarch64".signature = $Signature
}

$manifestJson = $manifest | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

Push-Location $repoRoot
try {
    git add -- "distribution/latest-android.json"

    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "No staged changes detected; nothing to commit."
        return
    }

    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = "launcher(android): update latest-android.json to $Version"
    }

    git commit -m $CommitMessage

    if (-not $NoPush) {
        git push
    }

    Write-Host "Android launcher release metadata updated to version $Version"
} finally {
    Pop-Location
}