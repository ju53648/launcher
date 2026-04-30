Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Pocket Heist'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(980, 680)
$form.BackColor = [System.Drawing.Color]::FromArgb(16, 18, 24)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.KeyPreview = $true

$gridPanel = New-Object System.Windows.Forms.Panel
$gridPanel.Location = New-Object System.Drawing.Point(26, 26)
$gridPanel.Size = New-Object System.Drawing.Size(546, 546)
$form.Controls.Add($gridPanel)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Loot: 0 / 3    Alarm: 0    Floor: 1    Smoke: 2'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(612, 48)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Use arrow keys. Space drops smoke. Clear the floor, then reach EXIT.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(130, 236, 255)
$status.MaximumSize = New-Object System.Drawing.Size(300, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(612, 92)
$form.Controls.Add($status)

$alarmLabel = New-Object System.Windows.Forms.Label
$alarmLabel.Text = 'Alarm Heat: 0%'
$alarmLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 130, 130)
$alarmLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$alarmLabel.AutoSize = $true
$alarmLabel.Location = New-Object System.Drawing.Point(612, 170)
$form.Controls.Add($alarmLabel)

$alarmBar = New-Object System.Windows.Forms.ProgressBar
$alarmBar.Location = New-Object System.Drawing.Point(612, 198)
$alarmBar.Size = New-Object System.Drawing.Size(240, 20)
$alarmBar.Maximum = 100
$alarmBar.Value = 0
$form.Controls.Add($alarmBar)

$floorLabel = New-Object System.Windows.Forms.Label
$floorLabel.Text = 'Floor 1: office shell'
$floorLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
$floorLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$floorLabel.AutoSize = $true
$floorLabel.Location = New-Object System.Drawing.Point(612, 248)
$form.Controls.Add($floorLabel)

$legend = New-Object System.Windows.Forms.Label
$legend.Text = 'YOU = you  |  G = guard  |  $ = loot  |  I = intel  |  C = camera  |  # = wall  |  E = exit'
$legend.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
$legend.MaximumSize = New-Object System.Drawing.Size(300, 0)
$legend.AutoSize = $true
$legend.Location = New-Object System.Drawing.Point(612, 286)
$form.Controls.Add($legend)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best job: 0 score / floor 1'
$bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(612, 332)
$form.Controls.Add($bestLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Job'
$startButton.Location = New-Object System.Drawing.Point(612, 360)
$startButton.Size = New-Object System.Drawing.Size(180, 42)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 74)
$form.Controls.Add($startButton)

$recapLabel = New-Object System.Windows.Forms.Label
$recapLabel.Text = 'Last job: none yet'
$recapLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
$recapLabel.MaximumSize = New-Object System.Drawing.Size(300, 0)
$recapLabel.AutoSize = $true
$recapLabel.Location = New-Object System.Drawing.Point(612, 416)
$form.Controls.Add($recapLabel)

$size = 7
$buttons = @()
for ($row = 0; $row -lt $size; $row++) {
    $buttonRow = @()
    for ($col = 0; $col -lt $size; $col++) {
        $button = New-Object System.Windows.Forms.Button
        $button.Size = New-Object System.Drawing.Size(74, 74)
        $button.Location = New-Object System.Drawing.Point($col * 78, $row * 78)
        $button.FlatStyle = 'Flat'
        $button.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
        $buttonRow += $button
        $gridPanel.Controls.Add($button)
    }
    $buttons += ,$buttonRow
}

$player = [pscustomobject]@{ Row = 0; Col = 0 }
$guards = New-Object System.Collections.Generic.List[object]
$loot = New-Object System.Collections.Generic.List[string]
$walls = New-Object System.Collections.Generic.HashSet[string]
$cameras = New-Object System.Collections.Generic.HashSet[string]
$smokeTiles = New-Object System.Collections.Generic.Dictionary[string, int]
$exit = '6,0'
$script:intelTile = ''
$script:intelCollected = $false
$script:cameraGrace = 0
$script:floorModifier = ''
$script:zoneRule = ''
$script:collected = 0
$script:alarm = 0
$script:extractionTimer = -1
$script:announcedExtraction = $false
$script:floor = 1
$script:smoke = 2
$script:score = 0
$script:savePath = Join-Path $PSScriptRoot 'pocket-heist-save.json'
$script:bestScore = 0
$script:bestFloor = 1
$running = $false

$moduleRoot = Join-Path $PSScriptRoot 'modules'
. (Join-Path $moduleRoot 'config.ps1')
. (Join-Path $moduleRoot 'helpers.ps1')
. (Join-Path $moduleRoot 'core.ps1')

$layouts = Get-PocketHeistLayouts

if (Test-Path $script:savePath) {
    try {
        $saveData = Get-Content $script:savePath -Raw | ConvertFrom-Json
        $script:bestScore = [int]$saveData.bestScore
        $script:bestFloor = [int]$saveData.bestFloor
        $bestLabel.Text = "Best job: $($script:bestScore) score / floor $($script:bestFloor)"
    }
    catch {
    }
}

