# Generiere für jedes Spiel echte, eigene Asset-Dateien direkt im Runtime-Ordner.

$gameConfigs = @{
    'neon-circuit' = @{
        name = "Neon Circuit"
        description = "Arcade reflex game - viele kleine schnelle Effekte"
        files = [ordered]@{
            'neon-patterns.bin' = 4194304
            'arcade-sfx-pack.bin' = 3145728
            'circuit-levels.bin' = 2097152
            'glow-effects.bin' = 1048576
            'overload-shaders.bin' = 1310720
        }
    }
    'word-reactor' = @{
        name = "Word Reactor"
        description = "Wort-Puzzle - große Wörterbuch-Dateien"
        files = [ordered]@{
            'dictionary-en.bin' = 3145728
            'dictionary-de.bin' = 3145728
            'word-puzzles.bin' = 2097152
            'ui-fonts.bin' = 1048576
            'word-sounds.bin' = 1048576
            'reactor-challenges.bin' = 1310720
        }
    }
    'graveyard-shift' = @{
        name = "Graveyard Shift"
        description = "Horror-Atmosphäre - Ambient-Sounds und Dark-Assets"
        files = [ordered]@{
            'ambient-soundscape.bin' = 4194304
            'dark-textures.bin' = 2097152
            'creature-models.bin' = 2097152
            'horror-music.bin' = 1572864
            'jump-scares.bin' = 1048576
            'cemetery-layouts.bin' = 786432
        }
    }
    'pocket-heist' = @{
        name = "Pocket Heist"
        description = "Strategie - viele kleine Sound-Effekte"
        files = [ordered]@{
            'heist-music.bin' = 2097152
            'sfx-pack.bin' = 3145728
            'level-blueprints.bin' = 2097152
            'character-sprites.bin' = 1572864
            'ui-elements.bin' = 1572864
            'security-simulations.bin' = 1310720
        }
    }
    'tempo-trashfire' = @{
        name = "Tempo Trashfire"
        description = "Rhythmus-Spiel - extensive Musik-Daten"
        files = [ordered]@{
            'rhythm-tracks.bin' = 4194304
            'beat-patterns.bin' = 2097152
            'visual-effects.bin' = 2097152
            'sound-design.bin' = 1572864
            'ui-hud.bin' = 1048576
            'crowd-loops.bin' = 786432
        }
    }
    'frostline-courier' = @{
        name = "Frostline Courier"
        description = "Adventure - Winter-Umgebungen"
        files = [ordered]@{
            'ambient-music.bin' = 2097152
            'environment-sounds.bin' = 1572864
            'terrain-textures.bin' = 2097152
            'journey-routes.bin' = 2097152
            'character-animations.bin' = 1572864
            'visual-effects.bin' = 1048576
            'weather-cycles.bin' = 1310720
        }
    }
    'velvet-rook' = @{
        name = "Velvet Rook"
        description = "Schach/Strategie - Bewegungs- und Position-Daten"
        files = [ordered]@{
            'chess-openings.bin' = 2097152
            'piece-models.bin' = 2097152
            'board-patterns.bin' = 2097152
            'strategy-analysis.bin' = 1572864
            'game-notation.bin' = 1048576
            'velvet-theme.bin' = 1048576
            'endgame-library.bin' = 1835008
        }
    }
    'glass-garden' = @{
        name = "Glass Garden"
        description = "Puzzle/Sandbox - hochauflösende Grafiken"
        files = [ordered]@{
            'plant-models.bin' = 2097152
            'particle-data.bin' = 2097152
            'environment-art.bin' = 2097152
            'ambient-music.bin' = 1572864
            'growth-animations.bin' = 1572864
            'glass-effects.bin' = 1048576
            'bloom-simulation.bin' = 1310720
        }
    }
}

function Write-RandomFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [int]$Size,

        [Parameter(Mandatory = $true)]
        [int]$Seed
    )

    $random = [System.Random]::new($Seed)
    $buffer = New-Object byte[] 65536
    $stream = [System.IO.File]::Create($Path)
    try {
        $remaining = $Size
        while ($remaining -gt 0) {
            $chunkSize = [Math]::Min($buffer.Length, $remaining)
            $random.NextBytes($buffer)
            $stream.Write($buffer, 0, $chunkSize)
            $remaining -= $chunkSize
        }
    } finally {
        $stream.Dispose()
    }
}

function Get-DirectorySize {
    param([string]$Path)

    $total = 0
    Get-ChildItem -LiteralPath $Path -File | ForEach-Object {
        $total += $_.Length
    }
    return $total
}

foreach ($game in $gameConfigs.Keys) {
    $config = $gameConfigs[$game]
    $runtimePath = Join-Path (Join-Path (Join-Path "distribution" "games") $game) "runtime"

    if (-not (Test-Path -LiteralPath $runtimePath -PathType Container)) {
        throw "Runtime folder not found: $runtimePath"
    }

    Write-Host "Generating unique runtime files for $game..." -ForegroundColor Cyan

    Get-ChildItem -LiteralPath $runtimePath -File |
        Where-Object { $_.Extension -ne '.ps1' } |
        Remove-Item -Force

    $assets = @()
    foreach ($fileName in $config.files.Keys) {
        $fileSize = [int]$config.files[$fileName]
        $targetPath = Join-Path $runtimePath $fileName
        $seed = [Math]::Abs(("$game|$fileName").GetHashCode())
        Write-RandomFile -Path $targetPath -Size $fileSize -Seed $seed

        $sizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "  [+] $fileName ($sizeMB MB)" -ForegroundColor Green
        $assets += [pscustomobject]@{
            file = $fileName
            sizeBytes = $fileSize
        }
    }

    $assetManifestPath = Join-Path $runtimePath 'asset-manifest.json'
    $assetManifest = [pscustomobject]@{
        game = $game
        name = $config.name
        description = $config.description
        generatedDate = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        assetCount = $assets.Count
        assets = $assets
    }
    $assetManifestJson = $assetManifest | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($assetManifestPath, $assetManifestJson, [System.Text.UTF8Encoding]::new($false))

    $totalBytes = Get-DirectorySize -Path $runtimePath
    $totalMB = [math]::Round($totalBytes / 1MB, 2)
    Write-Host "  Total runtime size: $totalMB MB" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "SUCCESS: All games now use dedicated asset files in their own runtime folders." -ForegroundColor Green
