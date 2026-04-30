function End-Game([string]$reason) {
    $script:running = $false
    $script:clockTimer.Stop()
    Save-BestScore
    $status.Text = $reason
    $recapLabel.Text = "Last run: score $($script:score), round $($script:round), heat $($script:heat)%, rank $(Get-ReactorTitle $script:score $script:round)"
    $startButton.Text = 'Restart Reactor'
    Update-EntryFeedback
    $form.Refresh()
    [System.Windows.Forms.MessageBox]::Show("Final score: $($script:score)`r`nRound reached: $($script:round)", 'Word Reactor') | Out-Null
}

function New-SpecialDirective([string]$name, [int]$remaining, [int]$bonusScore, [int]$heatRelief, [int]$timeBonus, [string]$statusText) {
    return [pscustomobject]@{
        Name = $name
        Remaining = $remaining
        BonusScore = $bonusScore
        HeatRelief = $heatRelief
        TimeBonus = $timeBonus
        StatusText = $statusText
    }
}

function Start-SpecialDirective {
    $directiveRoll = $rng.Next(0, 3)
    if ($directiveRoll -eq 0) {
        $script:specialEventActive = New-SpecialDirective 'Bonus Window' 2 25 0 0 'DIRECTIVE: Bonus Window armed. Next 2 clean commits gain +25 score.'
    }
    elseif ($directiveRoll -eq 1) {
        $script:specialEventActive = New-SpecialDirective 'Coolant Window' 3 0 8 0 'DIRECTIVE: Coolant Window live. Next 3 clean commits shed an extra 8 heat.'
    }
    else {
        $script:specialEventActive = New-SpecialDirective 'Time Bank' 2 0 0 2 'DIRECTIVE: Time Bank primed. Next 2 clean commits refund 2 seconds.'
    }

    $status.Text = $script:specialEventActive.StatusText
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
    $script:challengeCounter = 0
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
        $bonusMessages = New-Object System.Collections.Generic.List[string]
        if ($script:round -ge 4 -and $script:streak % 5 -eq 0) {
            $comboBonus = [Math]::Floor($baseScore * 0.88)
            $status.Text = "COMBO SURGE: Milestone $($script:streak)! Score boost +88%."
        }
        else {
            $status.Text = 'Clean commit. Reactor pressure dropped.'
        }
        $script:score += $baseScore + $comboBonus
        $baseHeatDrop = 10 + [Math]::Min(8, $script:streak)
        $script:heat = [Math]::Max(0, $script:heat - $baseHeatDrop)

        if ($targetWord.Length -ge 9 -or $targetWord.Contains(' ')) {
            $script:timeLeft += 1
            $bonusMessages.Add('+1s tempo refund')
        }

        if ($script:heat -ge 75) {
            $clutchCooling = 4 + [Math]::Min(4, [Math]::Floor($targetWord.Length / 2))
            $script:heat = [Math]::Max(0, $script:heat - $clutchCooling)
            $bonusMessages.Add("-$($clutchCooling)% clutch cooling")
        }

        if ($null -ne $script:specialEventActive) {
            if ($script:specialEventActive.BonusScore -gt 0) {
                $script:score += $script:specialEventActive.BonusScore
                $bonusMessages.Add("+$($script:specialEventActive.BonusScore) directive score")
            }
            if ($script:specialEventActive.HeatRelief -gt 0) {
                $script:heat = [Math]::Max(0, $script:heat - $script:specialEventActive.HeatRelief)
                $bonusMessages.Add("-$($script:specialEventActive.HeatRelief)% directive cooling")
            }
            if ($script:specialEventActive.TimeBonus -gt 0) {
                $script:timeLeft += $script:specialEventActive.TimeBonus
                $bonusMessages.Add("+$($script:specialEventActive.TimeBonus)s directive refund")
            }

            $directiveName = $script:specialEventActive.Name
            $script:specialEventActive.Remaining -= 1
            if ($script:specialEventActive.Remaining -le 0) {
                $script:specialEventActive = $null
                $bonusMessages.Add("$directiveName complete")
            }
        }

        $script:challengeCounter += 1
        if ($bonusMessages.Count -gt 0) {
            $status.Text = "$($status.Text)  " + ($bonusMessages -join '  |  ')
        }

        if ($script:round -ge 3 -and $script:challengeCounter -ge 3 -and $null -eq $script:specialEventActive) {
            Start-SpecialDirective
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
