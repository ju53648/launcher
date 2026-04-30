function Get-SetTitle([int]$score, [int]$phase, [int]$crowd) {
    if ($phase -ge 4 -and $crowd -ge 70 -and $score -ge 900) { return 'midnight detonator' }
    if ($phase -ge 4 -or $score -ge 700) { return 'afterhours breaker' }
    if ($phase -ge 3 -or $score -ge 450) { return 'backroom instigator' }
    return 'garage opener'
}

function Get-CrowdAssistState {
    return [pscustomobject]@{
        Warning = $script:crowd -le 40
        Critical = $script:crowd -le 25
    }
}

function Save-Progress {
    $prevBestScore = $script:bestScore
    $prevBestPhase = $script:bestPhase
    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
    }
    if ($script:phase -gt $script:bestPhase) {
        $script:bestPhase = $script:phase
    }
    $candidateTitle = Get-SetTitle $script:score $script:phase $script:crowd
    if ($script:score -gt $prevBestScore -or $script:phase -gt $prevBestPhase) {
        $script:bestTitle = $candidateTitle
    }

    $script:bestLabel.Text = "Best crowd: $($script:bestScore) score / phase $($script:bestPhase)"
    $script:titleLabel.Text = "Stage title: $($script:bestTitle)"
    $payload = @{
        bestScore = $script:bestScore
        bestPhase = $script:bestPhase
        bestTitle = $script:bestTitle
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}

function Get-SpawnInterval {
    $baseInterval = switch ($script:phase) {
        1 { 535 }
        2 { 460 }
        3 { 390 }
        default { 340 }
    }
    $momentumReduction = [int][Math]::Floor([Math]::Min(90, $script:crowdMomentum) / 15) * 6
    $comboReduction = if ($script:combo -ge 18) { 18 } elseif ($script:combo -ge 10) { 10 } else { 0 }
    return [Math]::Max(250, $baseInterval - $momentumReduction - $comboReduction)
}

function Get-NoteSpeed {
    switch ($script:phase) {
        1 { return 16 }
        2 { return 19 }
        3 { return 22 }
        default { return 24 }
    }
}

function Add-Note([int]$lane, [int]$startY = 0, [int]$speedBoost = 0) {
    $script:notes.Add([pscustomobject]@{
        Lane = [int]$lane
        Y = [int]$startY
        Speed = (Get-NoteSpeed) + [int]$speedBoost
    })
}

function Get-HitWindows {
    $baseHitWindow = switch ($script:phase) { 1 { 24 } 2 { 19 } 3 { 16 } default { 15 } }
    $basePerfectWindow = switch ($script:phase) { 1 { 9 } 2 { 7 } default { 6 } }
    $momentumAdjust = [int][Math]::Floor([Math]::Min(100, $script:crowdMomentum) / 20)
    $assistState = Get-CrowdAssistState
    $clutchAdjust = if ($assistState.Critical) { 4 } elseif ($assistState.Warning) { 2 } else { 0 }
    $perfectAdjust = if ($assistState.Critical) { 1 } else { 0 }

    return @{
        Hit = $baseHitWindow + $momentumAdjust + $clutchAdjust
        Perfect = $basePerfectWindow + $perfectAdjust
        Great = $basePerfectWindow + 4
    }
}

function Update-Multiplier {
    $hypeStep = [int][Math]::Floor([Math]::Min(80, $script:crowdMomentum) / 25)
    $streakStep = [int][Math]::Floor([Math]::Min(30, $script:perfectStreak) / 10)
    $script:multiplier = [Math]::Min(4, 1 + $hypeStep + $streakStep)
}

function Draw-Notes {
    foreach ($lane in $script:lanes) {
        $lane.Controls.Clear()
    }
    [void]$script:lanePanel.Controls.SetChildIndex($script:hitLine, 0)
    [void]$script:lanePanel.Controls.SetChildIndex($script:overlayLabel, 0)
    foreach ($note in $script:notes) {
        $notePanel = New-Object System.Windows.Forms.Panel
        $notePanel.Size = New-Object System.Drawing.Size(94, 22)
        $notePanel.Location = New-Object System.Drawing.Point(12, [int]$note.Y)
        $notePanel.BackColor = $script:colors[$note.Lane]
        $script:lanes[$note.Lane].Controls.Add($notePanel)
    }
}

