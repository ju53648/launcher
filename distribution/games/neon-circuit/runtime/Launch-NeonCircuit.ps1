Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$script:score = 0
$script:timeLeft = 60
$script:energy = 100
$script:combo = 0
$script:wave = 1
$script:pulse = 0
$script:surgeTicks = 0
$script:nearMissCooldown = 0
$script:gamePaused = $false
$script:feedbackTicks = 0
$script:feedbackColor = [System.Drawing.Color]::FromArgb(57, 255, 192)
$script:pulseBurstTicks = 0
$script:pulseBurstRadius = 0
$script:lastPulseHits = 0
$script:lastPulseDangerHits = 0
$script:comboMilestone = 0
$script:highScorePath = Join-Path $PSScriptRoot 'neon-circuit-save.json'

$themeBackground = [System.Drawing.Color]::FromArgb(10, 12, 26)
$panelBackground = [System.Drawing.Color]::FromArgb(18, 24, 52)
$accent = [System.Drawing.Color]::FromArgb(57, 255, 192)
$warning = [System.Drawing.Color]::FromArgb(255, 96, 91)
$chargeColor = [System.Drawing.Color]::FromArgb(94, 146, 255)
$resonanceColor = [System.Drawing.Color]::FromArgb(210, 114, 255)
$text = [System.Drawing.Color]::FromArgb(236, 241, 255)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Neon Circuit'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(980, 660)
$form.BackColor = $themeBackground
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.KeyPreview = $true

