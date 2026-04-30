function Save-Progress {
    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
    }
    if ($script:level -gt $script:bestLevel) {
        $script:bestLevel = $script:level
    }

    $bestLabel.Text = "Best: $($script:bestScore) score / level $($script:bestLevel)"
    $payload = @{
        bestScore = $script:bestScore
        bestLevel = $script:bestLevel
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}

function Update-Hud {
    $hud.Text = "Targets: $($targets.Count + $breakerTargets.Count)    Moves: $($script:moves)    Shield: $($script:shieldCharges)/$($script:maxShields)    Level: $($script:level)    Score: $($script:score)"
    $hud.ForeColor = if ($script:moves -le 2) { [System.Drawing.Color]::FromArgb(255, 140, 60) } else { [System.Drawing.Color]::White }
}

function Update-RiskDisplay {
    $unsafeThreatened = 0
    foreach ($tile in $dangerTiles) {
        if (-not $sanctuaries.Contains($tile)) {
            $unsafeThreatened += 1
        }
    }
    $total = $size * $size
    $riskPct = [Math]::Round(($unsafeThreatened / $total) * 100)
    $rookKey = "$($rook.Row),$($rook.Col)"
    $isImmediateRisk = $dangerTiles.Contains($rookKey) -and -not $sanctuaries.Contains($rookKey)

    if ($isImmediateRisk) {
        $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 128, 128)
        $riskLabel.Text = "Risk: CRITICAL ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    if ($riskPct -ge 45) {
        $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 186, 128)
        $riskLabel.Text = "Risk: HIGH ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    if ($riskPct -ge 25) {
        $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 128)
        $riskLabel.Text = "Risk: MEDIUM ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(156, 255, 184)
    $riskLabel.Text = "Risk: LOW ($unsafeThreatened/$total unsafe, $riskPct%)."
}

function Rebuild-DangerTiles {
    $dangerTiles.Clear()
    foreach ($sentinel in $sentinels) {
        for ($index = 0; $index -lt $size; $index++) {
            if ($index -ne $sentinel.Col) {
                [void]$dangerTiles.Add("$($sentinel.Row),$index")
            }
            if ($index -ne $sentinel.Row) {
                [void]$dangerTiles.Add("$index,$($sentinel.Col)")
            }
        }
    }
}
