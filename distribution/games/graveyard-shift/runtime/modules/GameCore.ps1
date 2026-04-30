function Get-GraveyardShiftBestScore {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Paths
    )

    if (-not (Test-Path $Paths.BestScorePath)) {
        return 0
    }

    try {
        $rawScore = (Get-Content -Path $Paths.BestScorePath -Raw).Trim()
        if ([string]::IsNullOrWhiteSpace($rawScore)) {
            return 0
        }

        $parsedScore = [int]$rawScore
        return [Math]::Max(0, $parsedScore)
    }
    catch {
        return 0
    }
}

function Save-GraveyardShiftBestScore {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Paths,
        [Parameter(Mandatory = $true)]
        [int]$Score
    )

    Set-Content -Path $Paths.BestScorePath -Value ([string][Math]::Max(0, $Score)) -Encoding ascii
}

function New-GraveyardShiftState {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Paths
    )

    return @{
        Score = 0
        Lives = 3
        MaxLives = 3
        TimeLeft = 45
        FinalRushTriggered = $false
        Running = $false
        Rng = [System.Random]::new()
        Ghosts = New-Object System.Collections.ArrayList
        Paths = $Paths
        BestScore = Get-GraveyardShiftBestScore -Paths $Paths
        ComboCount = 0
        ComboMultiplier = 1
        LastCleanseAt = [DateTime]::MinValue
        NextComboBonusAt = 5
        SpawnTimer = $null
        GameTimer = $null
        AgeTimer = $null
    }
}

function Update-GraveyardShiftHud {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui
    )

    $Ui.Hud.Text = "Score: $($State.Score)    Lanterns: $($State.Lives)    Time: $($State.TimeLeft)"
    $Ui.Hud.ForeColor = if ($State.Lives -le 1) {
        [System.Drawing.Color]::FromArgb(255, 80, 80)
    }
    elseif ($State.Lives -le 2) {
        [System.Drawing.Color]::FromArgb(255, 160, 40)
    }
    else {
        [System.Drawing.Color]::White
    }

    $Ui.ComboLabel.Text = if ($State.ComboCount -gt 1) {
        "Combo: x$($State.ComboMultiplier) ($($State.ComboCount))"
    }
    else {
        "Combo: x$($State.ComboMultiplier)"
    }
    $Ui.ComboLabel.ForeColor = if ($State.ComboMultiplier -ge 4) {
        [System.Drawing.Color]::FromArgb(255, 208, 120)
    }
    elseif ($State.ComboMultiplier -ge 3) {
        [System.Drawing.Color]::FromArgb(255, 172, 96)
    }
    elseif ($State.ComboMultiplier -ge 2) {
        [System.Drawing.Color]::FromArgb(190, 235, 255)
    }
    else {
        [System.Drawing.Color]::FromArgb(156, 225, 255)
    }

    $Ui.BestLabel.Text = "Best: $($State.BestScore)"
}

function Reset-GraveyardShiftCombo {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State
    )

    $State.ComboCount = 0
    $State.ComboMultiplier = 1
    $State.LastCleanseAt = [DateTime]::MinValue
    $State.NextComboBonusAt = 5
}

function Register-GraveyardShiftCleanse {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [int]$BaseScore
    )

    $now = [DateTime]::UtcNow
    if (($now - $State.LastCleanseAt).TotalMilliseconds -le 1600) {
        $State.ComboCount += 1
    }
    else {
        $State.ComboCount = 1
        $State.NextComboBonusAt = 5
    }

    $State.LastCleanseAt = $now
    $State.ComboMultiplier = [Math]::Min(4, [int](1 + [Math]::Floor(($State.ComboCount - 1) / 3)))

    $scoreDelta = $BaseScore * $State.ComboMultiplier
    $State.Score += $scoreDelta

    $timeBonus = 0
    if ($State.ComboCount -ge $State.NextComboBonusAt) {
        $timeBonus = 2
        $State.TimeLeft = [Math]::Min(60, $State.TimeLeft + $timeBonus)
        $State.NextComboBonusAt += 5
    }

    return @{
        ScoreDelta = $scoreDelta
        TimeBonus = $timeBonus
    }
}

