function Load-Floor([int]$floorNumber) {
    $layout = $layouts[[Math]::Min($layouts.Count - 1, $floorNumber - 1)]
    $script:floor = $floorNumber
    $script:collected = 0
    $script:alarm = [Math]::Max(0, [Math]::Min(50, [Math]::Floor(($floorNumber - 1) * 10 + 4)))
    $script:extractionTimer = -1
    $script:announcedExtraction = $false
    $script:smoke = [Math]::Max(1, 3 - [Math]::Floor(($floorNumber - 1) / 2))
    $script:intelCollected = $false
    $script:cameraGrace = if ($floorNumber -eq 1) { 1 } else { 0 }
    $script:cameraBypass = 0
    $script:zoneRule = if (($floorNumber % 2) -eq 0) {
        'Asymmetry active: west wing gives cover, east wing is exposed.'
    }
    else {
        ''
    }
    $walls.Clear()
    $cameras.Clear()
    $smokeTiles.Clear()
    $loot.Clear()
    $guards.Clear()
    $script:exit = $layout.Exit

    $playerParts = $layout.Player.Split(',')
    $player.Row = [int]$playerParts[0]
    $player.Col = [int]$playerParts[1]

    foreach ($wall in $layout.Walls) {
        [void]$walls.Add($wall)
    }
    foreach ($camera in $layout.Cameras) {
        [void]$cameras.Add($camera)
    }
    foreach ($lootTile in $layout.Loot) {
        $loot.Add($lootTile)
    }
    $script:intelTile = [string]$layout.Intel
    $script:floorModifier = [string]$layout.Modifier
    foreach ($guardSeed in $layout.Guards) {
        $guards.Add([pscustomobject]@{ Row = [int]$guardSeed.Row; Col = [int]$guardSeed.Col })
    }

    $floorLabel.Text = "Floor ${floorNumber}: $($layout.Name)"
    $status.Text = if ([string]::IsNullOrWhiteSpace($script:zoneRule)) {
        $script:floorModifier
    }
    else {
        "$($script:floorModifier) $($script:zoneRule)"
    }
    Update-Board
}

function Get-GuardMoveCount {
    if ($script:alarm -ge 85) {
        return 3
    }
    if ($script:alarm -ge 65) {
        return 2
    }
    return 1
}

function Get-GuardMoveTarget([int]$guardRow, [int]$guardCol) {
    $guardKey = "$guardRow,$guardCol"
    if ($smokeTiles.ContainsKey($guardKey)) {
        return $guardKey
    }

    $rowDelta = $player.Row - $guardRow
    $colDelta = $player.Col - $guardCol
    $candidateSteps = @()

    $isHighAlarm = $script:alarm -ge 60
    if ($isHighAlarm) {
        if ($rowDelta -ne 0) { $candidateSteps += ,@([Math]::Sign($rowDelta), 0) }
        if ($colDelta -ne 0) { $candidateSteps += ,@(0, [Math]::Sign($colDelta)) }
    }
    elseif ([Math]::Abs($rowDelta) -ge [Math]::Abs($colDelta)) {
        if ($rowDelta -ne 0) {
            $candidateSteps += ,@([Math]::Sign($rowDelta), 0)
        }
        if ($colDelta -ne 0) {
            $candidateSteps += ,@(0, [Math]::Sign($colDelta))
        }
    }
    else {
        if ($colDelta -ne 0) {
            $candidateSteps += ,@(0, [Math]::Sign($colDelta))
        }
        if ($rowDelta -ne 0) {
            $candidateSteps += ,@([Math]::Sign($rowDelta), 0)
        }
    }

    $candidateSteps += ,@(1,0)
    $candidateSteps += ,@(-1,0)
    $candidateSteps += ,@(0,1)
    $candidateSteps += ,@(0,-1)

    foreach ($step in $candidateSteps) {
        $nextRow = $guardRow + [int]$step[0]
        $nextCol = $guardCol + [int]$step[1]
        $nextKey = "$nextRow,$nextCol"
        if ($nextRow -lt 0 -or $nextRow -ge $size -or $nextCol -lt 0 -or $nextCol -ge $size) {
            continue
        }
        if ($walls.Contains($nextKey)) {
            continue
        }
        return $nextKey
    }

    return $guardKey
}

function Get-ProjectedThreatTiles {
    $threatTiles = New-Object System.Collections.Generic.HashSet[string]
    $moveCount = Get-GuardMoveCount

    foreach ($guard in $guards) {
        $guardRow = [int]$guard.Row
        $guardCol = [int]$guard.Col
        for ($stepIndex = 0; $stepIndex -lt $moveCount; $stepIndex++) {
            $nextKey = Get-GuardMoveTarget $guardRow $guardCol
            if ($nextKey -eq "$guardRow,$guardCol") {
                break
            }
            [void]$threatTiles.Add($nextKey)
            $parts = $nextKey.Split(',')
            $guardRow = [int]$parts[0]
            $guardCol = [int]$parts[1]
        }
    }

    return $threatTiles
}

function Move-Guard-Once([object]$guard) {
    $nextKey = Get-GuardMoveTarget ([int]$guard.Row) ([int]$guard.Col)
    $parts = $nextKey.Split(',')
    $guard.Row = [int]$parts[0]
    $guard.Col = [int]$parts[1]
}

