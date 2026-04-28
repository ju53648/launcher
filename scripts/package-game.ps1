# Packaging Helper für lokale Game-Entwicklung
# Nutze dieses Skript um dein Spiel zu packen, ohne npm package auszuführen

param(
    [Parameter(Mandatory = $true)]
    [string]$GameDir,
    
    [string]$OutputDir = (Get-Location)
)

# Sicherstellen dass das Verzeichnis existiert
if (-not (Test-Path $GameDir)) {
    Write-Host "❌ Verzeichnis nicht gefunden: $GameDir" -ForegroundColor Red
    exit 1
}

# Zur Basis navigieren
Push-Location $GameDir

try {
    # 1. Clean old artifacts
    Write-Host "🧹 Räume auf..." -ForegroundColor Cyan
    if (Test-Path "game.zip") { Remove-Item "game.zip" -Force }
    if (Test-Path "game.zip.sha256") { Remove-Item "game.zip.sha256" -Force }

    # 2. Check if dist exists
    if (-not (Test-Path "dist")) {
        Write-Host "📦 Baue Spiel mit npm run build..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build fehlgeschlagen" -ForegroundColor Red
            exit 1
        }
    }

    # 3. Create ZIP
    Write-Host "📦 Erstelle game.zip..." -ForegroundColor Cyan
    Compress-Archive -Path dist\* -DestinationPath game.zip -Force

    # 4. Calculate SHA256
    Write-Host "🔐 Berechne SHA256..." -ForegroundColor Cyan
    $sha = (Get-FileHash game.zip -Algorithm SHA256).Hash.ToLower()
    $sha | Out-File game.zip.sha256 -Encoding UTF8

    # 5. Get file info
    $size = (Get-Item game.zip).Length
    $sizeMB = [math]::Round($size / 1MB, 2)

    # 6. Display results
    Write-Host "`n✅ Erfolgreich gepackt!" -ForegroundColor Green
    Write-Host "📦 Datei: game.zip" -ForegroundColor White
    Write-Host "📊 Größe: $sizeMB MB" -ForegroundColor White
    Write-Host "🔐 SHA256: $sha" -ForegroundColor White
    Write-Host "`n📋 Manifest-Vorlage (in manifest.json einfügen):" -ForegroundColor Cyan
    Write-Host @"
{
  "download": {
    "kind": "httpArchive",
    "url": "...",
    "sha256": "$sha",
    "sizeBytes": $size
  }
}
"@ -ForegroundColor Gray

    # 7. Copy to output dir if specified
    if ($OutputDir -and $OutputDir -ne (Get-Location)) {
        Write-Host "`n📁 Kopiere zu $OutputDir..." -ForegroundColor Cyan
        Copy-Item game.zip -Destination $OutputDir -Force
        Copy-Item game.zip.sha256 -Destination $OutputDir -Force
    }

    Write-Host "`n✨ Fertig! Spiel bereit zum Hochladen." -ForegroundColor Green

} finally {
    Pop-Location
}