function Remove-GraveyardShiftGhost {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui,
        [Parameter(Mandatory = $true)]
        [pscustomobject]$GhostRecord
    )

    if ($null -ne $GhostRecord.Button) {
        $Ui.Yard.Controls.Remove($GhostRecord.Button)
        $GhostRecord.Button.Dispose()
    }

    [void]$State.Ghosts.Remove($GhostRecord)
}

function Clear-GraveyardShiftGhosts {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui
    )

    foreach ($ghostRecord in $State.Ghosts.ToArray()) {
        Remove-GraveyardShiftGhost -State $State -Ui $Ui -GhostRecord $ghostRecord
    }
}

function Update-GraveyardShiftGhostVisual {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$GhostRecord
    )

    $progress = 0.0
    if ($GhostRecord.LifetimeMs -gt 0) {
        $progress = [Math]::Min(1.0, $GhostRecord.AgeMs / $GhostRecord.LifetimeMs)
    }

    switch ($GhostRecord.Kind) {
        'HEX' {
            if ($progress -ge 0.85) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 68, 68)
            }
            elseif ($progress -ge 0.6) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(214, 92, 92)
            }
            else {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(184, 86, 86)
            }
            $GhostRecord.Button.ForeColor = [System.Drawing.Color]::White
        }
        'PGT' {
            if ($progress -ge 0.82) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 132, 96)
            }
            elseif ($progress -ge 0.55) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 186, 112)
            }
            else {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 110, 210)
            }
            $GhostRecord.Button.ForeColor = [System.Drawing.Color]::FromArgb(35, 20, 40)
        }
        default {
            if ($progress -ge 0.82) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 126, 96)
            }
            elseif ($progress -ge 0.55) {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(255, 206, 116)
            }
            else {
                $GhostRecord.Button.BackColor = [System.Drawing.Color]::FromArgb(198, 235, 255)
            }
            $GhostRecord.Button.ForeColor = [System.Drawing.Color]::FromArgb(20, 27, 38)
        }
    }
}

function Stop-GraveyardShiftRound {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui,
        [Parameter(Mandatory = $true)]
        [string]$EndReason
    )

    if (-not $State.Running -and $State.Ghosts.Count -eq 0) {
        return
    }

    $State.Running = $false
    if ($null -ne $State.SpawnTimer) { $State.SpawnTimer.Stop() }
    if ($null -ne $State.GameTimer) { $State.GameTimer.Stop() }
    if ($null -ne $State.AgeTimer) { $State.AgeTimer.Stop() }

    Clear-GraveyardShiftGhosts -State $State -Ui $Ui

    $newBest = $false
    if ($State.Score -gt $State.BestScore) {
        $State.BestScore = $State.Score
        Save-GraveyardShiftBestScore -Paths $State.Paths -Score $State.BestScore
        $newBest = $true
    }

    Reset-GraveyardShiftCombo -State $State
    $Ui.StartButton.Enabled = $true
    $Ui.StartButton.Text = 'Light Lanterns Again'
    $Ui.Status.Text = if ($newBest) {
        'The yard fell silent. New best run carved into the ledger.'
    }
    else {
        'All quiet now. Light lanterns to go again.'
    }
    Update-GraveyardShiftHud -State $State -Ui $Ui

    $message = "$EndReason`nScore: $($State.Score)`nBest: $($State.BestScore)"
    if ($newBest) {
        $message += "`nNew best run!"
    }

    [System.Windows.Forms.MessageBox]::Show($message, 'Graveyard Shift') | Out-Null
}

