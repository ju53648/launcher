function Get-ReactorTitle([int]$score, [int]$round) {
    if ($round -ge 5 -and $score -ge 950) { return 'containment director' }
    if ($round -ge 4 -or $score -ge 650) { return 'core handler' }
    if ($round -ge 3 -or $score -ge 360) { return 'heat wrangler' }
    return 'queue intern'
}

function Load-BestScore {
    if (-not (Test-Path $script:highScorePath)) {
        return
    }

    try {
        $saveData = Get-Content $script:highScorePath -Raw | ConvertFrom-Json
        if ($null -ne $saveData.bestScore) {
            $script:bestScore = [int]$saveData.bestScore
            $bestLabel.Text = "Best containment: $($script:bestScore)"
        }
        if ($null -ne $saveData.bestTitle) {
            $script:bestTitle = [string]$saveData.bestTitle
            $titleLabel.Text = "Containment title: $($script:bestTitle)"
        }
    }
    catch {
    }
}

function Save-BestScore {
    if ($script:score -lt $script:bestScore) {
        return
    }

    $script:bestTitle = Get-ReactorTitle $script:score $script:round
    $titleLabel.Text = "Containment title: $($script:bestTitle)"
    $payload = @{ bestScore = $script:score; bestTitle = $script:bestTitle } | ConvertTo-Json
    Set-Content -Path $script:highScorePath -Value $payload -Encoding UTF8
    $script:bestScore = $script:score
    $bestLabel.Text = "Best containment: $($script:bestScore)"
}
