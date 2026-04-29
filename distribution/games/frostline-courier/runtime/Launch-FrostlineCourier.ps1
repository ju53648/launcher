Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Frostline Courier'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(920, 600)
$form.BackColor = [System.Drawing.Color]::FromArgb(13, 20, 33)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$stations = @(
    @{ Name = 'Aster'; Bonus = 1 },
    @{ Name = 'Breach'; Bonus = 0 },
    @{ Name = 'Cinder'; Bonus = 2 },
    @{ Name = 'Drift'; Bonus = 1 },
    @{ Name = 'Ember'; Bonus = 0 },
    @{ Name = 'Fallow'; Bonus = 3 }
)
$distances = @(
    @(0,2,3,2,4,5),
    @(2,0,2,3,2,4),
    @(3,2,0,2,3,2),
    @(2,3,2,0,2,3),
    @(4,2,3,2,0,2),
    @(5,4,2,3,2,0)
)

$script:location = 0
$script:fuel = 8
$script:score = 0
$script:deliveries = 0
$script:target = 4
$buttons = @()

$title = New-Object System.Windows.Forms.Label
$title.Text = 'FROSTLINE COURIER'
$title.ForeColor = [System.Drawing.Color]::FromArgb(150, 229, 255)
$title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(24, 18)
$form.Controls.Add($title)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Station: Aster    Fuel: 8    Deliveries: 0    Score: 0'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(28, 64)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Current contract: Ember'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 100)
$status.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(28, 102)
$form.Controls.Add($status)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Reset Route'
$startButton.Location = New-Object System.Drawing.Point(714, 42)
$startButton.Size = New-Object System.Drawing.Size(160, 42)
$startButton.BackColor = [System.Drawing.Color]::FromArgb(150, 229, 255)
$startButton.FlatStyle = 'Flat'
$form.Controls.Add($startButton)

for ($index = 0; $index -lt $stations.Count; $index++) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $stations[$index].Name
    $button.Tag = $index
    $button.Size = New-Object System.Drawing.Size(220, 62)
    $button.Location = New-Object System.Drawing.Point(40 + (($index % 2) * 260), 170 + ([Math]::Floor($index / 2) * 100))
    $button.FlatStyle = 'Flat'
    $button.BackColor = [System.Drawing.Color]::FromArgb(34, 46, 66)
    $button.ForeColor = [System.Drawing.Color]::White
    $buttons += $button
    $form.Controls.Add($button)
}

function New-Contract {
    $options = 0..($stations.Count - 1) | Where-Object { $_ -ne $script:location }
    $script:target = Get-Random -InputObject $options
    $status.Text = "Current contract: $($stations[$script:target].Name)"
}

function Update-Hud {
    $hud.Text = "Station: $($stations[$script:location].Name)    Fuel: $($script:fuel)    Deliveries: $($script:deliveries)    Score: $($script:score)"
    foreach ($button in $buttons) {
        $button.BackColor = if ([int]$button.Tag -eq $script:location) {
            [System.Drawing.Color]::FromArgb(255, 214, 100)
        }
        elseif ([int]$button.Tag -eq $script:target) {
            [System.Drawing.Color]::FromArgb(105, 172, 255)
        }
        else {
            [System.Drawing.Color]::FromArgb(34, 46, 66)
        }
    }
}

function Travel-To([int]$destination) {
    if ($destination -eq $script:location) { return }
    $cost = $distances[$script:location][$destination]
    if ($cost -gt $script:fuel) {
        $status.Text = 'Not enough fuel. Take a shorter run.'
        return
    }

    $script:fuel -= $cost
    $script:location = $destination
    $script:fuel += $stations[$destination].Bonus
    if ($script:location -eq $script:target) {
        $script:deliveries += 1
        $script:score += 25 + ($script:fuel * 2)
        $status.Text = 'Contract fulfilled. New route inbound.'
        New-Contract
    }
    else {
        $script:score = [Math]::Max(0, $script:score + 3 - $cost)
        $status.Text = 'Cargo still onboard.'
    }

    if ($script:fuel -le 0) {
        [System.Windows.Forms.MessageBox]::Show("Convoy stalled. Score: $($script:score)", 'Frostline Courier') | Out-Null
        $script:location = 0
        $script:fuel = 8
        $script:score = 0
        $script:deliveries = 0
        New-Contract
    }

    Update-Hud
}

foreach ($button in $buttons) {
    $button.Add_Click({
        param($sender, $eventArgs)
        Travel-To([int]$sender.Tag)
    })
}

$startButton.Add_Click({
    $script:location = 0
    $script:fuel = 8
    $script:score = 0
    $script:deliveries = 0
    New-Contract
    Update-Hud
})

New-Contract
Update-Hud
[void]$form.ShowDialog()