$title = New-Object System.Windows.Forms.Label
$title.Text = 'NEON CIRCUIT'
$title.ForeColor = $accent
$title.Font = New-Object System.Drawing.Font('Consolas', 22, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(24, 18)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Thread the rider through a live signal maze, chain bright gates, and stay ahead of the overload waves.'
$subtitle.ForeColor = $text
$subtitle.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(27, 60)
$form.Controls.Add($subtitle)

$hud = New-Object System.Windows.Forms.Panel
$hud.Size = New-Object System.Drawing.Size(270, 576)
$hud.Location = New-Object System.Drawing.Point(688, 52)
$hud.BackColor = $panelBackground
$form.Controls.Add($hud)

$scoreLabel = New-Object System.Windows.Forms.Label
$scoreLabel.Text = 'Score: 0'
$scoreLabel.ForeColor = $text
$scoreLabel.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$scoreLabel.AutoSize = $true
$scoreLabel.Location = New-Object System.Drawing.Point(20, 24)
$hud.Controls.Add($scoreLabel)

$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = 'Time: 60'
$timeLabel.ForeColor = $text
$timeLabel.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$timeLabel.AutoSize = $true
$timeLabel.Location = New-Object System.Drawing.Point(20, 68)
$hud.Controls.Add($timeLabel)

$energyLabel = New-Object System.Windows.Forms.Label
$energyLabel.Text = 'Grid Stability: 100%'
$energyLabel.ForeColor = $text
$energyLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$energyLabel.AutoSize = $true
$energyLabel.Location = New-Object System.Drawing.Point(20, 104)
$hud.Controls.Add($energyLabel)

$comboLabel = New-Object System.Windows.Forms.Label
$comboLabel.Text = 'Combo: 0'
$comboLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
$comboLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$comboLabel.AutoSize = $true
$comboLabel.Location = New-Object System.Drawing.Point(20, 140)
$hud.Controls.Add($comboLabel)

$waveLabel = New-Object System.Windows.Forms.Label
$waveLabel.Text = 'Wave: 1'
$waveLabel.ForeColor = $chargeColor
$waveLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$waveLabel.AutoSize = $true
$waveLabel.Location = New-Object System.Drawing.Point(20, 176)
$hud.Controls.Add($waveLabel)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best: 0'
$bestLabel.ForeColor = $accent
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(20, 212)
$hud.Controls.Add($bestLabel)

$recapLabel = New-Object System.Windows.Forms.Label
$recapLabel.Text = 'Last circuit: none yet'
$recapLabel.ForeColor = $text
$recapLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$recapLabel.AutoSize = $true
$recapLabel.MaximumSize = New-Object System.Drawing.Size(220, 0)
$recapLabel.Location = New-Object System.Drawing.Point(20, 238)
$hud.Controls.Add($recapLabel)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = 'Operator title: alley spark'
$titleLabel.ForeColor = $accent
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$titleLabel.AutoSize = $true
$titleLabel.MaximumSize = New-Object System.Drawing.Size(220, 0)
$titleLabel.Location = New-Object System.Drawing.Point(20, 262)
$hud.Controls.Add($titleLabel)

$pulseLabel = New-Object System.Windows.Forms.Label
$pulseLabel.Text = 'Pulse: 0 / 100'
$pulseLabel.ForeColor = $chargeColor
$pulseLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$pulseLabel.AutoSize = $true
$pulseLabel.Location = New-Object System.Drawing.Point(20, 288)
$hud.Controls.Add($pulseLabel)

$pulseBar = New-Object System.Windows.Forms.ProgressBar
$pulseBar.Location = New-Object System.Drawing.Point(20, 318)
$pulseBar.Size = New-Object System.Drawing.Size(220, 20)
$pulseBar.Maximum = 100
$pulseBar.Value = 0
$hud.Controls.Add($pulseBar)

$surgeLabel = New-Object System.Windows.Forms.Label
$surgeLabel.Text = 'Surge: stable'
$surgeLabel.ForeColor = $accent
$surgeLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$surgeLabel.AutoSize = $true
$surgeLabel.Location = New-Object System.Drawing.Point(20, 344)
$hud.Controls.Add($surgeLabel)

$helpLabel = New-Object System.Windows.Forms.Label
$helpLabel.Text = "Arrow keys move`r`nMint nodes = score + combo`r`nBlue nodes = pulse charge`r`nPurple diamonds = resonance bursts`r`nGold sparks = rare bonus picks`r`nRed contacts = board damage`r`nSpace detonates a pulse wave`r`nP pauses, Enter boots, R resets`r`nFull pulse drains harder - cash it out fast."
$helpLabel.ForeColor = $text
$helpLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$helpLabel.AutoSize = $true
$helpLabel.Location = New-Object System.Drawing.Point(20, 374)
$hud.Controls.Add($helpLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = 'Boot the grid, then ride the signal before the board cooks itself.'
$statusLabel.ForeColor = $accent
$statusLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.AutoSize = $true
$statusLabel.MaximumSize = New-Object System.Drawing.Size(220, 0)
$statusLabel.Location = New-Object System.Drawing.Point(20, 470)
$hud.Controls.Add($statusLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Boot Grid'
$startButton.Size = New-Object System.Drawing.Size(200, 42)
$startButton.Location = New-Object System.Drawing.Point(20, 526)
$startButton.BackColor = $accent
$startButton.FlatStyle = 'Flat'
$hud.Controls.Add($startButton)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'Scrub Circuit'
$resetButton.Size = New-Object System.Drawing.Size(200, 42)
$resetButton.Location = New-Object System.Drawing.Point(20, 576)
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(80, 94, 148)
$resetButton.ForeColor = $text
$resetButton.FlatStyle = 'Flat'
$hud.Controls.Add($resetButton)

$board = New-Object System.Windows.Forms.Panel
$board.Size = New-Object System.Drawing.Size(620, 576)
$board.Location = New-Object System.Drawing.Point(24, 52)
$board.BackColor = [System.Drawing.Color]::FromArgb(14, 18, 36)
$form.Controls.Add($board)

$rng = [System.Random]::new()
$player = New-Object psobject -Property @{ X = 280; Y = 250; Size = 24 }
$gates = New-Object System.Collections.Generic.List[object]
$script:gameActive = $false
$script:bestScore = 0
$bestTitle = 'back-alley spark'
$script:chargeStreak = 0

$modulesRoot = Join-Path $PSScriptRoot 'modules'
. (Join-Path $modulesRoot '01-ScorePersistence.ps1')
. (Join-Path $modulesRoot '02-GateLogic.ps1')
. (Join-Path $modulesRoot '03-GameFlow.ps1')

if (Test-Path $script:highScorePath) {
    try {
        $saveData = Get-Content $script:highScorePath -Raw | ConvertFrom-Json
        if ($null -ne $saveData.bestScore) {
            $script:bestScore = [int]$saveData.bestScore
            $bestLabel.Text = "Best: $script:bestScore"
        }
        if ($null -ne $saveData.bestTitle) {
            $bestTitle = [string]$saveData.bestTitle
            $titleLabel.Text = "Circuit title: $bestTitle"
        }
    }
    catch {
    }
}

$board.Add_Paint({
    param($sender, $eventArgs)

    $graphics = $eventArgs.Graphics
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(14, 18, 36))

    $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 49, 86), 1)
    for ($line = 0; $line -le 620; $line += 40) {
        $graphics.DrawLine($gridPen, $line, 0, $line, 576)
    }
    for ($line = 0; $line -le 576; $line += 40) {
        $graphics.DrawLine($gridPen, 0, $line, 620, $line)
    }

    foreach ($gate in $gates) {
        $color = $accent
        if ($gate.Type -eq 'danger') {
            $color = $warning
        }
        elseif ($gate.Type -eq 'charge') {
            $color = $chargeColor
        }
        elseif ($gate.Type -eq 'resonance') {
            $color = $resonanceColor
        }
           elseif ($gate.Type -eq 'spark') {
               $color = [System.Drawing.Color]::FromArgb(255, 200, 70)
           }
        $brush = New-Object System.Drawing.SolidBrush($color)
        if ($gate.Type -eq 'resonance') {
            $points = @(
                [System.Drawing.PointF]::new($gate.X + $gate.Size/2, $gate.Y - 2)
                [System.Drawing.PointF]::new($gate.X + $gate.Size + 2, $gate.Y + $gate.Size/2)
                [System.Drawing.PointF]::new($gate.X + $gate.Size/2, $gate.Y + $gate.Size + 2)
                [System.Drawing.PointF]::new($gate.X - 2, $gate.Y + $gate.Size/2)
            )
            $graphics.FillPolygon($brush, $points)
            $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, $color.R, $color.G, $color.B), 5)
            $graphics.DrawPolygon($glowPen, $points)
        }
           elseif ($gate.Type -eq 'spark') {
               $graphics.FillEllipse($brush, $gate.X, $gate.Y, $gate.Size, $gate.Size)
               $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, $color.R, $color.G, $color.B), 3)
               for ($i = 0; $i -lt 3; $i++) {
                   $rad = 4 + ($i * 3)
                   $graphics.DrawEllipse($glowPen, $gate.X - $rad, $gate.Y - $rad, $gate.Size + 2*$rad, $gate.Size + 2*$rad)
               }
           }
           else {
            $graphics.FillEllipse($brush, $gate.X, $gate.Y, $gate.Size, $gate.Size)
            $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(110, $color.R, $color.G, $color.B), 4)
           $graphics.DrawEllipse($glowPen, $gate.X - 4, $gate.Y - 4, $gate.Size + 8, $gate.Size + 8)
        }
    }

    if ($script:pulse -ge 100 -and $script:gameActive -and -not $script:gamePaused) {
        $pulseAuraPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, $chargeColor.R, $chargeColor.G, $chargeColor.B), 3)
        $graphics.DrawEllipse($pulseAuraPen, $player.X - 10, $player.Y - 10, $player.Size + 20, $player.Size + 20)
    }

    if ($script:pulseBurstTicks -gt 0) {
        $alpha = [Math]::Max(50, [Math]::Min(210, $script:pulseBurstTicks * 35))
        $burstPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($alpha, $chargeColor.R, $chargeColor.G, $chargeColor.B), 4)
        $radius = $script:pulseBurstRadius
        $graphics.DrawEllipse($burstPen, ($player.X + 12) - $radius, ($player.Y + 12) - $radius, $radius * 2, $radius * 2)
    }

    $playerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 242, 88))
    $graphics.FillRectangle($playerBrush, $player.X, $player.Y, $player.Size, $player.Size)
    $outlinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255), 2)
    $graphics.DrawRectangle($outlinePen, $player.X, $player.Y, $player.Size, $player.Size)

    if ($script:feedbackTicks -gt 0) {
        $overlayAlpha = [Math]::Min(120, $script:feedbackTicks * 16)
        $overlayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($overlayAlpha, $script:feedbackColor.R, $script:feedbackColor.G, $script:feedbackColor.B))
        $graphics.FillRectangle($overlayBrush, 0, 0, $board.Width, $board.Height)
    }

    if ($script:gamePaused) {
        $pauseBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 8, 10, 20))
        $graphics.FillRectangle($pauseBrush, 0, 0, $board.Width, $board.Height)
        $pauseFont = New-Object System.Drawing.Font('Consolas', 24, [System.Drawing.FontStyle]::Bold)
        $hintFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
        $graphics.DrawString('PAUSED', $pauseFont, (New-Object System.Drawing.SolidBrush($accent)), 218, 225)
        $graphics.DrawString('Press P to resume the circuit', $hintFont, (New-Object System.Drawing.SolidBrush($text)), 185, 275)
    }
})

