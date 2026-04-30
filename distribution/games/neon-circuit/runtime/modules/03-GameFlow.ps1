function Get-WaveDisplayText {
    if ($script:wave -ge 4) {
        return "Wave: $($script:wave)  [FINAL]"
    }
    $nextWaveAt = $script:wave * 15
    $secondsToNext = [Math]::Max(0, $nextWaveAt - (60 - $script:timeLeft))
    return "Wave: $($script:wave)  next in ${secondsToNext}s"
}

function Update-Hud {
    $scoreLabel.Text = "Score: $($script:score)"
    $timeLabel.Text = "Time: $($script:timeLeft)"
    if ($script:timeLeft -le 10) {
        $timeLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 160, 40)
    }
    else {
        $timeLabel.ForeColor = $text
    }
    $energyLabel.Text = "Grid Stability: $($script:energy)%"
    if ($script:energy -le 10) {
        $energyLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 70, 70)
    }
    elseif ($script:energy -le 30) {
        $energyLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 160, 40)
    }
    else {
        $energyLabel.ForeColor = $text
    }
    $comboLabel.Text = "Combo: $($script:combo)"
    if ($script:combo -gt 0) {
        $comboLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
    }
    else {
        $comboLabel.ForeColor = $text
    }
    $waveLabel.Text = Get-WaveDisplayText
    $pulseLabel.Text = "Pulse: $($script:pulse) / 100"
    $pulseBar.Value = [Math]::Min(100, [Math]::Max(0, $script:pulse))
    if ($script:pulse -ge 100) {
        $pulseLabel.ForeColor = $accent
    }
    else {
        $pulseLabel.ForeColor = $chargeColor
    }
    if ($script:surgeTicks -gt 0) {
        $surgeSeconds = [Math]::Round($script:surgeTicks / 10, 1)
        $surgeLabel.Text = "Surge: ACTIVE ($surgeSeconds s)"
        $surgeLabel.ForeColor = $warning
    }
    else {
        $surgeLabel.Text = 'Surge: stable'
        $surgeLabel.ForeColor = $accent
    }
}

function End-Run([string]$message) {
    $script:gameActive = $false
    $tickTimer.Stop()
    $startButton.Text = 'Restart Run'
    Save-BestScore
    $statusLabel.Text = $message
    $recapLabel.Text = "Last run: score $($script:score), wave $($script:wave), energy $($script:energy)%, rank $(Get-CircuitTitle $script:score $script:wave)"
    $form.Refresh()
    [System.Windows.Forms.MessageBox]::Show("Signal discharged. Score: $($script:score)`r`nWave reached: $($script:wave)`r`nRank: $(Get-CircuitTitle $script:score $script:wave)", 'Neon Circuit') | Out-Null
}

function Reset-Board {
    $gates.Clear()
    $player.X = 280
    $player.Y = 250
    $script:score = 0
    $script:timeLeft = 60
    $script:energy = 100
    $script:combo = 0
    $script:chargeStreak = 0
    $script:wave = 1
    $script:pulse = 0
    $script:surgeTicks = 0
    $script:nearMissCooldown = 0
    Fill-Gates
    Update-Hud
    $statusLabel.Text = 'Board synced. Chain gates and bank pulse.'
    $board.Invalidate()
}
