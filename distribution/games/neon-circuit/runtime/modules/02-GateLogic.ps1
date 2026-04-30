function Test-GateSpawnCandidate($candidate) {
    $playerCenterX = $player.X + ($player.Size / 2)
    $playerCenterY = $player.Y + ($player.Size / 2)
    $candidateCenterX = $candidate.X + ($candidate.Size / 2)
    $candidateCenterY = $candidate.Y + ($candidate.Size / 2)
    $playerPadding = if ($candidate.Type -eq 'danger') { 124 } else { 84 }

    if ([Math]::Abs($candidateCenterX - $playerCenterX) -lt $playerPadding -and
        [Math]::Abs($candidateCenterY - $playerCenterY) -lt $playerPadding) {
        return $false
    }

    foreach ($existingGate in $gates) {
        $existingCenterX = $existingGate.X + ($existingGate.Size / 2)
        $existingCenterY = $existingGate.Y + ($existingGate.Size / 2)
        $spacing = [Math]::Ceiling((($candidate.Size + $existingGate.Size) / 2) + 16)
        if ([Math]::Abs($candidateCenterX - $existingCenterX) -lt $spacing -and
            [Math]::Abs($candidateCenterY - $existingCenterY) -lt $spacing) {
            return $false
        }
    }

    return $true
}

function New-Gate {
    $size = 26 + $rng.Next(0, 22)
    $roll = $rng.NextDouble()
    $type = 'sync'
    $resonanceChance = 0.06 + ($script:wave * 0.01)
    $dangerChance = 0.16 + ($script:wave * 0.025)
    if ($script:surgeTicks -gt 0) {
        $dangerChance += 0.12
    }
    $sparkChance = 0.003
    if ($roll -lt $sparkChance) {
        $type = 'spark'
        $size = 12
    }
    elseif ($roll -lt $sparkChance + $resonanceChance) {
        $type = 'resonance'
    }
    elseif ($roll -lt $dangerChance + $resonanceChance) {
        $type = 'danger'
    }
    elseif ($roll -lt 0.42 + $resonanceChance) {
        $type = 'charge'
    }

    $fallbackGate = $null
    for ($attempt = 0; $attempt -lt 18; $attempt += 1) {
        $candidate = [pscustomobject]@{
            X = $rng.Next(28, 560)
            Y = $rng.Next(28, 516)
            Size = $size
            Type = $type
            DriftX = $rng.Next(-2, 3)
            DriftY = $rng.Next(-2, 3)
        }
        $fallbackGate = $candidate
        if (Test-GateSpawnCandidate $candidate) {
            return $candidate
        }
    }

    return $fallbackGate
}

function Grant-ComboMilestone {
    if ($script:combo -lt 5) {
        return
    }

    $milestone = [Math]::Floor($script:combo / 5)
    if ($milestone -le $script:comboMilestone) {
        return
    }

    $script:comboMilestone = $milestone
    $script:timeLeft = [Math]::Min(60, $script:timeLeft + 2)
    $script:energy = [Math]::Min(100, $script:energy + 7)
    $script:pulse = [Math]::Min(100, $script:pulse + 10)
    $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 5)
    $script:feedbackColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
    $statusLabel.Text = 'COMBO BANK: +2s, +7 stability, +10 pulse.'
}

function Fill-Gates {
    $targetCount = 10 + ($script:wave * 2)
    if ($script:surgeTicks -gt 0) {
        $targetCount += 1
    }
    while ($gates.Count -lt $targetCount) {
        $gates.Add((New-Gate))
    }
}

function Capture-Gate($gate, [bool]$fromPulse) {
    if ($fromPulse) {
        if ($gate.Type -eq 'danger') {
            $script:lastPulseDangerHits += 1
        }
        else {
            $script:lastPulseHits += 1
        }
    }

    switch ($gate.Type) {
        'spark' {
            $script:combo += 1
            $script:chargeStreak = 0
            $sparkBonus = 40 + ($script:wave * 8)
            $script:score += $sparkBonus
            $script:pulse = [Math]::Min(100, $script:pulse + 30)
            $script:energy = [Math]::Min(100, $script:energy + 6)
            $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 5)
            $script:feedbackColor = [System.Drawing.Color]::FromArgb(255, 200, 70)
            $statusLabel.Text = 'SIGNAL SPARK: Rare quantum event!'
        }
        'sync' {
            $script:combo += 1
            $script:chargeStreak = 0
            $multiplier = 1 + [Math]::Floor($script:combo / 4)
            $gain = 10 + ($script:wave * 2)
            if ($fromPulse) {
                $gain += 6
            }
            $script:score += $gain * $multiplier
            $script:energy = [Math]::Min(100, $script:energy + 8)
            if ($fromPulse) {
                $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 3)
                $script:feedbackColor = $chargeColor
            }
            $statusLabel.Text = 'Clean sync. Keep the route alive.'
        }
        'charge' {
            $script:combo += 1
            $script:chargeStreak += 1
            $pulseGain = 22
            $streakBonus = 0
            if ($script:chargeStreak -ge 3) {
                $streakBonus = 6 + ($script:wave * 1.4)
                $pulseGain += $streakBonus
                $script:score += 15 + ($script:wave * 3)
                $statusLabel.Text = 'PULSE SERIES: x' + $script:chargeStreak + ' charge streak firing!'
            }
            else {
                $statusLabel.Text = 'Pulse cell captured. Burst potential rising.'
            }
            $script:score += 8 + ($script:wave * 2)
            $script:pulse = [Math]::Min(100, $script:pulse + $pulseGain)
            $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 4)
            $script:feedbackColor = $chargeColor
        }
        'resonance' {
            $script:combo += 1
            $script:chargeStreak = 0
            $resonancePulse = 45 + ($script:wave * 8)
            $script:pulse = [Math]::Min(100, $script:pulse + $resonancePulse)
            $script:score += 32 + ($script:wave * 4)
            $script:energy = [Math]::Min(100, $script:energy + 12)
            $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 6)
            $script:feedbackColor = $resonanceColor
            $statusLabel.Text = 'RESONANCE GATE: Massive pulse spike!'
        }
        'danger' {
            $script:combo = 0
            $script:comboMilestone = 0
            $script:chargeStreak = 0
            if ($fromPulse) {
                $script:score += 4
                $script:energy = [Math]::Max(0, $script:energy - 6)
                $statusLabel.Text = 'Burst clipped a hot node.'
            }
            else {
                $script:energy = [Math]::Max(0, $script:energy - 18)
                $statusLabel.Text = 'Overload spike. Back off the red nodes.'
            }
            $script:feedbackTicks = [Math]::Max($script:feedbackTicks, 7)
            $script:feedbackColor = $warning
        }
    }

    if ($gate.Type -ne 'danger') {
        Grant-ComboMilestone
    }

    $gates.Remove($gate) | Out-Null
    $gates.Add((New-Gate))
}
