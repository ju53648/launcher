function Update-Board {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $button = $buttons[$row][$col]
            $key = "$row,$col"
            $button.Text = ''
            $button.BackColor = if (($row + $col) % 2 -eq 0) {
                [System.Drawing.Color]::FromArgb(58, 32, 64)
            }
            else {
                [System.Drawing.Color]::FromArgb(82, 44, 92)
            }

            if ($dangerTiles.Contains($key)) {
                $distToRook = [Math]::Abs($row - $rook.Row) + [Math]::Abs($col - $rook.Col)
                if ($distToRook -le 1) {
                    $button.BackColor = [System.Drawing.Color]::FromArgb(192, 32, 64)
                } elseif ($distToRook -le 2) {
                    $button.BackColor = [System.Drawing.Color]::FromArgb(160, 44, 70)
                } else {
                    $button.BackColor = [System.Drawing.Color]::FromArgb(132, 54, 78)
                }
            }
            if ($sanctuaries.Contains($key)) {
                $button.BackColor = [System.Drawing.Color]::FromArgb(101, 132, 108)
                if ($button.Text -eq '') {
                    $button.Text = 'H'
                }
            }
            if ($bonusSanctuaries.Contains($key)) {
                $button.BackColor = [System.Drawing.Color]::FromArgb(128, 160, 135)
                $button.Text = 'H+'
            }
            if ($targets.Contains($key)) {
                $button.Text = 'T'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 224, 128)
            }
            if ($breakerTargets.Contains($key)) {
                $button.Text = 'B'
                $button.BackColor = [System.Drawing.Color]::FromArgb(135, 220, 255)
            }
            foreach ($sentinel in $sentinels) {
                if ($sentinel.Row -eq $row -and $sentinel.Col -eq $col) {
                    $button.Text = 'S'
                    $button.BackColor = [System.Drawing.Color]::FromArgb(176, 120, 255)
                }
            }
            if ($rook.Row -eq $row -and $rook.Col -eq $col) {
                $button.Text = 'R'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 189, 226)
            }
        }
    }
    Update-Hud
    Update-RiskDisplay
}

function Move-Sentinels {
    foreach ($sentinel in $sentinels) {
        # Sentinel-Typ Verhalten: E (Einhorn/diagonal) oder O (Orthogonal/Standard)
        $sentinelType = if ($null -eq $sentinel.Type) { 'O' } else { $sentinel.Type }

        # Stochastische Richtungswechsel (level-abhängig: 2.2% base + 0.55% pro Level)
        $directionChangeChance = 0.022 + ($script:level * 0.0055)
        if ($rng.NextDouble() -lt $directionChangeChance) {
            $sentinel.Direction = if ($sentinel.Direction -eq 'H') { 'V' } else { 'H' }
        }
        if ($null -eq $sentinel.Direction) { $sentinel.Direction = if ($rng.NextDouble() -lt 0.5) { 'H' } else { 'V' } }

        # Diagonal-Sentinels (Typ E) bewegen sich auf beiden Achsen
        if ($sentinelType -eq 'E') {
            $sentinel.Row = ($sentinel.Row + 1 + $size) % $size
            $sentinel.Col = ($sentinel.Col + 1 + $size) % $size
        }
        # Standard-Sentinels (Typ O) bewegen sich auf einer Achse + Acceleration
        else {
            if ($sentinel.Direction -eq 'H') {
                $sentinel.Col = ($sentinel.Col + 1 + $size) % $size
            } else {
                $sentinel.Row = ($sentinel.Row + 1 + $size) % $size
            }
        }

        if ($sentinel.Row -eq $rook.Row -and $sentinel.Col -eq $rook.Col) {
            $sentinel.Col = ($sentinel.Col + 1) % $size
        }
    }
    Rebuild-DangerTiles
}

