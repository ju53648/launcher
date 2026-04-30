function Get-CircuitTitle([int]$score, [int]$wave) {
    if ($wave -ge 4 -and $score -ge 700) { return 'signal monarch' }
    if ($wave -ge 4 -or $score -ge 520) { return 'pulse runner' }
    if ($wave -ge 3 -or $score -ge 300) { return 'grid surfer' }
    return 'back-alley spark'
}

function Save-BestScore {
    if ($script:score -lt $script:bestScore) {
        return
    }

    $bestTitle = Get-CircuitTitle $script:score $script:wave
    $titleLabel.Text = "Circuit title: $bestTitle"
    $scriptJson = @{ bestScore = $script:score; bestTitle = $bestTitle } | ConvertTo-Json
    Set-Content -Path $script:highScorePath -Value $scriptJson -Encoding UTF8
    $script:bestScore = $script:score
    $bestLabel.Text = "Best: $($script:score)"
}
