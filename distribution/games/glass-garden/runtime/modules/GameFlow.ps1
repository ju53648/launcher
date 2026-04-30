function Trigger-RunFailure([string]$recapText, [string]$messageText, [string]$statusText) {
    $previewTimer.Stop()
    $gameplayTimer.Stop()
    $hideTimer.Stop()
    $focusTimer.Stop()
    $script:revealed = $true
    $script:busy = $true
    Show-AllCards $true
    foreach ($btn in $buttons) {
        $btn.Enabled = $false
    }
    Update-Hud
    Update-TimeLabel
    Save-Progress
    [System.Windows.Forms.MessageBox]::Show($messageText, 'Glass Garden') | Out-Null
    Reset-Run
    $recapLabel.Text = $recapText
    $status.Text = $statusText
}

function Start-Preview {
    $script:revealed = $true
    $gameplayTimer.Stop()
    Show-AllCards $true
    $previewLabel.Text = "Preview: $($script:previewSeconds)s  |  Sunlight budget: $($script:seasonTimeLimit)s  |  Focus: $($script:focusCharges)"
    $previewTimer.Start()
}

function Setup-Season {
    $pool = $seasonPools[[Math]::Min($seasonPools.Count - 1, $script:season - 1)]
    $seasonLabel.Text = "Season $($script:season): $($pool.Name)"
    $script:moves = 0
    $script:matches = 0
    $script:combo = 0
    $script:seasonMismatches = 0
    $script:stressThreshold = [Math]::Min(6, 3 + $script:season)
    $script:comboMilestones = 0
    $script:timeDecayMultiplier = 1 + [Math]::Max(0, $script:season - 2) * 0.5
    $script:seasonTimeLimit = [Math]::Max(30, 50 - (($script:season - 1) * 9))
    $script:seasonTimeLeft = $script:seasonTimeLimit
    $script:previewSeconds = [Math]::Max(5, 8 - $script:season)
    $script:focusCharges = if ($script:season -ge 3) { 1 } else { 2 }
    $script:focusCost = if ($script:season -ge 3) { 4 } else { 5 }
    $script:pendingHideButtons = @()
    $script:revealed = $false
    $script:deck = @($pool.Symbols + $pool.Symbols | Get-Random -Count 16)
    $script:firstPick = $null
    $script:busy = $false
    for ($index = 0; $index -lt 16; $index++) {
        $button = $buttons[$index]
        $button.Text = 'BLOOM'
        $button.Enabled = $true
        Set-CardState $button 'Default'
        $button.Tag = $script:deck[$index]
    }
    $previewLabel.Text = "Preview: memorize the beds. Sunlight budget: $($script:seasonTimeLimit)s  |  Focus: $($script:focusCharges)"
    Update-TimeLabel
    Update-Hud
    Start-Preview
}

function Use-GardenFocus {
    if ($script:revealed -or $script:busy -or $null -ne $script:firstPick) {
        return
    }

    if ($script:focusCharges -le 0) {
        $status.Text = 'Garden Focus is spent for this season.'
        Update-Hud
        return
    }

    if ($script:seasonTimeLeft -le $script:focusCost) {
        $status.Text = "Not enough sunlight for Garden Focus. Keep more than $($script:focusCost)s in reserve."
        Update-Hud
        return
    }

    $script:focusCharges -= 1
    $script:seasonTimeLeft = [Math]::Max(0, $script:seasonTimeLeft - $script:focusCost)
    $script:combo = 0
    $script:busy = $true
    $script:revealed = $true
    Show-AllCards $true
    $status.Text = "Garden Focus reveals every hidden bed for $([Math]::Round($script:focusDurationMs / 1000, 1))s. Sunlight drops by $($script:focusCost)s."
    $previewLabel.Text = "Garden Focus active. Rebuild the pattern before the shimmer fades."
    Update-Hud
    Update-TimeLabel
    $focusTimer.Interval = $script:focusDurationMs
    $focusTimer.Start()
}

function Reset-Run {
    $previewTimer.Stop()
    $gameplayTimer.Stop()
    $hideTimer.Stop()
    $focusTimer.Stop()
    $script:score = 0
    $script:cracks = 0
    $script:season = 1
    $status.Text = 'Memorize the beds during preview. Use Garden Focus sparingly and clear 3 seasons before stress or sunlight collapse.'
    $recapLabel.Text = 'Last bloom: fresh season reset'
    Setup-Season
    Update-Hud
}
