Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Pocket Heist'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(820, 620)
$form.BackColor = [System.Drawing.Color]::FromArgb(16, 18, 24)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.KeyPreview = $true

$gridPanel = New-Object System.Windows.Forms.Panel
$gridPanel.Location = New-Object System.Drawing.Point(26, 26)
$gridPanel.Size = New-Object System.Drawing.Size(462, 462)
$form.Controls.Add($gridPanel)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Loot: 0 / 3    Alarm: 0    Floor: 1'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(524, 48)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Use arrow keys. Take all loot, then reach EXIT.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(130, 236, 255)
$status.MaximumSize = New-Object System.Drawing.Size(230, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(524, 92)
$form.Controls.Add($status)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Job'
$startButton.Location = New-Object System.Drawing.Point(524, 180)
$startButton.Size = New-Object System.Drawing.Size(180, 42)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
$form.Controls.Add($startButton)

$size = 6
$buttons = @()
for ($row = 0; $row -lt $size; $row++) {
    $buttonRow = @()
    for ($col = 0; $col -lt $size; $col++) {
        $button = New-Object System.Windows.Forms.Button
        $button.Size = New-Object System.Drawing.Size(72, 72)
        $button.Location = New-Object System.Drawing.Point($col * 76, $row * 76)
        $button.FlatStyle = 'Flat'
        $buttonRow += $button
        $gridPanel.Controls.Add($button)
    }
    $buttons += ,$buttonRow
}

$player = [pscustomobject]@{ Row = 0; Col = 0 }
$guard = [pscustomobject]@{ Row = 5; Col = 5 }
$loot = New-Object System.Collections.Generic.List[string]
$exit = '5,0'
$script:collected = 0
$script:alarm = 0
$script:floor = 1
$running = $false

function Update-Board {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $button = $buttons[$row][$col]
            $button.Text = ''
            $button.BackColor = [System.Drawing.Color]::FromArgb(34, 37, 46)
            $key = "$row,$col"
            if ($loot.Contains($key)) {
                $button.Text = 'LOOT'
                $button.BackColor = [System.Drawing.Color]::FromArgb(110, 215, 118)
            }
            if ($key -eq $exit) {
                $button.Text = 'EXIT'
                $button.BackColor = [System.Drawing.Color]::FromArgb(84, 148, 252)
            }
            if ($guard.Row -eq $row -and $guard.Col -eq $col) {
                $button.Text = 'GUARD'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 103, 103)
            }
            if ($player.Row -eq $row -and $player.Col -eq $col) {
                $button.Text = 'YOU'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
            }
        }
    }
    $hud.Text = "Loot: $($script:collected) / 3    Alarm: $($script:alarm)    Floor: $($script:floor)"
}

function Reset-Level {
    $player.Row = 0
    $player.Col = 0
    $guard.Row = 5
    $guard.Col = 5
    $loot.Clear()
    $loot.Add('1,4')
    $loot.Add('3,2')
    $loot.Add('4,5')
    $script:collected = 0
    $script:alarm = 0
    Update-Board
}

function Move-Guard {
    if ($guard.Row -lt $player.Row) { $guard.Row += 1 }
    elseif ($guard.Row -gt $player.Row) { $guard.Row -= 1 }
    elseif ($guard.Col -lt $player.Col) { $guard.Col += 1 }
    elseif ($guard.Col -gt $player.Col) { $guard.Col -= 1 }
}

function Handle-Move([int]$nextRow, [int]$nextCol) {
    if (-not $running) { return }
    if ($nextRow -lt 0 -or $nextRow -ge $size -or $nextCol -lt 0 -or $nextCol -ge $size) { return }

    $player.Row = $nextRow
    $player.Col = $nextCol
    $key = "$nextRow,$nextCol"
    if ($loot.Contains($key)) {
        $loot.Remove($key) | Out-Null
        $script:collected += 1
        $status.Text = 'Clean pickup. Keep moving.'
    }

    Move-Guard
    if ($guard.Row -eq $player.Row -and $guard.Col -eq $player.Col) {
        $running = $false
        [System.Windows.Forms.MessageBox]::Show('Caught. Job failed.', 'Pocket Heist') | Out-Null
    }
    elseif ($key -eq $exit -and $script:collected -ge 3) {
        $script:floor += 1
        $status.Text = 'Perfect escape. Floor rotated.'
        Reset-Level
    }
    else {
        $script:alarm += 1
    }
    Update-Board
}

$form.Add_KeyDown({
    param($sender, $eventArgs)
    switch ($eventArgs.KeyCode) {
        'Left'  { Handle-Move $player.Row ($player.Col - 1) }
        'Right' { Handle-Move $player.Row ($player.Col + 1) }
        'Up'    { Handle-Move ($player.Row - 1) $player.Col }
        'Down'  { Handle-Move ($player.Row + 1) $player.Col }
    }
})

$startButton.Add_Click({
    $running = $true
    $script:floor = 1
    Reset-Level
    $status.Text = 'Job live. Do not get greedy.'
})

Reset-Level
[void]$form.ShowDialog()