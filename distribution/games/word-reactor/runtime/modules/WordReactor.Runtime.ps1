function Register-WordReactorRuntime {
    $entryBox.Add_KeyDown({
        param($sender, $eventArgs)
        if ($eventArgs.KeyCode -eq 'Enter') {
            Submit-Word
            $eventArgs.SuppressKeyPress = $true
        }
    })

    $submitButton.Add_Click({ Submit-Word })

    $script:clockTimer = New-Object System.Windows.Forms.Timer
    $script:clockTimer.Interval = 1000
    $script:clockTimer.Add_Tick({
        if (-not $script:running) {
            return
        }

        $script:timeLeft -= 1
        if ($script:ventCooldown -gt 0) {
            $script:ventCooldown -= 1
        }

        $passiveHeatGain = 2 + [Math]::Floor($script:round / 2) + [Math]::Min(2, [Math]::Floor($script:streak / 5))
        if ($script:queue.Count -ge 2) {
            $queuePressure = [Math]::Floor(($script:queue[0].Length + $script:queue[1].Length) / 10)
            $passiveHeatGain += [Math]::Min(3, $queuePressure)
        }
        if ($script:timeLeft -le 15) {
            $passiveHeatGain = [Math]::Min(15, $passiveHeatGain + 7)
        }
        if ($script:round -ge 4 -and $rng.NextDouble() -lt 0.025) {
            $eventType = $rng.Next(0, 2)
            if ($eventType -eq 0) {
                $passiveHeatGain -= 3
                $status.Text = 'EVENT: Coolant Surge! Heat reduced.'
            }
            else {
                $passiveHeatGain += 4
                $status.Text = 'EVENT: Core instability spike!'
                if ($script:round -ge 5 -and $rng.NextDouble() -lt 0.005) {
                    $fluxPool = Get-WordPool
                    $extraWord = $fluxPool[$rng.Next(0, $fluxPool.Count)]
                    $script:queue.Add($extraWord)
                    $passiveHeatGain += 6
                    $script:score += 12
                    $status.Text = 'EVENT: Flux Cascade! Queue extended, core temperature spiked.'
                }
            }
        }
        $script:heat = [Math]::Min(100, $script:heat + $passiveHeatGain)

        if ($script:timeLeft % 10 -eq 0 -and $null -eq $script:specialEventActive) {
            $status.Text = 'Heat spike. The queue is accelerating.'
        }

        Update-Hud

        if ($script:timeLeft -le 0) {
            End-Game 'Shift complete. The reactor survived on borrowed seconds.'
        }
        elseif ($script:heat -ge 100) {
            End-Game 'Meltdown. The core outran your command queue.'
        }
    })

    $startButton.Add_Click({ Start-Run })
}

function Start-WordReactorRuntime {
    Load-BestScore
    Register-WordReactorRuntime
    Refresh-QueueDisplay
    Update-Hud
    [void]$form.ShowDialog()
}
