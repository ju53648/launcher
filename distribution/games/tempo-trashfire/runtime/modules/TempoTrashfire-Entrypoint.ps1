function Start-TempoTrashfireRuntime {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    [System.Windows.Forms.Application]::EnableVisualStyles()

    $script:runtimeRoot = $RuntimeRoot
    $script:savePath = Join-Path $script:runtimeRoot 'tempo-trashfire-save.json'

    Initialize-TempoTrashfireUi

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
    $script:bestScore = 0
    $script:bestPhase = 1
    $script:bestTitle = 'garage opener'
    $script:lastCrowdMood = ''
    $script:lastShockTime = -999
    $script:notes = New-Object System.Collections.Generic.List[object]
    $script:rng = [System.Random]::new()
    $script:running = $false
    $script:isPaused = $false

    $script:patternSets = @(
        @(@(0), @(1), @(2), @(3), @(1), @(2), @(0), @(3), @(2), @(0), @(3), @(1)),
        @(@(0,2), @(1), @(3), @(1,2), @(0), @(2), @(3), @(0,1), @(2,3), @(0), @(1,3), @(2)),
        @(@(0), @(2), @(1,3), @(0,2), @(1), @(3), @(0,1), @(2,3), @(0,3), @(1,2), @(0), @(3)),
        @(@(0,3), @(1), @(2), @(0,2), @(1,3), @(0), @(2,3), @(1,2), @(0,1,3), @(2), @(0,2,3), @(1))
    )

    if (Test-Path $script:savePath) {
        try {
            $saveData = Get-Content $script:savePath -Raw | ConvertFrom-Json
            $script:bestScore = [int]$saveData.bestScore
            $script:bestPhase = [int]$saveData.bestPhase
            if ($null -ne $saveData.bestTitle) {
                $script:bestTitle = [string]$saveData.bestTitle
            }
            $script:bestLabel.Text = "Best set: $($script:bestScore) score / phase $($script:bestPhase)"
            $script:titleLabel.Text = "Set title: $($script:bestTitle)"
        }
        catch {
        }
    }

    $script:form.Add_KeyDown({
        param($sender, $eventArgs)
        switch ($eventArgs.KeyCode) {
            'A' { Handle-Hit 0 }
            'S' { Handle-Hit 1 }
            'D' { Handle-Hit 2 }
            'F' { Handle-Hit 3 }
            'P' { Toggle-Pause }
            'Space' { Toggle-Pause }
            'R' { Start-NewSet }
            'Enter' {
                if (-not $script:running) {
                    Start-NewSet
                }
            }
        }
    })

    $script:frameTimer = New-Object System.Windows.Forms.Timer
    $script:frameTimer.Interval = 40
    $script:frameTimer.Add_Tick({
        if (-not $script:running) { return }

        foreach ($note in $script:notes.ToArray()) {
            $note.Y += $note.Speed
            if ($note.Y -gt 558) {
                $script:notes.Remove($note) | Out-Null
                $script:combo = 0
                $script:perfectStreak = 0
                $script:crowdMomentum = [Math]::Max(0, $script:crowdMomentum - (12 + $script:phase))
                $script:crowd = [Math]::Max(0, $script:crowd - (8 + ($script:phase * 2)))
                $script:score = [Math]::Max(0, $script:score - (6 + $script:phase))
                Set-JudgementDisplay 'DROP' ([System.Drawing.Color]::FromArgb(255, 165, 86))
                $script:status.Text = 'Dropped beat. The dance floor flinched.'
            }
        }
        Draw-Notes
        Update-Hud

        if ($script:crowd -le 0) {
            End-Set 'The room went cold. Your set collapsed.'
        }
    })

    $script:spawnTimer = New-Object System.Windows.Forms.Timer
    $script:spawnTimer.Interval = 120
    $script:spawnTimer.Add_Tick({
        if (-not $script:running) { return }

        $script:spawnBudget += $script:spawnTimer.Interval
        $interval = Get-SpawnInterval
        while ($script:spawnBudget -ge $interval) {
            $script:spawnBudget -= $interval
            Spawn-PatternBeat
            $interval = Get-SpawnInterval
        }
    })

    $script:clockTimer = New-Object System.Windows.Forms.Timer
    $script:clockTimer.Interval = 1000
    $script:clockTimer.Add_Tick({
        if (-not $script:running) { return }
        $script:timeLeft -= 1
        $script:crowdMomentum = [Math]::Max(0, $script:crowdMomentum - 2)
        $passiveCrowdDrop = if ($script:crowdMomentum -ge 60) { 0 } elseif ($script:crowdMomentum -ge 30) { 1 } else { 2 }
        $script:crowd = [Math]::Max(0, $script:crowd - $passiveCrowdDrop)
        Update-Phase
        Update-Hud
        if ($script:timeLeft -le 0) {
            End-Set 'Encore survived. The room still smells like burnt speakers.'
        }
        elseif ($script:crowd -le 0) {
            End-Set 'The crowd bailed. No encore.'
        }
    })

    $script:startButton.Add_Click({
        if ($script:running) {
            Toggle-Pause
        }
        else {
            Start-NewSet
        }
    })

    [void]$script:form.ShowDialog()
}
