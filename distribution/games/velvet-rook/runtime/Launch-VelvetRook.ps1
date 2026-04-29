Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Velvet Rook'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(860, 640)
$form.BackColor = [System.Drawing.Color]::FromArgb(28, 15, 32)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$size = 6
$buttons = @()
$gridPanel = New-Object System.Windows.Forms.Panel
$gridPanel.Location = New-Object System.Drawing.Point(28, 28)
$gridPanel.Size = New-Object System.Drawing.Size(462, 462)
$form.Controls.Add($gridPanel)

for ($row = 0; $row -lt $size; $row++) {
    $buttonRow = @()
    for ($col = 0; $col -lt $size; $col++) {
        $button = New-Object System.Windows.Forms.Button
        $button.Size = New-Object System.Drawing.Size(72, 72)
        $button.Location = New-Object System.Drawing.Point($col * 76, $row * 76)
        $button.FlatStyle = 'Flat'
        $button.Tag = "$row,$col"
        $buttonRow += $button
        $gridPanel.Controls.Add($button)
    }
    $buttons += ,$buttonRow
}

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Targets: 0    Moves: 7    Level: 1'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(540, 50)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Click along the rook line to strike targets and avoid traps.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 189, 226)
$status.MaximumSize = New-Object System.Drawing.Size(240, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(540, 92)
$form.Controls.Add($status)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'New Board'
$resetButton.Location = New-Object System.Drawing.Point(540, 180)
$resetButton.Size = New-Object System.Drawing.Size(180, 42)
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(238, 153, 209)
$resetButton.FlatStyle = 'Flat'
$form.Controls.Add($resetButton)

$rng = [System.Random]::new()
$rook = [pscustomobject]@{ Row = 0; Col = 0 }
$targets = New-Object System.Collections.Generic.List[string]
$traps = New-Object System.Collections.Generic.List[string]
$script:moves = 7
$script:level = 1

function Reset-Board {
    $targets.Clear()
    $traps.Clear()
    $rook.Row = 0
    $rook.Col = 0
    $script:moves = 7
    while ($targets.Count -lt 4) {
        $cell = "$($rng.Next(0,6)),$($rng.Next(0,6))"
        if ($cell -ne '0,0' -and -not $targets.Contains($cell)) {
            $targets.Add($cell)
        }
    }
    while ($traps.Count -lt 3) {
        $cell = "$($rng.Next(0,6)),$($rng.Next(0,6))"
        if ($cell -ne '0,0' -and -not $targets.Contains($cell) -and -not $traps.Contains($cell)) {
            $traps.Add($cell)
        }
    }
    Update-Board
}

function Update-Board {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $button = $buttons[$row][$col]
            $button.Text = ''
            $button.BackColor = if (($row + $col) % 2 -eq 0) {
                [System.Drawing.Color]::FromArgb(58, 32, 64)
            }
            else {
                [System.Drawing.Color]::FromArgb(82, 44, 92)
            }
            $key = "$row,$col"
            if ($targets.Contains($key)) {
                $button.Text = 'T'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 224, 128)
            }
            if ($rook.Row -eq $row -and $rook.Col -eq $col) {
                $button.Text = 'R'
                $button.BackColor = [System.Drawing.Color]::FromArgb(255, 189, 226)
            }
        }
    }
    $hud.Text = "Targets: $($targets.Count)    Moves: $($script:moves)    Level: $($script:level)"
}

function Move-Rook([string]$key) {
    $parts = $key.Split(',')
    $row = [int]$parts[0]
    $col = [int]$parts[1]
    if ($row -ne $rook.Row -and $col -ne $rook.Col) {
        $status.Text = 'A rook only moves in straight lines.'
        return
    }
    if ($row -eq $rook.Row -and $col -eq $rook.Col) {
        return
    }

    $rook.Row = $row
    $rook.Col = $col
    $script:moves -= 1
    if ($targets.Contains($key)) {
        $targets.Remove($key) | Out-Null
        $status.Text = 'Target cleared.'
    }
    elseif ($traps.Contains($key)) {
        [System.Windows.Forms.MessageBox]::Show('Velvet trap. Board lost.', 'Velvet Rook') | Out-Null
        Reset-Board
        return
    }

    if ($targets.Count -eq 0) {
        $script:level += 1
        $status.Text = 'Board solved. Another arrives.'
        Reset-Board
        return
    }
    if ($script:moves -le 0) {
        [System.Windows.Forms.MessageBox]::Show('Out of moves.', 'Velvet Rook') | Out-Null
        Reset-Board
        return
    }
    Update-Board
}

for ($row = 0; $row -lt $size; $row++) {
    for ($col = 0; $col -lt $size; $col++) {
        $cellButton = $buttons[$row][$col]
        $cellButton.Add_Click({
            param($sender, $eventArgs)
            Move-Rook([string]$sender.Tag)
        })
    }
}

$resetButton.Add_Click({ Reset-Board })

Reset-Board
[void]$form.ShowDialog()