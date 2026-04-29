Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Tempo Trashfire'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(920, 660)
$form.BackColor = [System.Drawing.Color]::FromArgb(12, 9, 18)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.KeyPreview = $true

$lanePanel = New-Object System.Windows.Forms.Panel
$lanePanel.Location = New-Object System.Drawing.Point(36, 34)
$lanePanel.Size = New-Object System.Drawing.Size(520, 580)
$lanePanel.BackColor = [System.Drawing.Color]::FromArgb(22, 20, 38)
$form.Controls.Add($lanePanel)

$colors = @(
    [System.Drawing.Color]::FromArgb(255, 82, 138),
    [System.Drawing.Color]::FromArgb(255, 185, 86),
    [System.Drawing.Color]::FromArgb(86, 255, 208),
    [System.Drawing.Color]::FromArgb(104, 144, 255)
)

$lanes = @()
for ($index = 0; $index -lt 4; $index++) {
    $panel = New-Object System.Windows.Forms.Panel
    $panel.Size = New-Object System.Drawing.Size(110, 520)
    $panel.Location = New-Object System.Drawing.Point(10 + ($index * 126), 18)
    $panel.BackColor = [System.Drawing.Color]::FromArgb(34, 32, 50)
    $lanePanel.Controls.Add($panel)
    $lanes += $panel
}

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Score: 0    Streak: 0    Time: 45'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(606, 62)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Hit A S D F when notes reach the bottom line.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 185, 86)
$status.MaximumSize = New-Object System.Drawing.Size(250, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(606, 108)
$form.Controls.Add($status)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Set'
$startButton.Location = New-Object System.Drawing.Point(606, 190)
$startButton.Size = New-Object System.Drawing.Size(180, 42)
$startButton.BackColor = [System.Drawing.Color]::FromArgb(86, 255, 208)
$startButton.FlatStyle = 'Flat'
$form.Controls.Add($startButton)

$script:score = 0
$script:streak = 0
$script:timeLeft = 45
$notes = New-Object System.Collections.Generic.List[object]
$rng = [System.Random]::new()
$running = $false

function Draw-Notes {
    foreach ($lane in $lanes) {
        $lane.Controls.Clear()
    }
    foreach ($note in $notes) {
        $notePanel = New-Object System.Windows.Forms.Panel
        $notePanel.Size = New-Object System.Drawing.Size(90, 20)
        $notePanel.Location = New-Object System.Drawing.Point(10, [int]$note.Y)
        $notePanel.BackColor = $colors[$note.Lane]
        $lanes[$note.Lane].Controls.Add($notePanel)
    }
}

function Update-Hud {
    $hud.Text = "Score: $($script:score)    Streak: $($script:streak)    Time: $($script:timeLeft)"
}

function Handle-Hit([int]$lane) {
    if (-not $running) { return }

    $candidate = $notes | Where-Object { $_.Lane -eq $lane -and $_.Y -ge 450 -and $_.Y -le 510 } | Select-Object -First 1
    if ($null -ne $candidate) {
        $notes.Remove($candidate) | Out-Null
        $script:streak += 1
        $script:score += 12 + ($script:streak * 2)
        $status.Text = 'Good hit. The room stayed alive.'
    }
    else {
        $script:streak = 0
        $script:score = [Math]::Max(0, $script:score - 8)
        $status.Text = 'Miss. The mixer coughed.'
    }
    Draw-Notes
    Update-Hud
}

$form.Add_KeyDown({
    param($sender, $eventArgs)
    switch ($eventArgs.KeyCode) {
        'A' { Handle-Hit 0 }
        'S' { Handle-Hit 1 }
        'D' { Handle-Hit 2 }
        'F' { Handle-Hit 3 }
    }
})

$frameTimer = New-Object System.Windows.Forms.Timer
$frameTimer.Interval = 100
$frameTimer.Add_Tick({
    if (-not $running) { return }
    if ($rng.NextDouble() -lt 0.3) {
        $notes.Add([pscustomobject]@{ Lane = $rng.Next(0, 4); Y = 0 })
    }
    foreach ($note in $notes.ToArray()) {
        $note.Y += 22
        if ($note.Y -gt 520) {
            $notes.Remove($note) | Out-Null
            $script:streak = 0
            $script:score = [Math]::Max(0, $script:score - 10)
            $status.Text = 'Dropped beat. The crowd noticed.'
        }
    }
    Draw-Notes
    Update-Hud
})

$clockTimer = New-Object System.Windows.Forms.Timer
$clockTimer.Interval = 1000
$clockTimer.Add_Tick({
    if (-not $running) { return }
    $script:timeLeft -= 1
    Update-Hud
    if ($script:timeLeft -le 0) {
        $running = $false
        $frameTimer.Stop()
        $clockTimer.Stop()
        [System.Windows.Forms.MessageBox]::Show("Set complete. Score: $($script:score)", 'Tempo Trashfire') | Out-Null
    }
})

$startButton.Add_Click({
    $notes.Clear()
    $script:score = 0
    $script:streak = 0
    $script:timeLeft = 45
    $running = $true
    $status.Text = 'The ugly little club is ready.'
    Update-Hud
    Draw-Notes
    $frameTimer.Start()
    $clockTimer.Start()
})

[void]$form.ShowDialog()