function Update-Hud {
    Update-Multiplier
    $script:hud.Text = "Score: $($script:score)    Combo: $($script:combo)    Time: $($script:timeLeft)    Phase: $($script:phase)    Mult: x$($script:multiplier)"
    $crowdMood = if ($script:crowd -ge 80) { 'ERUPTING' } elseif ($script:crowd -ge 60) { 'LOCKED IN' } elseif ($script:crowd -ge 35) { 'SHAKY' } else { 'FADING' }
    if ($crowdMood -ne $script:lastCrowdMood) {
        $script:lastCrowdMood = $crowdMood
        if ($crowdMood -eq 'ERUPTING') { $script:status.Text = 'CROWD SHIFT: Room is ERUPTING. Surge incoming.' }
        elseif ($crowdMood -eq 'SHAKY') { $script:status.Text = 'CROWD SHIFT: Crowd went SHAKY. Tighten the lines.' }
        elseif ($crowdMood -eq 'FADING') { $script:status.Text = "CROWD SHIFT: Crowd is FADING. You're losing the floor." }
    }
    $script:crowdLabel.Text = "Crowd: $($script:crowd)%  Hype: $($script:crowdMomentum)%  $crowdMood"
    $script:crowdBar.Value = [Math]::Min(100, [Math]::Max(0, $script:crowd))

    if ($script:isPaused) {
        $script:assistLabel.Text = 'Paused. Tap P or Space to drop back in.'
        $script:assistLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
    }
    elseif ($script:crowd -le 25) {
        $script:assistLabel.Text = 'CLUTCH WINDOW: timing opens up and clean hits recover more crowd.'
        $script:assistLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 165, 86)
    }
    elseif ($script:combo -ge 18) {
        $script:assistLabel.Text = 'FLOW STATE: stacked combo is feeding denser burst patterns.'
        $script:assistLabel.ForeColor = [System.Drawing.Color]::FromArgb(86, 255, 208)
    }
    else {
        $script:assistLabel.Text = 'Keep combo alive to wake the room up.'
        $script:assistLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
    }
}

function End-Set([string]$message) {
    $script:running = $false
    $script:isPaused = $false
    $script:overlayLabel.Visible = $false
    $script:frameTimer.Stop()
    $script:clockTimer.Stop()
    $script:spawnTimer.Stop()
    $script:status.Text = $message
    $script:recapLabel.Text = "Last set: score $($script:score), phase $($script:phase), crowd $($script:crowd)%, rank $(Get-SetTitle $script:score $script:phase $script:crowd)"
    $script:startButton.Text = 'Restart Set'
    Save-Progress
    Update-Hud
    $script:form.Refresh()
    $boxTitle = if ($script:timeLeft -le 0) { 'Set Survived!' } else { 'Set Over' }
    $rankLine = Get-SetTitle $script:score $script:phase $script:crowd
    [System.Windows.Forms.MessageBox]::Show("Score: $($script:score)`r`nPhase reached: $($script:phase)`r`nCrowd: $($script:crowd)%`r`nRank: $rankLine", $boxTitle) | Out-Null
}

function Flash-Lane([int]$lane, [bool]$success) {
    if ($lane -lt 0 -or $lane -ge $script:lanes.Count) { return }

    $laneIndex = $lane
    $accentColor = if ($success) { $script:colors[$laneIndex] } else { [System.Drawing.Color]::FromArgb(255, 90, 90) }
    $flashColor = [System.Drawing.Color]::FromArgb(
        [int][Math]::Min(255, 28 + [int]($accentColor.R * 0.35)),
        [int][Math]::Min(255, 28 + [int]($accentColor.G * 0.35)),
        [int][Math]::Min(255, 28 + [int]($accentColor.B * 0.35))
    )

    $script:lanes[$laneIndex].BackColor = $flashColor
    $script:keyHintLabels[$laneIndex].ForeColor = $accentColor

    if ($null -ne $script:laneFlashResetTimers[$laneIndex]) {
        $script:laneFlashResetTimers[$laneIndex].Stop()
        $script:laneFlashResetTimers[$laneIndex].Dispose()
    }

    $resetTimer = New-Object System.Windows.Forms.Timer
    $resetTimer.Interval = 90
    $resetTimer.Add_Tick({
        $script:lanes[$laneIndex].BackColor = $script:laneBaseColor
        $script:keyHintLabels[$laneIndex].ForeColor = $script:colors[$laneIndex]
        $resetTimer.Stop()
        $resetTimer.Dispose()
        $script:laneFlashResetTimers[$laneIndex] = $null
    })
    $script:laneFlashResetTimers[$laneIndex] = $resetTimer
    $resetTimer.Start()
}

