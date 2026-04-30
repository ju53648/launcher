function End-Game([string]$reason) {
    $script:running = $false
    $script:clockTimer.Stop()
    Save-BestScore
    $status.Text = $reason
    $recapLabel.Text = "Last run: score $($script:score), round $($script:round), heat $($script:heat)%, rank $(Get-ReactorTitle $script:score $script:round)"
    $startButton.Text = 'Restart Reactor'
    $form.Refresh()
    [System.Windows.Forms.MessageBox]::Show("Final score: $($script:score)`r`nRound reached: $($script:round)", 'Word Reactor') | Out-Null
}

function Advance-Round {
    $script:round += 1
    $script:correctThisRound = 0
    $script:roundGoal = [Math]::Min(15, 6 + [Math]::Ceiling([Math]::Pow($script:round, 1.3)))
    $script:timeLeft += [Math]::Max(7, 13 - $script:round)
    $script:heat = [Math]::Max(0, $script:heat - [Math]::Max(10, 24 - ($script:round * 2)))
    $script:score += 18 + ($script:round * 5)
    $status.Text = "Round $($script:round) unlocked. Queue complexity increasing."
    Refresh-QueueDisplay
    Update-Hud
}

function Start-Run {
    $script:score = 0
    $script:timeLeft = 75
    $script:streak = 0
    $script:heat = 18
    $script:round = 1
    $script:correctThisRound = 0
    $script:roundGoal = 6
    $script:ventCooldown = 0
    $script:specialEventActive = $null
    $script:queue.Clear()
    Fill-Queue
    Refresh-QueueDisplay
    Update-Hud
    $entryBox.Text = ''
    $status.Text = 'Containment live. Clear the command queue.'
    $recapLabel.Text = 'Last run: active containment'
    $script:running = $true
    $script:clockTimer.Start()
    $entryBox.Focus()
}

function Submit-Word {
    if (-not $script:running) {
        return
    }

    $typed = $entryBox.Text.Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($typed)) {
        return
    }

    if ($typed -eq 'flush') {
        $script:queue.RemoveAt(0)
        Fill-Queue
        $script:streak = 0
        $script:heat = [Math]::Min(100, $script:heat + 22)
        $status.Text = 'Queue flushed. Heat spiked hard.'
        $entryBox.Text = ''
        Refresh-QueueDisplay
        Update-Hud
        if ($script:heat -ge 100) {
            End-Game 'Flush overloaded the core. Meltdown.'
        }
        return
    }

    if ($typed -eq 'vent') {
        if ($script:ventCooldown -gt 0) {
            $status.Text = "Vent unavailable for $($script:ventCooldown)s."
        }
        else {
            $script:streak = 0
            $script:heat = [Math]::Max(0, $script:heat - [Math]::Min(32, 20 + ($script:round * 2)))
            $script:score = [Math]::Max(0, $script:score - 20)
            $script:ventCooldown = $script:ventCooldownMax
            $status.Text = 'Emergency vent executed. Heat dropped, score penalty applied.'
        }
        $entryBox.Text = ''
        Refresh-QueueDisplay
        Update-Hud
        return
    }

    if ($typed -eq 'gambit') {
        if ($script:queue.Count -gt 0) {
            $script:queue.RemoveAt(0)
            Fill-Queue
        }
        $script:streak = 0
        $gambitHeatCost = 16 + ($script:round * 3)
        $gambitScoreGain = 40 + ($script:round * 8)
        if ($script:heat -le 40) {
            $gambitScoreGain += 18
        }
        $script:score += $gambitScoreGain
        $script:heat = [Math]::Min(100, $script:heat + $gambitHeatCost)
        $status.Text = 'GAMBIT accepted: score surged, core stability worsened.'
        $entryBox.Text = ''
        Refresh-QueueDisplay
        Update-Hud
        if ($script:heat -ge 100) {
            End-Game 'Gambit caused an immediate thermal collapse.'
        }
        return
    }

    $targetWord = $script:queue[0]
    if ($typed -eq $targetWord) {
        $script:queue.RemoveAt(0)
        Fill-Queue
        $script:streak += 1
        $script:correctThisRound += 1
        $baseScore = ($targetWord.Length * 6) + ($script:streak * 3) + ($script:round * 4)
        $comboBonus = 0
        if ($script:round -ge 4 -and $script:streak % 5 -eq 0) {
            $comboBonus = [Math]::Floor($baseScore * 0.88)
            $status.Text = "COMBO SURGE: Milestone $($script:streak)! Score boost +88%."
        }
        else {
            $status.Text = 'Clean commit. Reactor pressure dropped.'
        }
        $script:score += $baseScore + $comboBonus
        $script:heat = [Math]::Max(0, $script:heat - (10 + [Math]::Min(8, $script:streak)))
        $script:challengeCounter += 1
        if ($script:round -ge 3 -and $script:challengeCounter -ge 3) {
            $eventPool = @('BONUS CHALLENGE: +25 pts per next 2 correct', 'POWER SURGE: Heat -8% for 4 correct', 'DEEP FREEZE: All words +1 length')
            $script:specialEventActive = $eventPool[$rng.Next(0, $eventPool.Count)]
            $status.Text = $script:specialEventActive
            $script:challengeCounter = 0
        }
        if ($script:correctThisRound -ge $script:roundGoal) {
            Advance-Round
        }
    }
    else {
        $script:streak = 0
        $script:score = [Math]::Max(0, $script:score - 14)
        $script:heat = [Math]::Min(100, $script:heat + [Math]::Min(18, 10 + ($script:round * 2)))
        $status.Text = "Mismatch: typed '$($typed.ToUpperInvariant())' -> needed $($targetWord.ToUpperInvariant())."
    }

    $entryBox.Text = ''
    Refresh-QueueDisplay
    Update-Hud

    if ($script:heat -ge 100) {
        End-Game 'Meltdown. The reactor core ran hotter than the queue could handle.'
    }
}
