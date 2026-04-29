Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Graveyard Shift'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(980, 620)
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 17, 28)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$title = New-Object System.Windows.Forms.Label
$title.Text = 'GRAVEYARD SHIFT'
$title.ForeColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
$title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(22, 16)
$form.Controls.Add($title)

$yard = New-Object System.Windows.Forms.Panel
$yard.Location = New-Object System.Drawing.Point(22, 58)
$yard.Size = New-Object System.Drawing.Size(700, 530)
$yard.BackColor = [System.Drawing.Color]::FromArgb(24, 33, 42)
$form.Controls.Add($yard)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Score: 0    Lanterns: 3    Time: 45'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(748, 78)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Keep the graves quiet.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 188, 121)
$status.MaximumSize = New-Object System.Drawing.Size(190, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(748, 126)
$form.Controls.Add($status)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Light Lanterns'
$startButton.Location = New-Object System.Drawing.Point(748, 210)
$startButton.Size = New-Object System.Drawing.Size(180, 42)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
$form.Controls.Add($startButton)

$rng = [System.Random]::new()
$script:score = 0
$script:lives = 3
$script:timeLeft = 45
$ghostButtons = New-Object System.Collections.Generic.List[System.Windows.Forms.Button]
$running = $false

function Update-Hud {
    $hud.Text = "Score: $($script:score)    Lanterns: $($script:lives)    Time: $($script:timeLeft)"
}

function Spawn-Ghost {
    if (-not $running) {
        return
    }

    $ghost = New-Object System.Windows.Forms.Button
    $ghost.FlatStyle = 'Flat'
    $ghost.Size = New-Object System.Drawing.Size(70, 70)
    $ghost.Location = New-Object System.Drawing.Point($rng.Next(18, 610), $rng.Next(18, 430))
    $ghost.Text = if ($rng.NextDouble() -lt 0.22) { 'HEX' } else { 'GHO' }
    $ghost.BackColor = if ($ghost.Text -eq 'HEX') {
        [System.Drawing.Color]::FromArgb(255, 110, 110)
    }
    else {
        [System.Drawing.Color]::FromArgb(198, 235, 255)
    }

    $ghost.Add_Click({
        if ($ghost.Text -eq 'HEX') {
            $script:lives -= 1
            $status.Text = 'Wrong grave. Something answered back.'
        }
        else {
            $script:score += 14
            $status.Text = 'The lantern line held.'
        }
        $yard.Controls.Remove($ghost)
        $ghostButtons.Remove($ghost) | Out-Null
        Update-Hud
    })

    $ghostButtons.Add($ghost)
    $yard.Controls.Add($ghost)
}

$spawnTimer = New-Object System.Windows.Forms.Timer
$spawnTimer.Interval = 700
$spawnTimer.Add_Tick({
    if ($ghostButtons.Count -lt 6) {
        Spawn-Ghost
    }
})

$gameTimer = New-Object System.Windows.Forms.Timer
$gameTimer.Interval = 1000
$gameTimer.Add_Tick({
    if (-not $running) {
        return
    }

    $script:timeLeft -= 1
    foreach ($ghost in $ghostButtons.ToArray()) {
        if ($rng.NextDouble() -lt 0.3) {
            $yard.Controls.Remove($ghost)
            $ghostButtons.Remove($ghost) | Out-Null
            $script:lives -= 1
            $status.Text = 'A lantern went dark.'
        }
    }

    Update-Hud
    if ($script:lives -le 0 -or $script:timeLeft -le 0) {
        $running = $false
        $spawnTimer.Stop()
        $gameTimer.Stop()
        [System.Windows.Forms.MessageBox]::Show("Shift over. Score: $($script:score)", 'Graveyard Shift') | Out-Null
    }
})

$startButton.Add_Click({
    foreach ($ghost in $ghostButtons.ToArray()) {
        $yard.Controls.Remove($ghost)
        $ghostButtons.Remove($ghost) | Out-Null
    }
    $script:score = 0
    $script:lives = 3
    $script:timeLeft = 45
    $running = $true
    $status.Text = 'The bell rang. Start clicking.'
    Update-Hud
    $spawnTimer.Start()
    $gameTimer.Start()
})

[void]$form.ShowDialog()