function Apply-FailurePenalty([int]$crowdLoss, [int]$scoreLoss, [int]$momentumLoss) {
    $assistState = Get-CrowdAssistState
    $penaltyScale = if ($assistState.Critical) { 0.72 } elseif ($assistState.Warning) { 0.86 } else { 1.0 }

    $script:combo = 0
    $script:perfectStreak = 0
    $script:crowdMomentum = [Math]::Max(0, $script:crowdMomentum - [int][Math]::Ceiling($momentumLoss * $penaltyScale))
    $script:crowd = [Math]::Max(0, $script:crowd - [int][Math]::Ceiling($crowdLoss * $penaltyScale))
    $script:score = [Math]::Max(0, $script:score - [int][Math]::Ceiling($scoreLoss * $penaltyScale))
}

function Apply-ClutchRecovery {
    $assistState = Get-CrowdAssistState
    if (-not $assistState.Warning) { return }

    $crowdGain = if ($assistState.Critical) { 5 } else { 2 }
    $momentumGain = if ($assistState.Critical) { 6 } else { 3 }
    $script:crowd = [Math]::Min(100, $script:crowd + $crowdGain)
    $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + $momentumGain)

    if ($assistState.Critical -and ($script:combo % 4) -eq 0 -and $script:combo -gt 0) {
        $script:status.Text = 'CLUTCH SAVE: the room bit back. Keep the rescue run going.'
    }
}

function Start-NewSet {
    foreach ($timer in $script:laneFlashResetTimers) {
        if ($null -ne $timer) {
            $timer.Stop()
            $timer.Dispose()
        }
    }
    $script:laneFlashResetTimers = @($null, $null, $null, $null)
    for ($laneIndex = 0; $laneIndex -lt $script:lanes.Count; $laneIndex++) {
        $script:lanes[$laneIndex].BackColor = $script:laneBaseColor
        $script:keyHintLabels[$laneIndex].ForeColor = $script:colors[$laneIndex]
    }

    $script:notes.Clear()
    $script:score = 0
    $script:combo = 0
    $script:timeLeft = 60
    $script:crowd = 65
    $script:phase = 1
    $script:spawnBudget = 0
    $script:beatsCleared = 0
    $script:perfectStreak = 0
    $script:crowdMomentum = 0
    $script:multiplier = 1
    $script:lastCrowdMood = ''
    $script:lastShockTime = -999
    $script:running = $true
    $script:isPaused = $false
    $script:phaseLabel.Text = 'Phase 1: warm-up riot'
    $script:judgementLabel.Text = 'Judgement: --'
    $script:judgementLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
    $script:status.Text = 'The ugly little club is ready. Hold the floor together.'
    $script:recapLabel.Text = 'Last set: active mix'
    $script:startButton.Text = 'Pause Set'
    $script:overlayLabel.Visible = $false
    Update-Hud
    Draw-Notes
    $script:frameTimer.Stop(); $script:frameTimer.Start()
    $script:clockTimer.Stop(); $script:clockTimer.Start()
    $script:spawnTimer.Stop(); $script:spawnTimer.Start()
}

function Toggle-Pause {
    if (-not $script:running) { return }

    if ($script:isPaused) {
        $script:isPaused = $false
        $script:overlayLabel.Visible = $false
        $script:startButton.Text = 'Pause Set'
        $script:status.Text = 'Set resumed. The room is watching your first step back in.'
        $script:frameTimer.Start()
        $script:clockTimer.Start()
        $script:spawnTimer.Start()
    }
    else {
        $script:isPaused = $true
        $script:overlayLabel.Text = 'PAUSED'
        $script:overlayLabel.Visible = $true
        $script:startButton.Text = 'Resume Set'
        $script:status.Text = 'Set paused. Breathe, then dive back in.'
        $script:frameTimer.Stop()
        $script:clockTimer.Stop()
        $script:spawnTimer.Stop()
    }

    Update-Hud
}

function Update-Phase {
    $phaseIndex = [Math]::Min(4, 1 + [int][Math]::Floor((60 - $script:timeLeft) / 15))
    if ($phaseIndex -ne $script:phase) {
        $script:phase = $phaseIndex
        $script:score += 18 + ($script:phase * 6)
        $script:crowd = [Math]::Min(100, $script:crowd + 6)
        switch ($script:phase) {
            1 { $script:phaseLabel.Text = 'Phase 1: warm-up riot' }
            2 { $script:phaseLabel.Text = 'Phase 2: sticky chorus' }
            3 { $script:phaseLabel.Text = 'Phase 3: panic bridge' }
            4 {
                $script:phaseLabel.Text = 'Phase 4: encore fire'
                $script:crowd = [Math]::Min(100, $script:crowd + 12)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 15)
            }
        }
        if ($script:phase -eq 4) {
            $script:status.Text = 'FINALE ENGAGE: The booth is LIVE. Everything matters now.'
        }
        else {
            $script:status.Text = "Phase $($script:phase) started. The room wants more precision."
        }
    }
}