function Handle-Move([int]$nextRow, [int]$nextCol) {
    if (-not $running) { return }
    if ($nextRow -lt 0 -or $nextRow -ge $size -or $nextCol -lt 0 -or $nextCol -ge $size) { return }

    $destination = "$nextRow,$nextCol"
    if ($walls.Contains($destination)) {
        $status.Text = 'Blocked route. Find another angle.'
        return
    }

    Step-Smoke
    $player.Row = $nextRow
    $player.Col = $nextCol

    if ($loot.Contains($destination)) {
        $loot.Remove($destination) | Out-Null
        $script:collected += 1
        $script:score += 18 + ($script:floor * 6)
        $script:alarm = [Math]::Max(0, $script:alarm - 6)
        $status.Text = 'Clean pickup. Stay light on your feet.'
        if ($script:collected -ge 3 -and -not $script:announcedExtraction) {
            $script:announcedExtraction = $true
            $status.Text = 'Bags are full. Reach EXIT to extract before heat spikes.'
        }
    }

    if (-not $script:intelCollected -and $destination -eq $script:intelTile) {
        $script:intelCollected = $true
        $script:score += 24 + ($script:floor * 10)
        if ($script:floorModifier -like '*smoke refill*') {
            $script:smoke = 3
            $status.Text = 'Intel lifted. Executive codes gave a full smoke refill.'
        }
        elseif ($script:floor -ge 5) {
            $script:alarm = [Math]::Max(0, $script:alarm - 16)
            $script:score += 12
            $status.Text = 'Intel pulled from the roof. Patrol window cracked open.'
        }
        else {
            $script:alarm = [Math]::Max(0, $script:alarm - 10)
            $status.Text = 'Intel secured. Patrol timing got easier to read.'
        }
    }

    Trigger-Cameras
    Move-Guards

    foreach ($guard in $guards) {
        if ($guard.Row -eq $player.Row -and $guard.Col -eq $player.Col) {
            End-Run 'Caught on the floor. Job failed.'
            Update-Board
            return
        }
    }

    $timerJustStarted = $false
    if ($script:extractionTimer -lt 0 -and $script:collected -ge 3 -and $script:alarm -ge 60) {
        $script:extractionTimer = 8
        $timerJustStarted = $true
    }

    if ($destination -eq $exit -and $script:collected -ge 3) {
        $intelBonus = if ($script:intelCollected) { 28 + ($script:floor * 5) } else { 0 }
        $heatBonus = if ($script:intelCollected -and $script:alarm -ge 55) { 40 + ($script:floor * 6) } else { 0 }
        if ($script:floor -ge 3) {
            $script:score += 80 + [Math]::Max(0, 30 - $script:alarm) + $intelBonus + $heatBonus
            if ($script:intelCollected) {
                if ($heatBonus -gt 0) {
                    End-Run 'Crew paid. Hot extraction with intel pulled premium hazard pay.'
                }
                else {
                    End-Run 'Crew paid. Three floors cleared and the intel package came home clean.'
                }
            }
            else {
                End-Run 'Crew paid. Three floors cleared without tripping the whole tower.'
            }
            Update-Board
            return
        }
        $script:score += 45 + [Math]::Max(0, 20 - $script:alarm) + $intelBonus + $heatBonus
        if ($script:intelCollected) {
            if ($heatBonus -gt 0) {
                $status.Text = 'Escape route hot. Intel sold for hazard premium.'
            }
            else {
                $status.Text = 'Escape route clean. Intel packet sold, buying you time on the next floor.'
            }
        }
        else {
            $status.Text = 'Escape route clean. Next floor is hot.'
        }
        Load-Floor ($script:floor + 1)
        return
    }

    if ($script:extractionTimer -gt 0) {
        $script:extractionTimer -= 1
        if ($script:extractionTimer -le 0) {
            End-Run 'Lockdown hit. Reinforcements flooded the route before extraction.'
            Update-Board
            return
        }
        if ($timerJustStarted) {
            $status.Text = "Bags full -- lockdown. $($script:extractionTimer) move$(if ($script:extractionTimer -ne 1) { 's' }) to EXIT."
        } else {
            $status.Text = "Lockdown: $($script:extractionTimer) move$(if ($script:extractionTimer -ne 1) { 's' }) left - reach EXIT."
        }
    }

    if ($script:alarm -ge 100) {
        End-Run 'Full alarm. The building sealed around you.'
        Update-Board
        return
    }

    if ($destination -eq $exit -and $script:collected -lt 3) {
        $status.Text = "Exit sealed. You have $($script:collected) / 3 bags - collect the rest first."
    }

    Update-Board
}

Start-PocketHeistRuntime