function Move-Guards {
    foreach ($guard in $guards) {
        Move-Guard-Once $guard
    }

    if ($script:alarm -ge 65) {
        foreach ($guard in $guards) {
            Move-Guard-Once $guard
        }
    }

    # At critical alarm, guards move again (extreme pressure)
    if ($script:alarm -ge 85) {
        foreach ($guard in $guards) {
            Move-Guard-Once $guard
        }
    }
}

function Trigger-Cameras {
    $key = "$($player.Row),$($player.Col)"
    $cameraTriggered = $false
    $guardPressureTriggered = $false

    if ($cameras.Contains($key)) {
        if ($script:cameraBypass -gt 0) {
            $script:cameraBypass -= 1
            $status.Text = "Ghost pass burned. Camera trace spoofed clean ($($script:cameraBypass) left)."
            $cameraTriggered = $true
        }
        elseif ($script:cameraGrace -gt 0) {
            $script:cameraGrace -= 1
            $script:alarm = [Math]::Min(100, $script:alarm + 8)
            $status.Text = 'Glitchy camera sweep. You bought a softer trace.'
            $cameraTriggered = $true
        }
        else {
            $cameraHit = if ($script:floorModifier -like '*22 alarm*') { 22 } else { 18 }
            if (($script:floor % 2) -eq 0 -and $player.Col -ge 4) {
                $cameraHit += 4
            }
            if ((Get-Random -Minimum 0 -Maximum 100) -lt 8) {
                $script:alarm = [Math]::Min(100, $script:alarm + [Math]::Max(4, $cameraHit - 12))
                $status.Text = 'Rare camera desync. Feed jitters and your trace lands lighter.'
            }
            else {
                $script:alarm = [Math]::Min(100, $script:alarm + $cameraHit)
                $status.Text = 'Camera sweep. The building knows you are here.'
            }
            $cameraTriggered = $true
        }
    }
    $playerInSmoke = $smokeTiles.ContainsKey("$($player.Row),$($player.Col)")
    if (-not $playerInSmoke) {
        foreach ($guard in $guards) {
            $distance = [Math]::Abs($guard.Row - $player.Row) + [Math]::Abs($guard.Col - $player.Col)
            $pressureRange = if ($script:floor -ge 2) { 2 } else { 1 }
            if (($script:floor % 2) -eq 0 -and $player.Col -le 2) {
                $pressureRange = [Math]::Max(1, $pressureRange - 1)
            }
            # At high alarm, guards detect from further away and create more tension
            if ($script:alarm -ge 75) { $pressureRange = [Math]::Max(3, $pressureRange + 1) }
            if ($distance -le $pressureRange) {
                $alarmDelta = if ($distance -le 1) { 14 } else { 10 }
                $script:alarm = [Math]::Min(100, $script:alarm + $alarmDelta)
                $guardPressureTriggered = $true
            }
        }
    }

    $patrolHeat = 2
    if (($script:floor % 2) -eq 0) {
        if ($player.Col -le 2) {
            $patrolHeat = 1
        }
        elseif ($player.Col -ge 4) {
            $patrolHeat = 3
        }
    }
    if ($playerInSmoke) {
        $patrolHeat = [Math]::Max(0, $patrolHeat - 1)
    }

    $script:alarm = [Math]::Min(100, $script:alarm + $patrolHeat)

    if (-not $cameraTriggered -and -not $guardPressureTriggered -and $patrolHeat -le 1) {
        $status.Text = 'Quiet lane. You are moving under the building noise.'
    }
}

function End-Run([string]$message) {
    $script:running = $false
    $startButton.Text = 'Restart Job'
    $status.Text = $message
    $recapLabel.Text = "Last job: score $($script:score), floor $($script:floor), result: $message"
    Save-Progress
    [System.Windows.Forms.MessageBox]::Show($message + "`r`nScore: $($script:score)`r`nFloor: $($script:floor)", 'Pocket Heist') | Out-Null
}

function Drop-Smoke {
    if (-not $running) {
        return
    }
    if ($script:smoke -le 0) {
        $status.Text = 'Smoke exhausted: No cover available. Move tactically to avoid detection.'
        return
    }

    $key = "$($player.Row),$($player.Col)"
    $smokeDuration = if ($script:floorModifier -like '*only 2 turns*') { 2 } else { 3 }
    $smokeTiles[$key] = $smokeDuration
    $script:smoke -= 1
    $script:alarm = [Math]::Max(0, $script:alarm - 13)
    $status.Text = "Smoke dropped. Guards lose the line for $smokeDuration turn$(if ($smokeDuration -ne 1) { 's' })."
    Update-Board
}

function Start-Job {
    $script:running = $true
    $script:score = 0
    Load-Floor 1
    $status.Text = 'MISSION: Grab 3 loot | Collect intel for bypass | Reach EXIT | Avoid guards & cameras'
    $recapLabel.Text = 'Last job: active infiltration'
}

function Start-PocketHeistRuntime {
    $form.Add_KeyDown({
        param($sender, $eventArgs)
        switch ($eventArgs.KeyCode) {
            'Left'  { Handle-Move $player.Row ($player.Col - 1) }
            'Right' { Handle-Move $player.Row ($player.Col + 1) }
            'Up'    { Handle-Move ($player.Row - 1) $player.Col }
            'Down'  { Handle-Move ($player.Row + 1) $player.Col }
            'Space' { Drop-Smoke }
            'Enter' { Start-Job }
            'R'     { Start-Job }
        }
    })

    $startButton.Add_Click({
        Start-Job
    })

    Load-Floor 1
    [void]$form.ShowDialog()
}
