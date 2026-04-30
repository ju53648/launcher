function Save-Progress {
    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
    }
    if ($script:level -gt $script:bestLevel) {
        $script:bestLevel = $script:level
    }

    $bestLabel.Text = "Best chamber: $($script:bestScore) score / level $($script:bestLevel)"
    $payload = @{
        bestScore = $script:bestScore
        bestLevel = $script:bestLevel
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}

function Update-UndoButton {
    $undoButton.Enabled = $null -ne $script:lastTurnSnapshot
}

function Clear-UndoSnapshot {
    $script:lastTurnSnapshot = $null
    Update-UndoButton
}

function Save-UndoSnapshot {
    $script:lastTurnSnapshot = [pscustomobject]@{
        RookRow = [int]$rook.Row
        RookCol = [int]$rook.Col
        Moves = [int]$script:moves
        Level = [int]$script:level
        Score = [int]$script:score
        ShieldCharges = [int]$script:shieldCharges
        MaxShields = [int]$script:maxShields
        Targets = [string[]]$targets
        BreakerTargets = [string[]]$breakerTargets
        Sanctuaries = [string[]]$sanctuaries
        BonusSanctuaries = [string[]]$bonusSanctuaries
        Sentinels = @(
            foreach ($sentinel in $sentinels) {
                [pscustomobject]@{
                    Row = [int]$sentinel.Row
                    Col = [int]$sentinel.Col
                    Type = [string]$sentinel.Type
                    Direction = [string]$sentinel.Direction
                }
            }
        )
    }
    Update-UndoButton
}

function Restore-UndoSnapshot {
    if ($null -eq $script:lastTurnSnapshot) {
        return $false
    }

    $snapshot = $script:lastTurnSnapshot
    $rook.Row = $snapshot.RookRow
    $rook.Col = $snapshot.RookCol
    $script:moves = $snapshot.Moves
    $script:level = $snapshot.Level
    $script:score = $snapshot.Score
    $script:shieldCharges = $snapshot.ShieldCharges
    $script:maxShields = $snapshot.MaxShields

    $targets.Clear()
    foreach ($target in $snapshot.Targets) {
        [void]$targets.Add($target)
    }

    $breakerTargets.Clear()
    foreach ($breaker in $snapshot.BreakerTargets) {
        [void]$breakerTargets.Add($breaker)
    }

    $sanctuaries.Clear()
    foreach ($sanctuary in $snapshot.Sanctuaries) {
        [void]$sanctuaries.Add($sanctuary)
    }

    $bonusSanctuaries.Clear()
    foreach ($bonus in $snapshot.BonusSanctuaries) {
        [void]$bonusSanctuaries.Add($bonus)
    }

    $sentinels.Clear()
    foreach ($sentinel in $snapshot.Sentinels) {
        $sentinels.Add([pscustomobject]@{
                Row = [int]$sentinel.Row
                Col = [int]$sentinel.Col
                Type = [string]$sentinel.Type
                Direction = [string]$sentinel.Direction
            })
    }

    Rebuild-DangerTiles
    Clear-UndoSnapshot
    return $true
}

function Update-Hud {
    $hud.Text = "Targets: $($targets.Count + $breakerTargets.Count)    Moves: $($script:moves)    Shield: $($script:shieldCharges)/$($script:maxShields)    Level: $($script:level)    Score: $($script:score)"
    $hud.ForeColor = if ($script:moves -le 2) { [System.Drawing.Color]::FromArgb(255, 140, 60) } else { [System.Drawing.Color]::White }
    Update-UndoButton
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
        $riskLabel.Text = "Threat map: CRITICAL ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    if ($riskPct -ge 45) {
        $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 186, 128)
        $riskLabel.Text = "Threat map: HIGH ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    if ($riskPct -ge 25) {
        $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 128)
        $riskLabel.Text = "Threat map: MEDIUM ($unsafeThreatened/$total unsafe, $riskPct%)."
        return
    }

    $riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(156, 255, 184)
    $riskLabel.Text = "Threat map: LOW ($unsafeThreatened/$total unsafe, $riskPct%)."
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
