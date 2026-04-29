Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$script:score = 0
$script:timeLeft = 45
$script:energy = 100
$script:highScorePath = Join-Path $PSScriptRoot 'neon-circuit-save.json'

$themeBackground = [System.Drawing.Color]::FromArgb(10, 12, 26)
$panelBackground = [System.Drawing.Color]::FromArgb(18, 24, 52)
$accent = [System.Drawing.Color]::FromArgb(57, 255, 192)
$warning = [System.Drawing.Color]::FromArgb(255, 96, 91)
$text = [System.Drawing.Color]::FromArgb(236, 241, 255)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Neon Circuit'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(960, 640)
$form.BackColor = $themeBackground
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$title = New-Object System.Windows.Forms.Label
$title.Text = 'NEON CIRCUIT'
$title.ForeColor = $accent
$title.Font = New-Object System.Drawing.Font('Consolas', 22, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(24, 18)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Route the signal. Hit green gates. Avoid overload.'
$subtitle.ForeColor = $text
$subtitle.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(27, 60)
$form.Controls.Add($subtitle)

$hud = New-Object System.Windows.Forms.Panel
$hud.Size = New-Object System.Drawing.Size(250, 558)
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
$timeLabel.Text = 'Time: 45'
$timeLabel.ForeColor = $text
$timeLabel.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$timeLabel.AutoSize = $true
$timeLabel.Location = New-Object System.Drawing.Point(20, 70)
$hud.Controls.Add($timeLabel)

$energyLabel = New-Object System.Windows.Forms.Label
$energyLabel.Text = 'Grid Stability: 100%'
$energyLabel.ForeColor = $text
$energyLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$energyLabel.AutoSize = $true
$energyLabel.Location = New-Object System.Drawing.Point(20, 110)
$hud.Controls.Add($energyLabel)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best: 0'
$bestLabel.ForeColor = $accent
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(20, 148)
$hud.Controls.Add($bestLabel)

$helpLabel = New-Object System.Windows.Forms.Label
$helpLabel.Text = "Arrow keys move`r`nSpace stabilizes nearby gates`r`nGreen gates = points`r`nRed gates = heavy damage"
$helpLabel.ForeColor = $text
$helpLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$helpLabel.AutoSize = $true
$helpLabel.Location = New-Object System.Drawing.Point(20, 198)
$hud.Controls.Add($helpLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = 'Press Start to energize the board.'
$statusLabel.ForeColor = $accent
$statusLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.AutoSize = $true
$statusLabel.MaximumSize = New-Object System.Drawing.Size(210, 0)
$statusLabel.Location = New-Object System.Drawing.Point(20, 300)
$hud.Controls.Add($statusLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Run'
$startButton.Size = New-Object System.Drawing.Size(200, 42)
$startButton.Location = New-Object System.Drawing.Point(20, 370)
$startButton.BackColor = $accent
$startButton.FlatStyle = 'Flat'
$hud.Controls.Add($startButton)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'Reset Run'
$resetButton.Size = New-Object System.Drawing.Size(200, 42)
$resetButton.Location = New-Object System.Drawing.Point(20, 422)
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(80, 94, 148)
$resetButton.ForeColor = $text
$resetButton.FlatStyle = 'Flat'
$hud.Controls.Add($resetButton)

$board = New-Object System.Windows.Forms.Panel
$board.Size = New-Object System.Drawing.Size(620, 558)
$board.Location = New-Object System.Drawing.Point(24, 52)
$board.BackColor = [System.Drawing.Color]::FromArgb(14, 18, 36)
$form.Controls.Add($board)

$rng = [System.Random]::new()
$player = New-Object psobject -Property @{ X = 280; Y = 250; Size = 24 }
$gates = New-Object System.Collections.Generic.List[object]
$gameActive = $false
$bestScore = 0

if (Test-Path $script:highScorePath) {
    try {
        $saveData = Get-Content $script:highScorePath -Raw | ConvertFrom-Json
        if ($null -ne $saveData.bestScore) {
            $bestScore = [int]$saveData.bestScore
            $bestLabel.Text = "Best: $bestScore"
        }
    }
    catch {
    }
}

function Save-BestScore {
    if ($script:score -le $bestScore) {
        return
    }

    $scriptJson = @{ bestScore = $script:score } | ConvertTo-Json
    Set-Content -Path $script:highScorePath -Value $scriptJson -Encoding UTF8
    $script:bestScore = $script:score
    $bestLabel.Text = "Best: $($script:score)"
}

function New-Gate {
    $size = 30 + $rng.Next(0, 26)
    $danger = $rng.NextDouble() -lt 0.25
    return [pscustomobject]@{
        X = $rng.Next(28, 560)
        Y = $rng.Next(28, 498)
        Size = $size
        Danger = $danger
        Pulse = $rng.Next(0, 100)
    }
}

function Reset-Board {
    $gates.Clear()
    for ($index = 0; $index -lt 11; $index++) {
        $gates.Add((New-Gate))
    }

    $player.X = 280
    $player.Y = 250
    $script:score = 0
    $script:timeLeft = 45
    $script:energy = 100
    $scoreLabel.Text = 'Score: 0'
    $timeLabel.Text = 'Time: 45'
    $energyLabel.Text = 'Grid Stability: 100%'
    $statusLabel.Text = 'Board synced. Catch the green gates.'
    $board.Invalidate()
}

$board.Add_Paint({
    param($sender, $eventArgs)

    $graphics = $eventArgs.Graphics
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(14, 18, 36))

    $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 49, 86), 1)
    for ($line = 0; $line -le 620; $line += 40) {
        $graphics.DrawLine($gridPen, $line, 0, $line, 558)
    }
    for ($line = 0; $line -le 558; $line += 40) {
        $graphics.DrawLine($gridPen, 0, $line, 620, $line)
    }

    foreach ($gate in $gates) {
        $color = if ($gate.Danger) { $warning } else { $accent }
        $brush = New-Object System.Drawing.SolidBrush($color)
        $graphics.FillEllipse($brush, $gate.X, $gate.Y, $gate.Size, $gate.Size)
        $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(110, $color.R, $color.G, $color.B), 4)
        $graphics.DrawEllipse($glowPen, $gate.X - 4, $gate.Y - 4, $gate.Size + 8, $gate.Size + 8)
    }

    $playerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 242, 88))
    $graphics.FillRectangle($playerBrush, $player.X, $player.Y, $player.Size, $player.Size)
    $outlinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255), 2)
    $graphics.DrawRectangle($outlinePen, $player.X, $player.Y, $player.Size, $player.Size)
})

