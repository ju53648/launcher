function Initialize-SaveState {
    if (Test-Path $script:savePath) {
        try {
            $saveData = Get-Content $script:savePath -Raw | ConvertFrom-Json
            $script:bestScore = [int]$saveData.bestScore
            $script:bestSeason = [int]$saveData.bestSeason
            $bestLabel.Text = "Best house: $($script:bestScore) score / season $($script:bestSeason)"
        }
        catch {
            $bestLabel.Text = 'Best house: save unreadable'
        }
    }
}

function Save-Progress {
    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
    }
    if ($script:season -gt $script:bestSeason) {
        $script:bestSeason = $script:season
    }

    $bestLabel.Text = "Best house: $($script:bestScore) score / season $($script:bestSeason)"
    $payload = @{
        bestScore = $script:bestScore
        bestSeason = $script:bestSeason
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}