function Spawn-GraveyardShiftGhost {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui
    )

    if (-not $State.Running) {
        return
    }

    $roll = $State.Rng.NextDouble()
    $ghostKind = if ($roll -lt 0.18) {
        'HEX'
    }
    elseif ($roll -lt 0.30) {
        'PGT'
    }
    else {
        'SPT'
    }

    $ghostSize = switch ($ghostKind) {
        'PGT' { 82 }
        'HEX' { 68 }
        default { 74 }
    }

    $maxX = [Math]::Max(19, $Ui.Yard.ClientSize.Width - $ghostSize - 18)
    $maxY = [Math]::Max(19, $Ui.Yard.ClientSize.Height - $ghostSize - 18)

    $ghostButton = New-Object System.Windows.Forms.Button
    $ghostButton.FlatStyle = 'Flat'
    $ghostButton.FlatAppearance.BorderSize = 1
    $ghostButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(12, 16, 24)
    $ghostButton.Size = New-Object System.Drawing.Size($ghostSize, $ghostSize)
    $ghostButton.Location = New-Object System.Drawing.Point($State.Rng.Next(18, $maxX), $State.Rng.Next(18, $maxY))
    $ghostButton.Text = $ghostKind
    $ghostButton.Font = New-Object System.Drawing.Font('Consolas', 12, [System.Drawing.FontStyle]::Bold)
    $ghostButton.Cursor = [System.Windows.Forms.Cursors]::Hand
    $ghostButton.UseVisualStyleBackColor = $false

    $baseLifetime = switch ($ghostKind) {
        'HEX' { 2600 }
        'PGT' { 3550 }
        default { 3200 }
    }
    $lifetimeVariance = switch ($ghostKind) {
        'HEX' { 900 }
        'PGT' { 1100 }
        default { 1000 }
    }
    $rushPenalty = if ($State.FinalRushTriggered) {
        switch ($ghostKind) {
            'HEX' { 250 }
            'PGT' { 700 }
            default { 600 }
        }
    }
    else {
        0
    }

    $ghostRecord = [pscustomobject]@{
        Button = $ghostButton
        Kind = $ghostKind
        AgeMs = 0
        LifetimeMs = [Math]::Max(1400, $baseLifetime + $State.Rng.Next(0, $lifetimeVariance) - $rushPenalty)
    }

    Update-GraveyardShiftGhostVisual -GhostRecord $ghostRecord

    $ghostButton.Add_Click({
            if (-not $State.Running) {
                return
            }

            switch ($ghostRecord.Kind) {
                'HEX' {
                    $State.Lives -= 1
                    Reset-GraveyardShiftCombo -State $State
                    $Ui.Status.Text = 'Hex sigil snapped back. One lantern lost.'
                }
                'PGT' {
                    $result = Register-GraveyardShiftCleanse -State $State -BaseScore 20
                    $Ui.Status.Text = if ($result.TimeBonus -gt 0) {
                        "Poltergeist burst! +$($result.ScoreDelta) and +$($result.TimeBonus)s."
                    }
                    elseif ($State.ComboMultiplier -gt 1) {
                        "Poltergeist burst! Combo x$($State.ComboMultiplier) is live."
                    }
                    else {
                        'Poltergeist burst! Ancient mischief dispersed.'
                    }
                }
                default {
                    $result = Register-GraveyardShiftCleanse -State $State -BaseScore 12
                    $Ui.Status.Text = if ($result.TimeBonus -gt 0) {
                        "Steady hands. +$($result.ScoreDelta) and +$($result.TimeBonus)s."
                    }
                    elseif ($State.ComboMultiplier -gt 1) {
                        "The wardline holds. Combo x$($State.ComboMultiplier)."
                    }
                    else {
                        'The lantern line held.'
                    }
                }
            }

            Remove-GraveyardShiftGhost -State $State -Ui $Ui -GhostRecord $ghostRecord
            Update-GraveyardShiftHud -State $State -Ui $Ui

            if ($State.Lives -le 0) {
                Stop-GraveyardShiftRound -State $State -Ui $Ui -EndReason 'All lanterns extinguished.'
            }
        })

    [void]$State.Ghosts.Add($ghostRecord)
    $Ui.Yard.Controls.Add($ghostButton)
}