function Build-Level {
    $targets.Clear()
    $breakerTargets.Clear()
    $sentinels.Clear()
    $dangerTiles.Clear()
    $sanctuaries.Clear()
    $bonusSanctuaries.Clear()
    $rook.Row = 0
    $rook.Col = 0
    $script:moves = 7 + [Math]::Min(5, [Math]::Floor(($script:level - 1) * 0.8))
    $script:maxShields = [Math]::Min(2, [Math]::Max(1, [Math]::Floor($script:level / 3)))
    $script:shieldCharges = 0

    while ($targets.Count -lt 4) {
        $cell = "$($rng.Next(0,6)),$($rng.Next(0,6))"
        if ($cell -ne '0,0') {
            [void]$targets.Add($cell)
        }
    }

    if ($script:level -ge 2) {
        while ($breakerTargets.Count -lt 1) {
            $cell = "$($rng.Next(0,6)),$($rng.Next(0,6))"
            if ($cell -ne '0,0' -and -not $targets.Contains($cell)) {
                [void]$breakerTargets.Add($cell)
            }
        }
    }

    $sanctuaryCount = if ($script:level -ge 4) { 2 } else { 1 }
    while ($sanctuaries.Count -lt $sanctuaryCount) {
        $cell = "$($rng.Next(0,6)),$($rng.Next(0,6))"
        if ($cell -ne '0,0' -and -not $targets.Contains($cell) -and -not $breakerTargets.Contains($cell)) {
            [void]$sanctuaries.Add($cell)
            if ($rng.NextDouble() -lt 0.18) {
                [void]$bonusSanctuaries.Add($cell)
            }
        }
    }

    $sentinelCount = [Math]::Min(3, 1 + [Math]::Floor(($script:level - 1) / 2))

    while ($sentinels.Count -lt $sentinelCount) {
        $row = $rng.Next(0, 6)
        $col = $rng.Next(0, 6)
        $key = "$row,$col"
        $alreadySentinel = $false
        foreach ($sentinel in $sentinels) {
            if ($sentinel.Row -eq $row -and $sentinel.Col -eq $col) {
                $alreadySentinel = $true
                break
            }
        }

        if (
            $key -ne '0,0' -and
            -not $targets.Contains($key) -and
            -not $breakerTargets.Contains($key) -and
            -not $sanctuaries.Contains($key) -and
            -not $alreadySentinel
        ) {
            # Neue Sentinels: Typ-Variante (E ab Level 5, Chance steigt leicht mit Level fuer mehr Tiefe)
            $eChance = [Math]::Min(0.55, 0.25 + (($script:level - 5) * 0.05))
            $newType = if ($script:level -ge 5 -and $rng.NextDouble() -lt $eChance) { 'E' } else { 'O' }
            $sentinels.Add([pscustomobject]@{ Row = $row; Col = $col; Type = $newType; Direction = 'H' })
        }
    }

    Rebuild-DangerTiles
    Update-Board
}

function Lose-Board([string]$message) {
    $recapLabel.Text = "Last board: level $($script:level), score $($script:score), result: $message"
    Save-Progress
    [System.Windows.Forms.MessageBox]::Show($message, 'Velvet Rook') | Out-Null
    Build-Level
}

