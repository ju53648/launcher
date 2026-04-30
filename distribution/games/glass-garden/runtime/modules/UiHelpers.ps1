function Update-Hud {
    $hud.Text = "Matches: $($script:matches) / 8    Moves: $($script:moves)    Combo: $($script:combo)    Focus: $($script:focusCharges)    Decay: x$($script:timeDecayMultiplier)    Score: $($script:score)"
    Update-CrackLabel
    Update-FocusButton
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

function Set-CardState([System.Windows.Forms.Button]$button, [string]$state) {
    switch ($state) {
        'Selected' {
            $button.BackColor = $script:cardSelectedColor
        }
        'Matched' {
            $button.BackColor = $script:cardMatchedColor
        }
        'Mismatch' {
            $button.BackColor = $script:cardMismatchColor
        }
        default {
            $button.BackColor = $script:cardBaseColor
        }
    }
}

function Update-FocusButton {
    if ($null -eq $focusButton) {
        return
    }

    $focusButton.Text = "Garden Focus ($($script:focusCharges))"
    $focusButton.Enabled = (
        -not $script:revealed -and
        -not $script:busy -and
        $null -eq $script:firstPick -and
        $script:focusCharges -gt 0 -and
        $script:seasonTimeLeft -gt $script:focusCost
    )

    if ($script:focusCharges -le 0) {
        $focusHintLabel.Text = 'No Focus charges left this season.'
    }
    elseif ($script:seasonTimeLeft -le $script:focusCost) {
        $focusHintLabel.Text = "Need more than $($script:focusCost)s sunlight to trigger Focus."
    }
    else {
        $focusHintLabel.Text = "Reveal all hidden beds for $([Math]::Round($script:focusDurationMs / 1000, 1))s at a cost of $($script:focusCost)s sunlight."
    }
}