function Spawn-PatternBeat {
    $phasePatterns = $script:patternSets[[Math]::Min($script:patternSets.Count - 1, $script:phase - 1)]
    $beat = $phasePatterns[$script:beatsCleared % $phasePatterns.Count]

    $lanesToSpawn = New-Object System.Collections.Generic.List[int]
    foreach ($lane in $beat) {
        if (-not $lanesToSpawn.Contains([int]$lane)) {
            $lanesToSpawn.Add([int]$lane)
        }
    }

    if ($script:phase -ge 2 -and $script:rng.NextDouble() -lt 0.24) {
        foreach ($lane in $beat) {
            $mirrored = 3 - [int]$lane
            if (-not $lanesToSpawn.Contains($mirrored)) {
                $lanesToSpawn.Add($mirrored)
            }
        }
    }

    if ($script:phase -ge 3 -and $script:rng.NextDouble() -lt 0.18) {
        $rollLane = $script:rng.Next(0, 4)
        if (-not $lanesToSpawn.Contains($rollLane)) {
            $lanesToSpawn.Add($rollLane)
        }
        $neighborLane = [Math]::Min(3, $rollLane + 1)
        if (-not $lanesToSpawn.Contains($neighborLane)) {
            $lanesToSpawn.Add($neighborLane)
        }
    }

    foreach ($lane in $lanesToSpawn) {
        Add-Note -lane $lane
    }

    if ($script:phase -ge 3 -and $script:rng.NextDouble() -lt 0.42) {
        $randomLane = $script:rng.Next(0, 4)
        if (-not $lanesToSpawn.Contains($randomLane)) {
            Add-Note -lane $randomLane
        }
    }

    if ($script:phase -ge 4 -and $script:rng.NextDouble() -lt 0.12) {
        $flamLane = $script:rng.Next(0, 4)
        Add-Note -lane $flamLane -startY -42 -speedBoost 2
    }

    if ($script:phase -ge 4 -and $script:combo -ge 18 -and $script:rng.NextDouble() -lt 0.22) {
        Add-Note -lane ($script:rng.Next(0, 2)) -speedBoost 4
        Add-Note -lane ($script:rng.Next(2, 4)) -speedBoost 4
        $script:crowd = [Math]::Min(100, $script:crowd + 8)
        $script:status.Text = 'SURPRISE BURST: Combo surge triggered rapid-fire!'
    }

    if ($script:phase -ge 3 -and $script:crowdMomentum -ge 80 -and ($script:lastShockTime - $script:timeLeft) -ge 12) {
        if ($script:rng.NextDouble() -lt 0.15) {
            Add-Note -lane ($script:rng.Next(0, 4)) -speedBoost 3
            Add-Note -lane ($script:rng.Next(0, 4)) -speedBoost 3
            $script:lastShockTime = $script:timeLeft
            $script:status.Text = 'SHOCK EVENT: Crowd demand spike - hold fast!'
        }
    }

    if ($script:phase -ge 3 -and $script:crowdMomentum -ge 55 -and $script:rng.NextDouble() -lt 0.14) {
        $echoLane = $script:rng.Next(0, 4)
        Add-Note -lane $echoLane -startY -18 -speedBoost 1
    }

    if ($script:phase -ge 4 -and $script:timeLeft -le 20) {
        if ($script:rng.NextDouble() -lt 0.28) {
            Add-Note -lane ($script:rng.Next(0, 4)) -speedBoost 5
            Add-Note -lane ($script:rng.Next(0, 4)) -speedBoost 5
            $script:crowd = [Math]::Min(100, $script:crowd + 5)
            $script:status.Text = 'FINALE SPIKE: The room wants carnage. Go berserk.'
        }

        if ($script:phase -ge 4 -and $script:timeLeft -le 3 -and $script:combo -ge 15 -and $script:rng.NextDouble() -lt 0.08) {
            Add-Note -lane ($script:rng.Next(0, 4)) -speedBoost 6
            $script:crowd = [Math]::Min(100, $script:crowd + 10)
            $script:status.Text = 'FINAL GASP: One last burst from the room!'
        }
    }

    $script:beatsCleared += 1
}