$form.KeyPreview = $true
$form.Add_KeyDown({
    param($sender, $eventArgs)

    if (-not $gameActive) {
        return
    }

    switch ($eventArgs.KeyCode) {
        'Left'  { $player.X = [Math]::Max(0, $player.X - 18) }
        'Right' { $player.X = [Math]::Min(596, $player.X + 18) }
        'Up'    { $player.Y = [Math]::Max(0, $player.Y - 18) }
        'Down'  { $player.Y = [Math]::Min(534, $player.Y + 18) }
        'Space' {
            foreach ($gate in $gates.ToArray()) {
                $distanceX = [Math]::Abs(($gate.X + ($gate.Size / 2)) - ($player.X + 12))
                $distanceY = [Math]::Abs(($gate.Y + ($gate.Size / 2)) - ($player.Y + 12))
                if ($distanceX -lt 70 -and $distanceY -lt 70) {
                    if ($gate.Danger) {
                        $script:energy = [Math]::Max(0, $script:energy - 16)
                        $statusLabel.Text = 'You stabilized a hot node, but the grid still screamed.'
                    }
                    else {
                        $script:score += 18
                        $script:energy = [Math]::Min(100, $script:energy + 8)
                        $statusLabel.Text = 'Clean sync. Chain more gates.'
                    }
                    $gates.Remove($gate)
                    $gates.Add((New-Gate))
                }
            }
        }
    }

    $board.Invalidate()
})

$tickTimer = New-Object System.Windows.Forms.Timer
$tickTimer.Interval = 100
$tickTimer.Add_Tick({
    if (-not $gameActive) {
        return
    }

    foreach ($gate in $gates) {
        $gate.Pulse += 1
        if ($gate.Pulse % 8 -eq 0 -and -not $gate.Danger) {
            $script:score += 1
        }
    }

    foreach ($gate in $gates.ToArray()) {
        $intersectsX = $player.X + $player.Size -gt $gate.X -and $player.X -lt ($gate.X + $gate.Size)
        $intersectsY = $player.Y + $player.Size -gt $gate.Y -and $player.Y -lt ($gate.Y + $gate.Size)
        if ($intersectsX -and $intersectsY) {
            if ($gate.Danger) {
                $script:energy = [Math]::Max(0, $script:energy - 20)
                $statusLabel.Text = 'Overload spike. Back off the red nodes.'
            }
            else {
                $script:score += 12
                $script:energy = [Math]::Min(100, $script:energy + 4)
                $statusLabel.Text = 'Signal captured. Keep the route alive.'
            }
            $gates.Remove($gate)
            $gates.Add((New-Gate))
        }
    }

    $script:energy = [Math]::Max(0, $script:energy - 1)
    if ($tickTimer.Tag -isnot [int]) {
        $tickTimer.Tag = 0
    }
    $tickTimer.Tag = [int]$tickTimer.Tag + 100
    if ([int]$tickTimer.Tag -ge 1000) {
        $tickTimer.Tag = 0
        $script:timeLeft -= 1
    }

    $scoreLabel.Text = "Score: $($script:score)"
    $timeLabel.Text = "Time: $($script:timeLeft)"
    $energyLabel.Text = "Grid Stability: $($script:energy)%"

    if ($script:energy -le 0 -or $script:timeLeft -le 0) {
        $gameActive = $false
        $tickTimer.Stop()
        Save-BestScore
        $statusLabel.Text = "Run complete. Final score: $($script:score)."
        [System.Windows.Forms.MessageBox]::Show("Signal discharged. Score: $($script:score)", 'Neon Circuit') | Out-Null
    }

    $board.Invalidate()
})

$startButton.Add_Click({
    Reset-Board
    $gameActive = $true
    $tickTimer.Tag = 0
    $tickTimer.Start()
    $statusLabel.Text = 'Circuit online. Move now.'
    $form.Focus()
})

$resetButton.Add_Click({
    Reset-Board
    $gameActive = $false
    $tickTimer.Stop()
    $statusLabel.Text = 'Run reset. Press Start when ready.'
    $form.Focus()
})

Reset-Board
[void]$form.ShowDialog()