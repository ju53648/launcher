function Get-WordPool {
    if ($script:round -ge 5) {
        return $wordPools[3]
    }
    if ($script:round -ge 3) {
        return $wordPools[2]
    }
    return $wordPools[1]
}

function Get-NextWord {
    $pool = Get-WordPool
    return $pool[$rng.Next(0, $pool.Count)]
}

function Fill-Queue {
    while ($script:queue.Count -lt 3) {
        $script:queue.Add((Get-NextWord))
    }
}

function Update-EntryFeedback {
    if (-not $entryBox) {
        return
    }

    $entryBox.BackColor = $script:defaultEntryBackColor
    $entryBox.ForeColor = $script:defaultEntryForeColor
    $activeWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(88, 255, 214)

    if (-not $script:running -or $script:queue.Count -eq 0) {
        $signalLabel.Text = 'Trace monitor: standby'
        return
    }

    $typed = $entryBox.Text.ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($typed)) {
        $signalLabel.Text = 'Trace monitor: ready for next command'
        return
    }

    $targetWord = $script:queue[0]
    if ($targetWord.StartsWith($typed, [System.StringComparison]::OrdinalIgnoreCase)) {
        $matchedCount = $typed.Length
        $entryBox.BackColor = [System.Drawing.Color]::FromArgb(230, 255, 245)
        $entryBox.ForeColor = [System.Drawing.Color]::FromArgb(17, 65, 49)
        if ($matchedCount -ge $targetWord.Length) {
            $signalLabel.Text = "Trace monitor: exact lock on $($targetWord.ToUpperInvariant()). Commit now."
            $activeWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 230, 156)
        }
        else {
            $nextCharacter = $targetWord.Substring($matchedCount, 1).ToUpperInvariant()
            $signalLabel.Text = "Trace monitor: lock $matchedCount/$($targetWord.Length)  |  next: $nextCharacter"
        }
        return
    }

    $mismatchIndex = 0
    $comparisonLength = [Math]::Min($typed.Length, $targetWord.Length)
    while ($mismatchIndex -lt $comparisonLength -and $typed[$mismatchIndex] -eq $targetWord[$mismatchIndex]) {
        $mismatchIndex += 1
    }

    $expectedCharacter = if ($mismatchIndex -lt $targetWord.Length) {
        $targetWord.Substring($mismatchIndex, 1).ToUpperInvariant()
    }
    else {
        'END'
    }

    $entryBox.BackColor = [System.Drawing.Color]::FromArgb(255, 234, 236)
    $entryBox.ForeColor = [System.Drawing.Color]::FromArgb(104, 26, 36)
    $activeWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 156, 108)
    $signalLabel.Text = "Trace monitor: drift at slot $($mismatchIndex + 1). Expected $expectedCharacter."
}

function Refresh-QueueDisplay {
    Fill-Queue
    $activeWordLabel.Text = $script:queue[0].ToUpperInvariant()
    $preview = @()
    for ($index = 1; $index -lt $script:queue.Count; $index++) {
        $preview += $script:queue[$index].ToUpperInvariant()
    }
    $queueWordLabel.Text = "QUEUE: " + ($preview -join '  |  ')
    $roundLabel.Text = "Round $($script:round) objective: $($script:roundGoal) clean commits  |  Completed: $($script:correctThisRound)"
    Update-EntryFeedback
}

function Update-Hud {
    $ventDisplay = if ($script:ventCooldown -eq 0) { 'VENT:RDY' } else { "VentCD:$($script:ventCooldown)s" }
    $directiveDisplay = if ($null -eq $script:specialEventActive) {
        'Directive: none'
    }
    else {
        "Directive: $($script:specialEventActive.Name) [$($script:specialEventActive.Remaining)]"
    }
    $hud.Text = "Score: $($script:score)    Time: $($script:timeLeft)s    Heat: $($script:heat)%    Streak: $($script:streak)    Round: $($script:round)    Obj: $($script:correctThisRound)/$($script:roundGoal)    $ventDisplay    $directiveDisplay"
    $heatLabel.Text = "Heat: $($script:heat)%"
    $heatBar.Value = [Math]::Min(100, [Math]::Max(0, $script:heat))

    if ($script:heat -ge 80) {
        $heatBar.ForeColor = [System.Drawing.Color]::FromArgb(255, 68, 68)
        $heatLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 68, 68)
    } elseif ($script:heat -ge 50) {
        $heatBar.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
        $heatLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
    } else {
        $heatBar.ForeColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
        $heatLabel.ForeColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
    }
}
