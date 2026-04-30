function Get-SetTitle([int]$score, [int]$phase, [int]$crowd) {
    if ($phase -ge 4 -and $crowd -ge 70 -and $score -ge 900) { return 'encore arsonist' }
    if ($phase -ge 4 -or $score -ge 700) { return 'club closer' }
    if ($phase -ge 3 -or $score -ge 450) { return 'chorus instigator' }
    return 'garage opener'
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

    $script:bestLabel.Text = "Best set: $($script:bestScore) score / phase $($script:bestPhase)"
    $script:titleLabel.Text = "Set title: $($script:bestTitle)"
    $payload = @{
        bestScore = $script:bestScore
        bestPhase = $script:bestPhase
        bestTitle = $script:bestTitle
    } | ConvertTo-Json
    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
}

function Get-SpawnInterval {
    switch ($script:phase) {
        1 { return 535 }
        2 { return 460 }
        3 { return 390 }
        default { return 340 }
    }
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
    return @{
        Hit = $baseHitWindow + $momentumAdjust
        Perfect = $basePerfectWindow
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
}

function End-Set([string]$message) {
    $script:running = $false
    $script:frameTimer.Stop()
    $script:clockTimer.Stop()
    $script:spawnTimer.Stop()
    $script:status.Text = $message
    $script:recapLabel.Text = "Last set: score $($script:score), phase $($script:phase), crowd $($script:crowd)%, rank $(Get-SetTitle $script:score $script:phase $script:crowd)"
    $script:startButton.Text = 'Restart Set'
    Save-Progress
    $script:form.Refresh()
    $boxTitle = if ($script:timeLeft -le 0) { 'Set Survived!' } else { 'Set Over' }
    $rankLine = Get-SetTitle $script:score $script:phase $script:crowd
    [System.Windows.Forms.MessageBox]::Show("Score: $($script:score)`r`nPhase reached: $($script:phase)`r`nCrowd: $($script:crowd)%`r`nRank: $rankLine", $boxTitle) | Out-Null
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
            $script:status.Text = 'SHOCK EVENT: Crowd demand spike — hold fast!'
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
    })
    $script:judgementResetTimer.Start()
}

function Handle-Hit([int]$lane) {
    if (-not $script:running) { return }

    $candidate = $script:notes | Where-Object { $_.Lane -eq $lane } | Sort-Object { [Math]::Abs($_.Y - 516) } | Select-Object -First 1
    if ($null -ne $candidate) {
        # Ignore taps when the note is still in the upper half of the lane — pressing
        # that early should not break a combo; it is almost certainly a stray input.
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
            $bonus = 0
            if ($distance -le $perfectWindow) {
                Set-JudgementDisplay 'PERFECT' ([System.Drawing.Color]::FromArgb(86, 255, 208))
                $bonus = 22
                $script:perfectStreak += 1
                $script:crowd = [Math]::Min(100, $script:crowd + 6)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 9)
            }
            elseif ($distance -le $greatWindow) {
                Set-JudgementDisplay 'GREAT' ([System.Drawing.Color]::FromArgb(255, 214, 108))
                $bonus = 14
                $script:perfectStreak = 0
                $script:crowd = [Math]::Min(100, $script:crowd + 4)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 6)
            }
            else {
                if ($offset -lt 0) {
                    Set-JudgementDisplay 'EARLY' ([System.Drawing.Color]::FromArgb(255, 165, 86))
                }
                else {
                    Set-JudgementDisplay 'LATE' ([System.Drawing.Color]::FromArgb(255, 165, 86))
                }
                $bonus = 10
                $script:perfectStreak = 0
                $script:crowd = [Math]::Min(100, $script:crowd + 3)
                $script:crowdMomentum = [Math]::Min(100, $script:crowdMomentum + 3)
            }

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
            # No fallback status overwrite — milestone and event messages stay visible.

            Update-Multiplier
            $baseScore = 12 + $bonus + ([int][Math]::Floor($script:combo * 1.7)) + ($script:phase * 4)
            $script:score += [int]($baseScore * $script:multiplier)
        }
        else {
            $script:combo = 0
            $script:perfectStreak = 0
            $script:crowdMomentum = [Math]::Max(0, $script:crowdMomentum - (14 + $script:phase))
            $script:crowd = [Math]::Max(0, $script:crowd - (8 + ($script:phase * 2)))
            $script:score = [Math]::Max(0, $script:score - (8 + ($script:phase * 2)))
            if ($offset -lt 0) {
                Set-JudgementDisplay 'TOO EARLY' ([System.Drawing.Color]::FromArgb(255, 90, 90))
                $script:status.Text = 'Jumped the beat. The booth started to boo.'
            }
            else {
                Set-JudgementDisplay 'TOO LATE' ([System.Drawing.Color]::FromArgb(255, 90, 90))
                $script:status.Text = 'Dragged behind. The booth started to boo.'
            }
        }
    }
    else {
        $script:combo = 0
        $script:perfectStreak = 0
        $script:crowdMomentum = [Math]::Max(0, $script:crowdMomentum - (16 + $script:phase))
        $script:crowd = [Math]::Max(0, $script:crowd - (9 + ($script:phase * 2)))
        $script:score = [Math]::Max(0, $script:score - (9 + ($script:phase * 2)))
        Set-JudgementDisplay 'MISS' ([System.Drawing.Color]::FromArgb(255, 90, 90))
        $script:status.Text = 'Whiff. The crowd lost the beat.'
    }
    Draw-Notes
    Update-Hud

    if ($script:crowd -le 0) {
        End-Set 'The floor emptied. Trashfire cancelled early.'
    }
}