function Reset-GraveyardShiftRound {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui
    )

    if ($null -ne $State.SpawnTimer) { $State.SpawnTimer.Stop() }
    if ($null -ne $State.GameTimer) { $State.GameTimer.Stop() }
    if ($null -ne $State.AgeTimer) { $State.AgeTimer.Stop() }

    Clear-GraveyardShiftGhosts -State $State -Ui $Ui

    $State.Score = 0
    $State.Lives = $State.MaxLives
    $State.TimeLeft = 45
    $State.FinalRushTriggered = $false
    $State.Running = $true
    Reset-GraveyardShiftCombo -State $State

    $State.SpawnTimer.Interval = 650
    $Ui.StartButton.Enabled = $false
    $Ui.StartButton.Text = 'Lanterns Lit'
    $Ui.Status.Text = 'Clean SPT and PGT. Avoid HEX. Spirits redden before they break free.'

    Update-GraveyardShiftHud -State $State -Ui $Ui
}

function Start-GraveyardShiftRuntime {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Paths
    )

    [System.Windows.Forms.Application]::EnableVisualStyles()

    $ui = New-GraveyardShiftUi
    $state = New-GraveyardShiftState -Paths $Paths

    $spawnTimer = New-Object System.Windows.Forms.Timer
    $spawnTimer.Interval = 650
    $spawnTimer.Add_Tick({
            $ghostCap = if ($state.FinalRushTriggered) { 8 } else { 6 }
            if ($state.Ghosts.Count -lt $ghostCap) {
                Spawn-GraveyardShiftGhost -State $state -Ui $ui
            }
        })

    $gameTimer = New-Object System.Windows.Forms.Timer
    $gameTimer.Interval = 1000
    $gameTimer.Add_Tick({
            if (-not $state.Running) {
                return
            }

            $state.TimeLeft -= 1
            if (-not $state.FinalRushTriggered -and $state.TimeLeft -le 15) {
                $state.FinalRushTriggered = $true
                $state.SpawnTimer.Interval = 430
                $ui.Status.Text = 'Final rush. Faster hands or the whole yard wakes up.'
            }

            Update-GraveyardShiftHud -State $state -Ui $ui
            if ($state.TimeLeft -le 0) {
                Stop-GraveyardShiftRound -State $state -Ui $ui -EndReason 'Time ran out.'
            }
        })

    $ageTimer = New-Object System.Windows.Forms.Timer
    $ageTimer.Interval = 200
    $ageTimer.Add_Tick({
            if (-not $state.Running) {
                return
            }

            $escapedSpirits = 0
            $escapedHexes = 0

            foreach ($ghostRecord in $state.Ghosts.ToArray()) {
                $ghostRecord.AgeMs += $state.AgeTimer.Interval
                Update-GraveyardShiftGhostVisual -GhostRecord $ghostRecord

                if ($ghostRecord.AgeMs -lt $ghostRecord.LifetimeMs) {
                    continue
                }

                Remove-GraveyardShiftGhost -State $state -Ui $ui -GhostRecord $ghostRecord
                if ($ghostRecord.Kind -eq 'HEX') {
                    $escapedHexes += 1
                }
                else {
                    $state.Lives -= 1
                    $escapedSpirits += 1
                    Reset-GraveyardShiftCombo -State $state
                }
            }

            if ($escapedSpirits -gt 0) {
                $ui.Status.Text = if ($escapedSpirits -eq 1) {
                    'A spirit slipped the line. One lantern went dark.'
                }
                else {
                    "$escapedSpirits spirits slipped the line. Lanterns are failing."
                }
            }
            elseif ($escapedHexes -gt 0) {
                $ui.Status.Text = 'A hex faded on its own. Trust that instinct.'
            }

            Update-GraveyardShiftHud -State $state -Ui $ui
            if ($state.Lives -le 0) {
                Stop-GraveyardShiftRound -State $state -Ui $ui -EndReason 'All lanterns extinguished.'
            }
        })

    $state.SpawnTimer = $spawnTimer
    $state.GameTimer = $gameTimer
    $state.AgeTimer = $ageTimer

    Update-GraveyardShiftHud -State $state -Ui $ui

    $ui.StartButton.Add_Click({
            Reset-GraveyardShiftRound -State $state -Ui $ui
            $state.SpawnTimer.Start()
            $state.GameTimer.Start()
            $state.AgeTimer.Start()
        })

    [void]$ui.Form.ShowDialog()
}
