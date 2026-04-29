Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Glass Garden'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(840, 660)
$form.BackColor = [System.Drawing.Color]::FromArgb(226, 244, 235)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$symbols = @('ROSE','MOSS','IVY','LILY','FERN','IRIS','REED','SAGE')
$deck = @($symbols + $symbols | Get-Random -Count 16)
$buttons = @()
$firstPick = $null
$busy = $false
$script:moves = 0
$script:matches = 0

$title = New-Object System.Windows.Forms.Label
$title.Text = 'GLASS GARDEN'
$title.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(26, 18)
$form.Controls.Add($title)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Matches: 0 / 8    Moves: 0'
$hud.ForeColor = [System.Drawing.Color]::FromArgb(39, 108, 75)
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(30, 62)
$form.Controls.Add($hud)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'Shuffle Beds'
$resetButton.Location = New-Object System.Drawing.Point(650, 34)
$resetButton.Size = New-Object System.Drawing.Size(150, 40)
$resetButton.FlatStyle = 'Flat'
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(137, 212, 176)
$form.Controls.Add($resetButton)

function Update-Hud {
    $hud.Text = "Matches: $($script:matches) / 8    Moves: $($script:moves)"
}

function Reset-Deck {
    $script:moves = 0
    $script:matches = 0
    $firstPick = $null
    $busy = $false
    $script:deck = @($symbols + $symbols | Get-Random -Count 16)
    for ($index = 0; $index -lt 16; $index++) {
        $button = $buttons[$index]
        $button.Text = 'BLOOM'
        $button.Enabled = $true
        $button.BackColor = [System.Drawing.Color]::FromArgb(182, 227, 205)
        $button.Tag = $script:deck[$index]
    }
    Update-Hud
}

for ($index = 0; $index -lt 16; $index++) {
    $button = New-Object System.Windows.Forms.Button
    $button.Size = New-Object System.Drawing.Size(170, 110)
    $button.Location = New-Object System.Drawing.Point(30 + (($index % 4) * 190), 120 + ([Math]::Floor($index / 4) * 122))
    $button.FlatStyle = 'Flat'
    $button.BackColor = [System.Drawing.Color]::FromArgb(182, 227, 205)
    $button.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
    $buttons += $button
    $form.Controls.Add($button)
}

$hideTimer = New-Object System.Windows.Forms.Timer
$hideTimer.Interval = 900
$hideTimer.Add_Tick({
    $hideTimer.Stop()
    foreach ($button in $buttons | Where-Object { $_.Enabled -and $_.Text -ne 'BLOOM' }) {
        $button.Text = 'BLOOM'
    }
    $firstPick = $null
    $busy = $false
})

foreach ($button in $buttons) {
    $button.Add_Click({
        param($sender, $eventArgs)

        if ($busy -or -not $sender.Enabled -or $sender.Text -ne 'BLOOM') {
            return
        }

        $sender.Text = [string]$sender.Tag
        if ($null -eq $firstPick) {
            $firstPick = $sender
            return
        }

        $script:moves += 1
        if ([string]$firstPick.Tag -eq [string]$sender.Tag) {
            $firstPick.Enabled = $false
            $sender.Enabled = $false
            $firstPick.BackColor = [System.Drawing.Color]::FromArgb(122, 191, 155)
            $sender.BackColor = [System.Drawing.Color]::FromArgb(122, 191, 155)
            $script:matches += 1
            $firstPick = $null
            if ($script:matches -ge 8) {
                Update-Hud
                [System.Windows.Forms.MessageBox]::Show("Garden restored in $($script:moves) moves.", 'Glass Garden') | Out-Null
                Reset-Deck
                return
            }
        }
        else {
            $busy = $true
            $hideTimer.Start()
        }
        Update-Hud
    })
}

$resetButton.Add_Click({ Reset-Deck })

Reset-Deck
[void]$form.ShowDialog()