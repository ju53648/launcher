function New-GraveyardShiftState {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Paths
    )

    return @{
        Score = 0
        Lives = 3
        TimeLeft = 45
        FinalRushTriggered = $false
        Running = $false
        Rng = [System.Random]::new()
        GhostButtons = New-Object System.Collections.Generic.List[System.Windows.Forms.Button]
        Paths = $Paths
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
    } elseif ($State.Lives -le 2) {
        [System.Drawing.Color]::FromArgb(255, 160, 40)
    } else {
        [System.Drawing.Color]::White
    }
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

    $ghost = New-Object System.Windows.Forms.Button
    $ghost.FlatStyle = 'Flat'
    $ghost.Size = New-Object System.Drawing.Size(70, 70)
    $ghost.Location = New-Object System.Drawing.Point($State.Rng.Next(18, 610), $State.Rng.Next(18, 430))
    $ghost.Text = if ($State.Rng.NextDouble() -lt 0.22) { 'HEX' } else { 'GHO' }
    if ($ghost.Text -eq 'HEX') {
        $ghost.BackColor = [System.Drawing.Color]::FromArgb(255, 110, 110)
    }
    else {
        $ghost.BackColor = [System.Drawing.Color]::FromArgb(198, 235, 255)
        if ($State.Rng.NextDouble() -lt 0.05) {
            $ghost.Text = 'PGT'
            $ghost.BackColor = [System.Drawing.Color]::FromArgb(255, 100, 200)
        }
    }

    $ghost.Add_Click({
            if (-not $State.Running) { return }
            if ($ghost.Text -eq 'HEX') {
                $State.Lives -= 1
                $Ui.Status.Text = 'Wrong grave. Something answered back.'
                if ($State.Lives -le 0) { $State.Running = $false }
            }
            else {
                $State.Score += 14
                $Ui.Status.Text = 'The lantern line held.'
                if ($ghost.Text -eq 'PGT') {
                    $State.Score += 32
                    $Ui.Status.Text = 'Poltergeist burst! Ancient mischief dispersed!'
                }
            }
            $Ui.Yard.Controls.Remove($ghost)
            $State.GhostButtons.Remove($ghost) | Out-Null
            Update-GraveyardShiftHud -State $State -Ui $Ui
        })

    $State.GhostButtons.Add($ghost)
    $Ui.Yard.Controls.Add($ghost)
}

function Reset-GraveyardShiftRound {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,
        [Parameter(Mandatory = $true)]
        [hashtable]$Ui,
        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Timer]$SpawnTimer,
        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Timer]$GameTimer
    )

    $SpawnTimer.Stop()
    $GameTimer.Stop()

    foreach ($ghost in $State.GhostButtons.ToArray()) {
        $Ui.Yard.Controls.Remove($ghost)
        $State.GhostButtons.Remove($ghost) | Out-Null
    }

    $State.Score = 0
    $State.Lives = 3
    $State.TimeLeft = 45
    $State.FinalRushTriggered = $false
    $SpawnTimer.Interval = 700
    $State.Running = $true
    $Ui.StartButton.Enabled = $false
    $Ui.Status.Text = 'The bell rang. Start clicking.'

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
    $spawnTimer.Interval = 700
    $spawnTimer.Add_Tick({
            $ghostCap = if ($state.FinalRushTriggered) { 8 } else { 6 }
            if ($state.GhostButtons.Count -lt $ghostCap) {
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
            $justAnnouncedRush = $false
            if (-not $state.FinalRushTriggered -and $state.TimeLeft -le 15) {
                $state.FinalRushTriggered = $true
                $spawnTimer.Interval = 480
                $ui.Status.Text = 'Final rush. The graveyard is waking up.'
                $justAnnouncedRush = $true
            }

            $escaped = 0
            $hexEscaped = 0
            foreach ($ghost in $state.GhostButtons.ToArray()) {
                if ($state.Rng.NextDouble() -lt 0.3) {
                    $ui.Yard.Controls.Remove($ghost)
                    $state.GhostButtons.Remove($ghost) | Out-Null
                    if ($ghost.Text -ne 'HEX') {
                        $state.Lives -= 1
                        $escaped++
                        if ($state.Lives -le 0) { break }
                    } else {
                        $hexEscaped++
                    }
                }
            }
            if ($escaped -gt 0 -and -not $justAnnouncedRush) {
                $ui.Status.Text = if ($escaped -eq 1) { 'A lantern went dark.' } else { "$escaped lanterns went dark." }
            } elseif ($hexEscaped -gt 0 -and $escaped -eq 0 -and -not $justAnnouncedRush) {
                $ui.Status.Text = 'A hex drifted away. Good instincts.'
            }

            Update-GraveyardShiftHud -State $state -Ui $ui
            if ($state.Lives -le 0 -or $state.TimeLeft -le 0) {
                $state.Running = $false
                $spawnTimer.Stop()
                $gameTimer.Stop()
                foreach ($ghost in $state.GhostButtons.ToArray()) {
                    $ui.Yard.Controls.Remove($ghost)
                    $state.GhostButtons.Remove($ghost) | Out-Null
                }
                $ui.StartButton.Enabled = $true
                $ui.StartButton.Text = 'Light Lanterns Again'
                $endReason = if ($state.Lives -le 0) { 'All lanterns extinguished.' } else { 'Time ran out.' }
                [System.Windows.Forms.MessageBox]::Show("$endReason`nScore: $($state.Score)", 'Graveyard Shift') | Out-Null
                $ui.Status.Text = 'All quiet now. Light lanterns to go again.'
            }
        })

    $ui.StartButton.Add_Click({
            Reset-GraveyardShiftRound -State $state -Ui $ui -SpawnTimer $spawnTimer -GameTimer $gameTimer
            $spawnTimer.Start()
            $gameTimer.Start()
        })

    [void]$ui.Form.ShowDialog()
}