$form.Add_KeyDown({
    param($sender, $eventArgs)

    if ($eventArgs.KeyCode -eq 'Enter' -and -not $script:gameActive) {
        $startButton.PerformClick()
        return
    }

    if ($eventArgs.KeyCode -eq 'R') {
        $resetButton.PerformClick()
        return
    }

    if ($eventArgs.KeyCode -eq 'P' -and $script:gameActive) {
        $script:gamePaused = -not $script:gamePaused
        if ($script:gamePaused) {
            $tickTimer.Stop()
            $statusLabel.Text = 'Run paused. Press P to resume.'
        }
        else {
            $tickTimer.Start()
            $statusLabel.Text = 'Circuit back online. Keep the chain moving.'
        }
        $board.Invalidate()
        return
    }

    if (-not $script:gameActive -or $script:gamePaused) {
        return
    }

    switch ($eventArgs.KeyCode) {
        'Left'  { $player.X = [Math]::Max(0, $player.X - 18) }
        'Right' { $player.X = [Math]::Min(596, $player.X + 18) }
        'Up'    { $player.Y = [Math]::Max(0, $player.Y - 18) }
        'Down'  { $player.Y = [Math]::Min(552, $player.Y + 18) }
        'Space' {
            if ($script:pulse -lt 100) {
                $statusLabel.Text = 'Pulse not charged yet.'
            }
            else {
                $script:lastPulseHits = 0
                $script:lastPulseDangerHits = 0
                $script:pulseBurstTicks = 6
                $script:pulseBurstRadius = 18
                $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 4)
                $script:feedbackColor = $chargeColor
                foreach ($gate in $gates.ToArray()) {
                    $distanceX = [Math]::Abs(($gate.X + ($gate.Size / 2)) - ($player.X + 12))
                    $distanceY = [Math]::Abs(($gate.Y + ($gate.Size / 2)) - ($player.Y + 12))
                    if ($distanceX -lt 90 -and $distanceY -lt 90) {
                        Capture-Gate $gate $true
                    }
                }
                if ($script:lastPulseHits -ge 4) {
                    $chainBonus = 26 + ($script:lastPulseHits * 12) + ($script:wave * 5)
                    $script:score += $chainBonus
                    $script:energy = [Math]::Min(100, $script:energy + 10)
                    $script:timeLeft = [Math]::Min(60, $script:timeLeft + 1)
                    $statusLabel.Text = "PULSE CASCADE: $($script:lastPulseHits) nodes chained. +$chainBonus score and +1s."
                }
                elseif ($script:lastPulseHits -ge 2) {
                    $chainBonus = 10 + ($script:lastPulseHits * 8) + ($script:wave * 3)
                    $script:score += $chainBonus
                    $script:energy = [Math]::Min(100, $script:energy + 5)
                    $statusLabel.Text = "Pulse chain landed: $($script:lastPulseHits) captures, +$chainBonus score."
                }
                elseif ($script:lastPulseHits -eq 0 -and $script:lastPulseDangerHits -eq 0) {
                    $statusLabel.Text = 'Pulse discharged wide. No gates in range.'
                }
                $script:pulse = 0
            }
        }
    }

    $board.Invalidate()
})

