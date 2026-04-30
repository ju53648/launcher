function Save-Progress {
    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
    }
    if ($script:floor -gt $script:bestFloor) {
        $script:bestFloor = $script:floor
    }

    $bestLabel.Text = "Best job: $($script:bestScore) score / floor $($script:bestFloor)"
    $payload = @{
        bestScore = $script:bestScore
        bestFloor = $script:bestFloor
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}

function Update-Board {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $button = $buttons[$row][$col]
            $button.Text = ''
            $button.BackColor = [System.Drawing.Color]::FromArgb(34, 37, 46)
            $key = "$row,$col"
            if ($walls.Contains($key)) {
                $button.Text = '#'
                $button.BackColor = [System.Drawing.Color]::FromArgb(70, 74, 88)
            }
            if ($loot.Contains($key)) {
                $button.Text = '$'
                $button.BackColor = [System.Drawing.Color]::FromArgb(110, 215, 118)
            }
            if ($script:intelTile -eq $key -and -not $script:intelCollected) {
                $button.Text = 'I'
                $button.BackColor = [System.Drawing.Color]::FromArgb(188, 141, 255)
            }
            if ($cameras.Contains($key)) {
                $button.Text = 'C'
                $button.BackColor = [System.Drawing.Color]::FromArgb(99, 198, 255)
            }
            if ($key -eq $exit) {
                $button.Text = 'E'
                $button.BackColor = [System.Drawing.Color]::FromArgb(84, 148, 252)
            }
            if ($smokeTiles.ContainsKey($key) -and $key -ne $exit) {
                $button.Text = '~'
                $button.BackColor = [System.Drawing.Color]::FromArgb(148, 148, 162)
            }
            foreach ($guard in $guards) {
                if ($guard.Row -eq $row -and $guard.Col -eq $col) {
                    $button.Text = 'G'
                    $button.BackColor = [System.Drawing.Color]::FromArgb(255, 103, 103)
                }
            }
            if ($player.Row -eq $row -and $player.Col -eq $col) {
                $button.Text = 'YOU'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
            }
        }
    }
    $extractText = if ($script:extractionTimer -gt 0) { [string]$script:extractionTimer } else { '--' }
    $intelText = if ($script:intelCollected) { 'YES' } else { '--' }
    $hud.Text = "Loot: $($script:collected) / 3    Intel: $intelText    Alarm: $($script:alarm)    Floor: $($script:floor)    Smoke: $($script:smoke)    Extract: $extractText    Score: $($script:score)"
    $alarmLabel.Text = "Alarm Heat: $($script:alarm)%"
    $alarmBar.Value = [Math]::Min(100, [Math]::Max(0, $script:alarm))
    $alarmLabel.ForeColor = if ($script:alarm -ge 75) {
        [System.Drawing.Color]::FromArgb(255, 70, 70)
    } elseif ($script:alarm -ge 40) {
        [System.Drawing.Color]::FromArgb(255, 160, 40)
    } else {
        [System.Drawing.Color]::FromArgb(130, 200, 130)
    }
}

function Step-Smoke {
    foreach ($tile in @($smokeTiles.Keys)) {
        $smokeTiles[$tile] -= 1
        if ($smokeTiles[$tile] -le 0) {
            $smokeTiles.Remove($tile)
        }
    }
}