function Move-Rook([string]$key) {
    $parts = $key.Split(',')
    $row = [int]$parts[0]
    $col = [int]$parts[1]
    if ($row -ne $rook.Row -and $col -ne $rook.Col) {
        $status.Text = 'A rook only moves in straight lines.'
        return
    }
    if ($row -eq $rook.Row -and $col -eq $rook.Col) {
        return
    }

    $distance = [Math]::Abs($row - $rook.Row) + [Math]::Abs($col - $rook.Col)
    $moveCost = [Math]::Ceiling([double]$distance / 2)
    if ($script:moves -lt $moveCost) {
        $status.Text = "Not enough moves for that distance. Need $moveCost, have $($script:moves)."
        return
    }

    # Validate path: rook cannot jump over sentinels
    $rowStep = 0
    $colStep = 0
    if ($row -eq $rook.Row) {
        $colStep = if ($col -gt $rook.Col) { 1 } else { -1 }
    }
    else {
        $rowStep = if ($row -gt $rook.Row) { 1 } else { -1 }
    }
    $checkRow = $rook.Row + $rowStep
    $checkCol = $rook.Col + $colStep
    $pathBlocked = $false
    while ($checkRow -ne $row -or $checkCol -ne $col) {
        foreach ($sentinel in $sentinels) {
            if ($sentinel.Row -eq $checkRow -and $sentinel.Col -eq $checkCol) {
                $pathBlocked = $true
                break
            }
        }
        if ($pathBlocked) { break }
        $checkRow += $rowStep
        $checkCol += $colStep
    }
    if ($pathBlocked) {
        $status.Text = 'A sentinel blocks that lane. Find an open route.'
        return
    }

    foreach ($sentinel in $sentinels) {
        if ($sentinel.Row -eq $row -and $sentinel.Col -eq $col) {
            $status.Text = 'A sentinel occupies that tile. Pick another destination.'
            return
        }
    }

    $rook.Row = $row
    $rook.Col = $col
    $script:moves -= $moveCost

    if ($sanctuaries.Contains($key)) {
        if ($script:shieldCharges -lt $script:maxShields) {
            $script:shieldCharges = $script:maxShields
            $status.Text = "Haven reached. Shields charged ($($script:maxShields)/$($script:maxShields))."
        } else {
            $status.Text = "Haven. Shields already at max ($($script:shieldCharges)/$($script:maxShields))."
        }
        if ($bonusSanctuaries.Contains($key)) {
            $script:moves += 1
            [void]$bonusSanctuaries.Remove($key)
            $status.Text = "Bonus haven! +1 move. Shields: $($script:shieldCharges)/$($script:maxShields). Moves: $($script:moves)."
        }
    }

    $pickupStatus = $null
    if ($targets.Contains($key)) {
        $targets.Remove($key) | Out-Null
        $script:score += 18 + ($script:level * 4)
        $pickupStatus = "Sigil taken. Cost was $moveCost move(s). The sentinels react."
    }

    if ($breakerTargets.Contains($key)) {
        $breakerTargets.Remove($key) | Out-Null
        $script:moves += 2
        $script:score += 14 + ($script:level * 3)
        $pickupStatus = "Breaker cracked. +2 emergency moves after paying $moveCost."
    }

    Move-Sentinels

    if ($null -ne $pickupStatus) {
        $postKey = "$($rook.Row),$($rook.Col)"
        $isActuallyThreatened = $dangerTiles.Contains($postKey) -and -not $sanctuaries.Contains($postKey)
        $dangerSuffix = if ($isActuallyThreatened) { ' WARNING: threatened — watch the sentinels.' } else { '' }
        $status.Text = $pickupStatus + $dangerSuffix
    } elseif (-not $sanctuaries.Contains($key)) {
        $postKey = "$($rook.Row),$($rook.Col)"
        $isNowSafe = -not ($dangerTiles.Contains($postKey) -and -not $sanctuaries.Contains($postKey))
        $positionNote = if ($isNowSafe) { 'Position safe.' } else { 'WARNING: threatened!' }
        $status.Text = "Moved $distance tiles (cost: $moveCost). $positionNote $($script:moves) move(s) left."
    }

    $newKey = "$($rook.Row),$($rook.Col)"
    foreach ($sentinel in $sentinels) {
        if ($sentinel.Row -eq $rook.Row -and $sentinel.Col -eq $rook.Col) {
            Lose-Board 'A sentinel collapsed onto your lane. Board lost.'
            return
        }
    }
    if ($dangerTiles.Contains($newKey) -and -not $sanctuaries.Contains($newKey)) {
        if ($script:shieldCharges -gt 0) {
            $script:shieldCharges -= 1
            $status.Text = "Shield burned ($($script:shieldCharges)/$($script:maxShields) left). Next move must be cleaner."
        }
        else {
            Lose-Board 'You ended your move in a threatened line.'
            return
        }
    }

    if ($targets.Count -eq 0 -and $breakerTargets.Count -eq 0) {
        $script:level += 1
        $script:score += 30
        $status.Text = "Board cleared. +30 bonus. Entering level $($script:level)."
        $recapLabel.Text = "Last board: cleared at score $($script:score), pushing into level $($script:level)"
        Save-Progress
        Build-Level
        return
    }
    if ($script:moves -le 0) {
        Lose-Board 'Out of moves. The room closed in before every sigil was taken.'
        return
    }

    Update-Board
}
