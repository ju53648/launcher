Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Glass Garden'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(980, 700)
$form.BackColor = [System.Drawing.Color]::FromArgb(226, 244, 235)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$seasonPools = @(
    @{ Name = 'Spring Glass'; Symbols = @('ROSE','MOSS','IVY','LILY','FERN','IRIS','REED','SAGE') },
    @{ Name = 'Summer House'; Symbols = @('ORCHID','MYRTLE','LOTUS','THYME','BASIL','LAUREL','CLOVER','CUMIN') },
    @{ Name = 'Night Bloom'; Symbols = @('ASTER','ALOE','CEDAR','POPPY','BRIAR','MAPLE','HEATHER','JUNIPER') }
)

$script:deck = @()
$buttons = @()
$script:firstPick = $null
$script:busy = $false
$script:moves = 0
$script:matches = 0
$script:season = 1
$script:combo = 0
$script:cracks = 0
$script:previewSeconds = 6
$script:score = 0
$script:revealed = $false
$script:runtimeRoot = $PSScriptRoot
$script:savePath = Join-Path $script:runtimeRoot 'glass-garden-save.json'
$script:bestScore = 0
$script:bestSeason = 1
$script:seasonMismatches = 0
$script:seasonTimeLimit = 0
$script:seasonTimeLeft = 0
$script:stressThreshold = 5
$script:comboMilestones = 0
$script:timeDecayMultiplier = 1

$title = New-Object System.Windows.Forms.Label
$title.Text = 'GLASS GARDEN'
$title.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(26, 18)
$form.Controls.Add($title)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Matches: 0 / 8    Moves: 0    Combo: 0    Score: 0'
$hud.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(30, 62)
$form.Controls.Add($hud)

$seasonLabel = New-Object System.Windows.Forms.Label
$seasonLabel.Text = 'Season 1: Spring Glass'
$seasonLabel.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$seasonLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$seasonLabel.AutoSize = $true
$seasonLabel.Location = New-Object System.Drawing.Point(30, 94)
$form.Controls.Add($seasonLabel)

$previewLabel = New-Object System.Windows.Forms.Label
$previewLabel.Text = 'Preview: memorize the beds'
$previewLabel.ForeColor = [System.Drawing.Color]::FromArgb(90, 143, 112)
$previewLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$previewLabel.AutoSize = $true
$previewLabel.Location = New-Object System.Drawing.Point(30, 124)
$form.Controls.Add($previewLabel)

$crackLabel = New-Object System.Windows.Forms.Label
$crackLabel.Text = 'Glass stress: 0 / 5'
$crackLabel.ForeColor = [System.Drawing.Color]::FromArgb(170, 96, 96)
$crackLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$crackLabel.AutoSize = $true
$crackLabel.Location = New-Object System.Drawing.Point(740, 40)
$form.Controls.Add($crackLabel)