$tickTimer = New-Object System.Windows.Forms.Timer
$tickTimer.Interval = 100
$tickTimer.Add_Tick({
    if (-not $script:gameActive) {
        return
    }

    foreach ($gate in $gates.ToArray()) {
        $gate.X = [Math]::Max(0, [Math]::Min(590, $gate.X + $gate.DriftX))
        $gate.Y = [Math]::Max(0, [Math]::Min(546, $gate.Y + $gate.DriftY))
        if ($gate.X -le 0 -or $gate.X -ge 590) {
            $gate.DriftX *= -1
        }
        if ($gate.Y -le 0 -or $gate.Y -ge 546) {
            $gate.DriftY *= -1
        }

        $intersectsX = $player.X + $player.Size -gt $gate.X -and $player.X -lt ($gate.X + $gate.Size)
        $intersectsY = $player.Y + $player.Size -gt $gate.Y -and $player.Y -lt ($gate.Y + $gate.Size)
        if ($intersectsX -and $intersectsY) {
            Capture-Gate $gate $false
        }
        elseif ($gate.Type -eq 'danger' -and $script:nearMissCooldown -le 0) {
            $distanceX = [Math]::Abs(($gate.X + ($gate.Size / 2)) - ($player.X + 12))
            $distanceY = [Math]::Abs(($gate.Y + ($gate.Size / 2)) - ($player.Y + 12))
            if ($distanceX -lt 44 -and $distanceY -lt 44) {
                $script:score += 5 + $script:wave
                $script:pulse = [Math]::Min(100, $script:pulse + 6)
                $script:nearMissCooldown = 4
                $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 3)
                $script:feedbackColor = [System.Drawing.Color]::FromArgb(255, 160, 40)
                $statusLabel.Text = 'Near miss! High-voltage skim paid off.'
            }
        }
    }

    if ($script:nearMissCooldown -gt 0) {
        $script:nearMissCooldown -= 1
    }
    if ($script:feedbackTicks -gt 0) {
        $script:feedbackTicks -= 1
    }
    if ($script:pulseBurstTicks -gt 0) {
        $script:pulseBurstTicks -= 1
        $script:pulseBurstRadius += 18
    }
    if ($script:surgeTicks -gt 0) {
        $script:surgeTicks -= 1
    }

    $energyDrain = 1 + [Math]::Floor([Math]::Pow($script:wave - 1, 1.2))
    if ($script:pulse -ge 100) {
        $energyDrain += 1
    }
    if ($script:surgeTicks -gt 0) {
        $energyDrain += 3
    }
    $script:energy = [Math]::Max(0, $script:energy - $energyDrain)
    if ($tickTimer.Tag -isnot [int]) {
        $tickTimer.Tag = 0
    }
    $tickTimer.Tag = [int]$tickTimer.Tag + 100
    if ([int]$tickTimer.Tag -ge 1000) {
        $tickTimer.Tag = 0
        $script:timeLeft -= 1
        $newWave = 1 + [int][Math]::Floor((60 - $script:timeLeft) / 15)
        if ($newWave -gt $script:wave) {
            $script:wave = $newWave
            $script:score += 22 + ($script:wave * 4)
            $script:energy = [Math]::Min(100, $script:energy + 10)
            $script:pulse = [Math]::Min(100, $script:pulse + 18)
            $script:surgeTicks = 45
            $spikeMessage = "Wave $($script:wave) live: surge bonus applied (+score, +energy, +pulse)."
            if ($script:wave -eq 3 -or $script:wave -eq 4 -or $script:wave -eq 5) {
                $script:pulse = [Math]::Min(100, $script:pulse + 25)
                $script:score += 50 + ($script:wave * 10)
                $script:surgeTicks = 60
                $spikeMessage = "WAVE $($script:wave) SPIKE: Resonance cascade! Massive pulse surge!"
            }
            Fill-Gates
            $statusLabel.Text = $spikeMessage
        }
    }

    Update-Hud
    if ($script:energy -le 0) {
        End-Run 'Grid destabilized. The signal collapsed under overload.'
    }
    elseif ($script:timeLeft -le 0) {
        End-Run 'Time expired. Signal discharged cleanly - the grid held.'
    }

    $board.Invalidate()
})

$startButton.Add_Click({
    Reset-Board
    $script:gameActive = $true
    $script:gamePaused = $false
    $tickTimer.Tag = 0
    $tickTimer.Start()
    $startButton.Text = 'Restart Run'
    $statusLabel.Text = 'Circuit online. Move now.'
    $recapLabel.Text = 'Last run: active circuit'
    $form.Focus()
})

$resetButton.Add_Click({
    Reset-Board
    $script:gameActive = $false
    $script:gamePaused = $false
    $tickTimer.Stop()
    $startButton.Text = 'Start Run'
    $statusLabel.Text = 'Run reset. Press Start when ready.'
    $recapLabel.Text = 'Last run: manual reset'
    $form.Focus()
})

function Start-NeonCircuitRuntime {
    Reset-Board
    [void]$form.ShowDialog()
}

Start-NeonCircuitRuntime