function Set-JudgementDisplay([string]$judgement, [System.Drawing.Color]$color) {
    if ($null -ne $script:judgementResetTimer) {
        $script:judgementResetTimer.Stop()
        $script:judgementResetTimer.Dispose()
    }
    $script:judgementLabel.Text = "Judgement: $judgement"
    $script:judgementLabel.ForeColor = $color
    $script:judgementResetTimer = New-Object System.Windows.Forms.Timer
    $script:judgementResetTimer.Interval = 350
    $script:judgementResetTimer.Add_Tick({
        $script:judgementLabel.Text = 'Judgement: --'
        $script:judgementLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
        $script:judgementResetTimer.Stop()
        $script:judgementResetTimer.Dispose()
        $script:judgementResetTimer = $null
    })
    $script:judgementResetTimer.Start()
}

function Handle-Hit([int]$lane) {
    if (-not $script:running -or $script:isPaused) { return }

    $candidate = $script:notes | Where-Object { $_.Lane -eq $lane } | Sort-Object { [Math]::Abs($_.Y - 516) } | Select-Object -First 1
    if ($null -ne $candidate) {
        # Ignore taps when the note is still in the upper half of the lane - this is
        # most likely a stray input and should not break the flow.
        if ($candidate.Y -lt 280) { return }

        $offset = [int]($candidate.Y - 516)
        $distance = [Math]::Abs($offset)
        $windows = Get-HitWindows
        $hitWindow = [int]$windows.Hit
        $perfectWindow = [int]$windows.Perfect
        $greatWindow = [int]$windows.Great

        if ($distance -le $hitWindow) {
            $script:notes.Remove($candidate) | Out-Null
            $script:combo += 1
            Flash-Lane -lane $lane -success $true

            $bonus = 0
            if ($distance -le $perfectWindow) {
                Set-JudgementDisplay ("PERFECT  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(86, 255, 208))
                $bonus = 22
                $script:perfectStreak += 1
                $script:crowd = [Math]::Min(100, $script:crowd + 6)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 9)
            }
            elseif ($distance -le $greatWindow) {
                Set-JudgementDisplay ("GREAT  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(255, 214, 108))
                $bonus = 14
                $script:perfectStreak = 0
                $script:crowd = [Math]::Min(100, $script:crowd + 4)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 6)
            }
            else {
                if ($offset -lt 0) {
                    Set-JudgementDisplay ("EARLY  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(255, 165, 86))
                }
                else {
                    Set-JudgementDisplay ("LATE  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(255, 165, 86))
                }
                $bonus = 10
                $script:perfectStreak = 0
                $script:crowd = [Math]::Min(100, $script:crowd + 3)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 3)
            }

            Apply-ClutchRecovery

            if ($script:perfectStreak -ge 6) {
                $script:crowd = [Math]::Min(100, $script:crowd + 4)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 8)
                $script:status.Text = 'Crowd surge. The room is chanting your timing.'
            }
            elseif (($script:combo % 12) -eq 0 -and $script:combo -gt 0) {
                $script:crowd = [Math]::Min(100, $script:crowd + 3)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 5)
                $script:status.Text = 'Combo pulse. You pulled the floor back in sync.'
            }

            Update-Multiplier
            $assistState = Get-CrowdAssistState
            $clutchScore = if ($assistState.Critical) { 10 } elseif ($assistState.Warning) { 4 } else { 0 }
            $baseScore = 12 + $bonus + ([int][Math]::Floor($script:combo * 1.7)) + ($script:phase * 4) + $clutchScore
            $script:score += [int]($baseScore * $script:multiplier)
        }
        else {
            Flash-Lane -lane $lane -success $false
            Apply-FailurePenalty -crowdLoss (8 + ($script:phase * 2)) -scoreLoss (8 + ($script:phase * 2)) -momentumLoss (14 + $script:phase)
            if ($offset -lt 0) {
                Set-JudgementDisplay ("TOO EARLY  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(255, 90, 90))
                $script:status.Text = 'Jumped the beat. The booth started to boo.'
            }
            else {
                Set-JudgementDisplay ("TOO LATE  {0}" -f $distance) ([System.Drawing.Color]::FromArgb(255, 90, 90))
                $script:status.Text = 'Dragged behind. The booth started to boo.'
            }
        }
    }
    else {
        Flash-Lane -lane $lane -success $false
        Apply-FailurePenalty -crowdLoss (9 + ($script:phase * 2)) -scoreLoss (9 + ($script:phase * 2)) -momentumLoss (16 + $script:phase)
        Set-JudgementDisplay 'MISS' ([System.Drawing.Color]::FromArgb(255, 90, 90))
        $script:status.Text = 'Whiff. The crowd lost the beat.'
    }

    Draw-Notes
    Update-Hud

    if ($script:crowd -le 0) {
        End-Set 'The floor emptied. Trashfire cancelled early.'
    }
}
