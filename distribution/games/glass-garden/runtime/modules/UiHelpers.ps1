function Update-Hud {
    $hud.Text = "Matches: $($script:matches) / 8    Moves: $($script:moves)    Combo: $($script:combo)    Score: $($script:score)"
    Update-CrackLabel
}

function Update-TimeLabel {
    $timeLabel.Text = "Sunlight: $($script:seasonTimeLeft)s / $($script:seasonTimeLimit)s"
    if ($script:seasonTimeLeft -le 10) {
        $timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 53, 69)
    }
    elseif ($script:seasonTimeLeft -le 20) {
        $timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 193, 7)
    }
    else {
        $timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
    }
}

function Update-CrackLabel {
    $crackLabel.Text = "Glass stress: $($script:cracks) / $($script:stressThreshold)"
    if ($script:cracks -ge ($script:stressThreshold - 1)) {
        $crackLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 53, 69)
    }
    elseif ($script:cracks -ge [Math]::Max(1, [Math]::Floor($script:stressThreshold / 2))) {
        $crackLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 193, 7)
    }
    else {
        $crackLabel.ForeColor = [System.Drawing.Color]::FromArgb(76, 175, 80)
    }
}

function Show-AllCards([bool]$faceUp) {
    foreach ($button in $buttons) {
        if (-not $button.Enabled) {
            continue
        }
        if ($faceUp) {
            $button.Text = [string]$button.Tag
        }
        else {
            $button.Text = 'BLOOM'
        }
    }
}
