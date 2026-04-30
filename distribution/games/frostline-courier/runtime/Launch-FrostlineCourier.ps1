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
$form.KeyPreview = $true

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
$script:routeStreak = 0
$script:maxStreak = 0
$script:contractHops = 0
$script:usedSupplyDrop = $false
$script:selectedStation = 4
$script:eventLog = @()
$script:runtimeRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$script:savePath = Join-Path $script:runtimeRoot 'frostline-courier-save.json'
$script:bestScore = 0
$script:bestDeliveries = 0
$script:bestTitle = 'snowline rookie'
$script:bestCondition = 'Clear lanes'
$script:runCondition = $null
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
$status.AutoSize = $false
$status.Size = New-Object System.Drawing.Size(520, 42)
$status.Location = New-Object System.Drawing.Point(28, 102)
$form.Controls.Add($status)

$careerLabel = New-Object System.Windows.Forms.Label
$careerLabel.Text = 'Best run: 0 score / 0 deliveries / snowline rookie'
$careerLabel.ForeColor = [System.Drawing.Color]::FromArgb(175, 190, 210)
$careerLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Bold)
$careerLabel.AutoSize = $true
$careerLabel.Location = New-Object System.Drawing.Point(28, 142)
$form.Controls.Add($careerLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Reset Route'
$startButton.Location = New-Object System.Drawing.Point(714, 42)
$startButton.Size = New-Object System.Drawing.Size(160, 42)
$startButton.BackColor = [System.Drawing.Color]::FromArgb(150, 229, 255)
$startButton.FlatStyle = 'Flat'
$form.Controls.Add($startButton)

$cacheButton = New-Object System.Windows.Forms.Button
$cacheButton.Text = 'Deploy Supply Cache'
$cacheButton.Location = New-Object System.Drawing.Point(580, 498)
$cacheButton.Size = New-Object System.Drawing.Size(300, 42)
$cacheButton.BackColor = [System.Drawing.Color]::FromArgb(104, 191, 161)
$cacheButton.ForeColor = [System.Drawing.Color]::FromArgb(12, 22, 34)
$cacheButton.FlatStyle = 'Flat'
$form.Controls.Add($cacheButton)

for ($index = 0; $index -lt $stations.Count; $index++) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $stations[$index].Name
    $button.Tag = $index
    $button.Size = New-Object System.Drawing.Size(220, 62)
$button.Location = New-Object System.Drawing.Point(40 + (($index % 2) * 260), 198 + ([Math]::Floor($index / 2) * 92))
    $button.FlatStyle = 'Flat'
    $button.BackColor = [System.Drawing.Color]::FromArgb(34, 46, 66)
    $button.ForeColor = [System.Drawing.Color]::White
    $button.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $button.FlatAppearance.BorderSize = 1
    $button.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(62, 80, 107)
    $buttons += $button
    $form.Controls.Add($button)
}

$intelPanel = New-Object System.Windows.Forms.Panel
$intelPanel.Location = New-Object System.Drawing.Point(580, 140)
$intelPanel.Size = New-Object System.Drawing.Size(300, 340)
$intelPanel.BackColor = [System.Drawing.Color]::FromArgb(18, 29, 46)
$intelPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($intelPanel)

$contractLabel = New-Object System.Windows.Forms.Label
$contractLabel.Text = 'Contract: Ember'
$contractLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 100)
$contractLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$contractLabel.AutoSize = $false
$contractLabel.Size = New-Object System.Drawing.Size(260, 24)
$contractLabel.Location = New-Object System.Drawing.Point(18, 16)
$intelPanel.Controls.Add($contractLabel)

$routeHeader = New-Object System.Windows.Forms.Label
$routeHeader.Text = 'ROUTE INTEL'
$routeHeader.ForeColor = [System.Drawing.Color]::FromArgb(150, 229, 255)
$routeHeader.Font = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold)
$routeHeader.AutoSize = $true
$routeHeader.Location = New-Object System.Drawing.Point(18, 52)
$intelPanel.Controls.Add($routeHeader)

$routeBody = New-Object System.Windows.Forms.Label
$routeBody.ForeColor = [System.Drawing.Color]::White
$routeBody.Font = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Regular)
$routeBody.AutoSize = $false
$routeBody.Size = New-Object System.Drawing.Size(260, 136)
$routeBody.Location = New-Object System.Drawing.Point(18, 82)
$intelPanel.Controls.Add($routeBody)

$legendLabel = New-Object System.Windows.Forms.Label
$legendLabel.ForeColor = [System.Drawing.Color]::FromArgb(175, 190, 210)
$legendLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$legendLabel.AutoSize = $false
$legendLabel.Size = New-Object System.Drawing.Size(260, 54)
$legendLabel.Location = New-Object System.Drawing.Point(18, 214)
$intelPanel.Controls.Add($legendLabel)

$logHeader = New-Object System.Windows.Forms.Label
$logHeader.Text = 'FIELD LOG'
$logHeader.ForeColor = [System.Drawing.Color]::FromArgb(150, 229, 255)
$logHeader.Font = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold)
$logHeader.AutoSize = $true
$logHeader.Location = New-Object System.Drawing.Point(18, 266)
$intelPanel.Controls.Add($logHeader)

$logBody = New-Object System.Windows.Forms.Label
$logBody.ForeColor = [System.Drawing.Color]::FromArgb(214, 222, 235)
$logBody.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$logBody.AutoSize = $false
$logBody.Size = New-Object System.Drawing.Size(260, 54)
$logBody.Location = New-Object System.Drawing.Point(18, 292)
$intelPanel.Controls.Add($logBody)

$helperLabel = New-Object System.Windows.Forms.Label
$helperLabel.Text = 'Hover a stop for projections. Gold = current depot, blue = contract, grey = out of range. Controls: Enter travel, C cache, R reset route.'
$helperLabel.ForeColor = [System.Drawing.Color]::FromArgb(175, 190, 210)
$helperLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$helperLabel.AutoSize = $false
$helperLabel.Size = New-Object System.Drawing.Size(520, 44)
$helperLabel.Location = New-Object System.Drawing.Point(40, 530)
$form.Controls.Add($helperLabel)

$moduleRoot = Join-Path $script:runtimeRoot 'modules'

. (Join-Path $moduleRoot 'Frostline.Gameplay.ps1')
. (Join-Path $moduleRoot 'Frostline.Events.ps1')
. (Join-Path $moduleRoot 'Frostline.Entrypoint.ps1')

Start-FrostlineCourierRuntime
