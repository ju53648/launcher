Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Velvet Rook'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(920, 680)
$form.BackColor = [System.Drawing.Color]::FromArgb(28, 15, 32)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$size = 6
$buttons = @()
$gridPanel = New-Object System.Windows.Forms.Panel
$gridPanel.Location = New-Object System.Drawing.Point(28, 28)
$gridPanel.Size = New-Object System.Drawing.Size(534, 534)
$form.Controls.Add($gridPanel)

for ($row = 0; $row -lt $size; $row++) {
    $buttonRow = @()
    for ($col = 0; $col -lt $size; $col++) {
        $button = New-Object System.Windows.Forms.Button
        $button.Size = New-Object System.Drawing.Size(84, 84)
        $button.Location = New-Object System.Drawing.Point($col * 88, $row * 88)
        $button.FlatStyle = 'Flat'
        $button.Font = New-Object System.Drawing.Font('Consolas', 16, [System.Drawing.FontStyle]::Bold)
        $button.Tag = "$row,$col"
        $buttonRow += $button
        $gridPanel.Controls.Add($button)
    }
    $buttons += ,$buttonRow
}

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Targets: 0    Moves: 7    Level: 1    Score: 0'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(610, 50)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Move in straight lines. Avoid threatened tiles after each move.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 189, 226)
$status.MaximumSize = New-Object System.Drawing.Size(250, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(610, 92)
$form.Controls.Add($status)

$riskLabel = New-Object System.Windows.Forms.Label
$riskLabel.Text = 'Risk: calculating...'
$riskLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 210, 120)
$riskLabel.MaximumSize = New-Object System.Drawing.Size(250, 0)
$riskLabel.AutoSize = $true
$riskLabel.Location = New-Object System.Drawing.Point(610, 124)
$form.Controls.Add($riskLabel)

$legend = New-Object System.Windows.Forms.Label
$legend.Text = 'R = rook  |  S = sentinel  |  T = sigil  |  B = breaker  |  H = haven'
$legend.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
$legend.MaximumSize = New-Object System.Drawing.Size(250, 0)
$legend.AutoSize = $true
$legend.Location = New-Object System.Drawing.Point(610, 174)
$form.Controls.Add($legend)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best: 0 score / level 1'
$bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 224, 128)
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(610, 196)
$form.Controls.Add($bestLabel)

$resetButton = New-Object System.Windows.Forms.Button
$resetButton.Text = 'New Board'
$resetButton.Location = New-Object System.Drawing.Point(610, 232)
$resetButton.Size = New-Object System.Drawing.Size(180, 42)
$resetButton.BackColor = [System.Drawing.Color]::FromArgb(238, 153, 209)
$resetButton.FlatStyle = 'Flat'
$form.Controls.Add($resetButton)

$recapLabel = New-Object System.Windows.Forms.Label
$recapLabel.Text = 'Last board: none yet'
$recapLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
$recapLabel.MaximumSize = New-Object System.Drawing.Size(250, 0)
$recapLabel.AutoSize = $true
$recapLabel.Location = New-Object System.Drawing.Point(610, 296)
$form.Controls.Add($recapLabel)

$rng = [System.Random]::new()
$rook = [pscustomobject]@{ Row = 0; Col = 0 }
$targets = New-Object System.Collections.Generic.HashSet[string]
$breakerTargets = New-Object System.Collections.Generic.HashSet[string]
$sentinels = New-Object System.Collections.Generic.List[object]
$dangerTiles = New-Object System.Collections.Generic.HashSet[string]
$sanctuaries = New-Object System.Collections.Generic.HashSet[string]
$bonusSanctuaries = New-Object System.Collections.Generic.HashSet[string]
$script:moves = 7
$script:level = 1
$script:score = 0
$script:savePath = Join-Path $PSScriptRoot 'velvet-rook-save.json'
$script:bestScore = 0
$script:bestLevel = 1
$script:shieldCharges = 0
$script:maxShields = 1

if (Test-Path $script:savePath) {
    try {
        $saveData = Get-Content $script:savePath -Raw | ConvertFrom-Json
        $script:bestScore = [int]$saveData.bestScore
        $script:bestLevel = [int]$saveData.bestLevel
        $bestLabel.Text = "Best: $($script:bestScore) score / level $($script:bestLevel)"
    }
    catch {
    }
}

$modulesPath = Join-Path $PSScriptRoot 'modules'
. (Join-Path $modulesPath 'Runtime-State.ps1')
. (Join-Path $modulesPath 'Runtime-Gameplay.ps1')
. (Join-Path $modulesPath 'Runtime-Entrypoint.ps1')

Start-VelvetRookRuntime