$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = 'Sunlight: 0s / 0s'
$timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$timeLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$timeLabel.AutoSize = $true
$timeLabel.Location = New-Object System.Drawing.Point(740, 62)
$form.Controls.Add($timeLabel)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'Start Season'
$resetButton.Location = New-Object System.Drawing.Point(740, 82)
$resetButton.Size = New-Object System.Drawing.Size(180, 40)
$resetButton.FlatStyle = 'Flat'
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(137, 212, 176)
$form.Controls.Add($resetButton)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best bloom: 0 score / season 1'
$bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(740, 132)
$form.Controls.Add($bestLabel)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Memorize the beds during preview. Three clean seasons restores the glasshouse.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$status.MaximumSize = New-Object System.Drawing.Size(220, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(740, 168)
$form.Controls.Add($status)

$recapLabel = New-Object System.Windows.Forms.Label
$recapLabel.Text = 'Last bloom: none yet'
$recapLabel.ForeColor = [System.Drawing.Color]::FromArgb(90, 143, 112)
$recapLabel.MaximumSize = New-Object System.Drawing.Size(220, 0)
$recapLabel.AutoSize = $true
$recapLabel.Location = New-Object System.Drawing.Point(740, 240)
$form.Controls.Add($recapLabel)

foreach ($module in @('StatePersistence.ps1', 'UiHelpers.ps1', 'GameFlow.ps1', 'EntryPoint.ps1')) {
    $modulePath = Join-Path $script:runtimeRoot (Join-Path 'modules' $module)
    if (-not (Test-Path $modulePath)) {
        throw "Missing runtime module: $modulePath"
    }
    . $modulePath
}

Initialize-SaveState

for ($index = 0; $index -lt 16; $index++) {
    $button = New-Object System.Windows.Forms.Button
    $button.Size = New-Object System.Drawing.Size(170, 110)
    $button.Location = New-Object System.Drawing.Point(30 + (($index % 4) * 170), 170 + ([Math]::Floor($index / 4) * 118))
    $button.FlatStyle = 'Flat'
    $button.BackColor = [System.Drawing.Color]::FromArgb(182, 227, 205)
    $button.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $buttons += $button
    $form.Controls.Add($button)
}

$hideTimer = New-Object System.Windows.Forms.Timer
$hideTimer.Interval = 900
$hideTimer.Add_Tick({
    $hideTimer.Stop()
    Show-AllCards $false
    $script:firstPick = $null
    $script:busy = $false
})

$previewTimer = New-Object System.Windows.Forms.Timer
$previewTimer.Interval = 1000
$previewTimer.Add_Tick({
    $script:previewSeconds -= 1
    if ($script:previewSeconds -le 0) {
        $previewTimer.Stop()
        $script:revealed = $false
        Show-AllCards $false
        $previewLabel.Text = 'Preview complete. Tend the beds before sunlight fades.'
        $gameplayTimer.Start()
    }
    else {
        $previewLabel.Text = "Preview: $($script:previewSeconds)s  |  Sunlight budget: $($script:seasonTimeLimit)s"
    }
})

$gameplayTimer = New-Object System.Windows.Forms.Timer
$gameplayTimer.Interval = 1000
$gameplayTimer.Add_Tick({
    if ($script:revealed) {
        return
    }

    $script:seasonTimeLeft = [Math]::Max(0, [int][Math]::Floor($script:seasonTimeLeft - (1 * $script:timeDecayMultiplier)))
    Update-TimeLabel
    if ($script:seasonTimeLeft -le 0) {
        Trigger-RunFailure "Last bloom: withered in season $($script:season) at score $($script:score)" 'Sunlight ran out. The beds withered before they could bloom.' 'Run reset. Stabilize faster and protect your sunlight.'
    }
})

foreach ($button in $buttons) {
    $button.Add_Click({
        param($sender, $eventArgs)

        if ($script:revealed -or $script:busy -or -not $sender.Enabled -or $sender.Text -ne 'BLOOM') {
            return
        }

        $sender.Text = [string]$sender.Tag
        if ($null -eq $script:firstPick) {
            $script:firstPick = $sender
            return
        }

        $script:moves += 1
        if ([string]$script:firstPick.Tag -eq [string]$sender.Tag) {
            $script:firstPick.Enabled = $false
            $sender.Enabled = $false
            $script:firstPick.BackColor = [System.Drawing.Color]::FromArgb(122, 191, 155)
            $sender.BackColor = [System.Drawing.Color]::FromArgb(122, 191, 155)
            $script:matches += 1
            $script:combo += 1
            $timeGain = 2 + [Math]::Min(2, [Math]::Floor($script:combo / 3))
            $comboBonus = 0
            $specialStatus = $false
            if ($script:combo -eq 4 -or $script:combo -eq 9 -or $script:combo -eq 15) {
                $comboBonus = 40 + ($script:season * 5)
                $timeGain += 1
                $status.Text = "COMBO MILESTONE! +$comboBonus bonus score, +1 extra sunlight"
                $specialStatus = $true
            }
            elseif ($script:combo -eq 7) {
                $rareBonus = 60 + ($script:season * 8)
                $comboBonus = $rareBonus
                if ($script:cracks -gt 0) {
                    $script:cracks -= 1
                    $timeGain += 2
                    $status.Text = "RARE ULTRA-BLOOM! +$rareBonus score, stress shattered, +2s sunlight surge!"
                }
                else {
                    $timeGain += 1
                    $status.Text = "RARE ULTRA-BLOOM! +$rareBonus score, glass fortified, +1s bonus!"
                }
                $specialStatus = $true
            }
            $script:seasonTimeLeft = [Math]::Min($script:seasonTimeLimit, $script:seasonTimeLeft + $timeGain)
            $script:score += 24 + ($script:combo * 8) + ($script:season * 10) + $comboBonus
            if (-not $specialStatus -and $script:combo -ge 3 -and $script:cracks -gt 0) {
                $script:cracks -= 1
                $status.Text = "Bloom surge! +$timeGain s and 1 stress repaired."
            }
            elseif (-not $specialStatus) {
                $status.Text = "Healthy bloom. +$timeGain s sunlight banked."
            }
            $script:firstPick = $null
            if ($script:matches -ge 8) {
                $perfectBonus = 0
                $efficiencyDelta = $script:seasonTimeLeft - 15
                if ($efficiencyDelta -ge 0) {
                    $efficiencyBonus = 20 + ($efficiencyDelta * 2)
                    $script:score += $efficiencyBonus
                    $status.Text = "Season clear. Sunlight efficiency bonus +$efficiencyBonus."
                }
                else {
                    $overdrawPenalty = [Math]::Min(12, [Math]::Abs($efficiencyDelta))
                    $script:score = [Math]::Max(0, $script:score - ($overdrawPenalty * 2))
                    $status.Text = "Season clear, but overdrawn sunlight. Score pressure applied (no stress added)."
                }
                if ($script:seasonMismatches -eq 0) {
                    $perfectBonus = 50 + ($script:season * 10)
                    $script:score += $perfectBonus
                    $status.Text = "Perfect season! +$perfectBonus bonus score. The glass held flawless."
                }
                if ($script:cracks -ge $script:stressThreshold) {
                    Trigger-RunFailure "Last bloom: cracked out on season $($script:season) with score $($script:score)" 'The greenhouse cracked under pressure. Restarting season one.' 'Run reset. Protect the canopy while you push for points.'
                    return
                }
                Update-Hud
                Update-TimeLabel
                if ($script:season -ge 3) {
                    $winRecap = "Last bloom: restored house with score $($script:score) in $($script:moves) moves"
                    $gameplayTimer.Stop()
                    Save-Progress
                    [System.Windows.Forms.MessageBox]::Show("Glasshouse restored.`r`nScore: $($script:score)`r`nMoves: $($script:moves)", 'Glass Garden') | Out-Null
                    Reset-Run
                    $recapLabel.Text = $winRecap
                }
                else {
                    $recapLabel.Text = "Last bloom: season $($script:season) cleared at score $($script:score)"
                    Save-Progress
                    $script:cracks = [Math]::Max(0, $script:cracks - 1)
                    $script:season += 1
                    $status.Text = if ($perfectBonus -gt 0) { "Perfect! +$perfectBonus. Stress eased. Next bed: trickier." } else { 'Season cleared. Stress eased. Next bed: trickier.' }
                    Setup-Season
                }
                return
            }
        }
        else {
            $script:busy = $true
            $script:combo = 0
            $script:cracks += 1
            $script:seasonMismatches += 1
            $timeLoss = 2
            if ($script:seasonMismatches -gt $script:season) {
                $timeLoss = 4
                $script:timeDecayMultiplier = [Math]::Min(3, $script:timeDecayMultiplier + ($script:seasonMismatches - $script:season))
                $stressLeft = [Math]::Max(0, $script:stressThreshold - $script:cracks)
                $status.Text = "TIMEBOMB! Decay x$($script:timeDecayMultiplier). -4s penalty. $stressLeft stress until collapse."
            }
            else {
                $stressLeft = [Math]::Max(0, $script:stressThreshold - $script:cracks)
                $effectiveLeft = [Math]::Max(0, $script:seasonTimeLeft - $timeLoss)
                $status.Text = "Mismatch -${timeLoss}s sunlight, +1 stress. Remaining: ${effectiveLeft}s left, $stressLeft stress until collapse."
            }
            $script:seasonTimeLeft = [Math]::Max(0, $script:seasonTimeLeft - $timeLoss)
            $script:score = [Math]::Max(0, $script:score - 10)
            $hideTimer.Start()

            if ($script:cracks -ge $script:stressThreshold) {
                Trigger-RunFailure "Last bloom: cracked out on season $($script:season) with score $($script:score)" 'The greenhouse cracked under pressure. Restarting season one.' 'Run reset. Protect the canopy while you push for points.'
                return
            }
            if ($script:seasonTimeLeft -le 0) {
                Trigger-RunFailure "Last bloom: withered in season $($script:season) at score $($script:score)" 'Sunlight ran out. The beds withered before they could bloom.' 'Run reset. Stabilize faster and protect your sunlight.'
                return
            }
        }
        Update-Hud
        Update-TimeLabel
    })
}

Start-GlassGardenRuntime
