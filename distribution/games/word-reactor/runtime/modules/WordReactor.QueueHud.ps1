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

function Refresh-QueueDisplay {
    Fill-Queue
    $activeWordLabel.Text = $script:queue[0].ToUpperInvariant()
    $preview = @()
    for ($index = 1; $index -lt $script:queue.Count; $index++) {
        $preview += $script:queue[$index].ToUpperInvariant()
    }
    $queueWordLabel.Text = "QUEUE: " + ($preview -join '  |  ')
    $roundLabel.Text = "Round $($script:round) objective: $($script:roundGoal) clean commits  |  Completed: $($script:correctThisRound)"
}

function Update-Hud {
    $ventDisplay = if ($script:ventCooldown -eq 0) { 'VENT:RDY' } else { "VentCD:$($script:ventCooldown)s" }
    $hud.Text = "Score: $($script:score)    Time: $($script:timeLeft)s    Heat: $($script:heat)%    Streak: $($script:streak)    Round: $($script:round)    Obj: $($script:correctThisRound)/$($script:roundGoal)    $ventDisplay"
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
