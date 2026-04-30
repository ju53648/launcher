Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Word Reactor'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(980, 620)
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 13, 31)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$wordPools = @{
    1 = @('coolant','reactor','vector','thermal','failsafe','uplink','containment','conduit','pressure','circuit','dampener','override','sequence','spillway','relay','gridline','cooldown','checklock','feedback','staging')
    2 = @('stabilize','switchyard','gridlock','signalpath','lockstep','fluxgate','powercell','meltpoint','safeguard','resonance','burnpath','isolate','surgewall','phasecoil','backdraft','bridgecode','vent cycle','lag field','loopbreak','primewave')
    3 = @('counterflow','shockfront','overclocked','oscillator','blackstart','recalibrate','hyperflux','detonation','fieldpulse','supercycle','discharge','coldstart','slipstream','core breach','containment crack','plasma rebound','breakerline','afterimage','heat storm','cascade drift')
}

$rng = [System.Random]::new()
$script:score = 0
$script:timeLeft = 75
$script:streak = 0
$script:heat = 18
$script:round = 1
$script:bestScore = 0
$script:bestTitle = 'queue intern'
$script:correctThisRound = 0
$script:roundGoal = 6
$script:ventCooldown = 0
$script:ventCooldownMax = 16
$script:queue = New-Object 'System.Collections.Generic.List[string]'
$script:highScorePath = Join-Path $PSScriptRoot 'word-reactor-save.json'
$script:running = $false
$script:comboMilestone = 0
$script:specialEventActive = $null
$script:challengeCounter = 0
$script:defaultEntryBackColor = [System.Drawing.Color]::White
$script:defaultEntryForeColor = [System.Drawing.Color]::Black

$title = New-Object System.Windows.Forms.Label
$title.Text = 'WORD REACTOR'
$title.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$title.Font = New-Object System.Drawing.Font('Consolas', 22, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(26, 18)
$form.Controls.Add($title)

$prompt = New-Object System.Windows.Forms.Label
$prompt.Text = 'Manage the live command queue before containment drift turns the whole stack into slag.'
$prompt.ForeColor = [System.Drawing.Color]::White
$prompt.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$prompt.AutoSize = $true
$prompt.Location = New-Object System.Drawing.Point(30, 58)
$form.Controls.Add($prompt)

$wordPanel = New-Object System.Windows.Forms.Panel
$wordPanel.Location = New-Object System.Drawing.Point(28, 100)
$wordPanel.Size = New-Object System.Drawing.Size(600, 220)
$wordPanel.BackColor = [System.Drawing.Color]::FromArgb(26, 24, 52)
$form.Controls.Add($wordPanel)

$activeWordLabel = New-Object System.Windows.Forms.Label
$activeWordLabel.Text = 'START'
$activeWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
$activeWordLabel.Font = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Bold)
$activeWordLabel.AutoSize = $true
$activeWordLabel.Location = New-Object System.Drawing.Point(28, 30)
$wordPanel.Controls.Add($activeWordLabel)

$queueWordLabel = New-Object System.Windows.Forms.Label
$queueWordLabel.Text = 'QUEUE: --  --'
$queueWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 230, 156)
$queueWordLabel.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$queueWordLabel.AutoSize = $true
$queueWordLabel.Location = New-Object System.Drawing.Point(32, 106)
$wordPanel.Controls.Add($queueWordLabel)

$roundLabel = New-Object System.Windows.Forms.Label
$roundLabel.Text = 'Round 1 objective: 6 clean commits'
$roundLabel.ForeColor = [System.Drawing.Color]::FromArgb(203, 214, 255)
$roundLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$roundLabel.AutoSize = $true
$roundLabel.Location = New-Object System.Drawing.Point(32, 154)
$wordPanel.Controls.Add($roundLabel)

$commandHint = New-Object System.Windows.Forms.Label
$commandHint.Text = 'Commands: FLUSH (skip word, +22 heat) | VENT (emergency bleed-off, -heat) | GAMBIT (volatile score burst)'
$commandHint.ForeColor = [System.Drawing.Color]::FromArgb(255, 212, 145)
$commandHint.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$commandHint.AutoSize = $true
$commandHint.Location = New-Object System.Drawing.Point(30, 324)
$form.Controls.Add($commandHint)

$entryBox = New-Object System.Windows.Forms.TextBox
$entryBox.Location = New-Object System.Drawing.Point(30, 350)
$entryBox.Size = New-Object System.Drawing.Size(598, 38)
$entryBox.Font = New-Object System.Drawing.Font('Segoe UI', 16)
$form.Controls.Add($entryBox)

$signalLabel = New-Object System.Windows.Forms.Label
$signalLabel.Text = 'Signal trace: standby'
$signalLabel.ForeColor = [System.Drawing.Color]::FromArgb(203, 214, 255)
$signalLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$signalLabel.AutoSize = $true
$signalLabel.MaximumSize = New-Object System.Drawing.Size(600, 0)
$signalLabel.Location = New-Object System.Drawing.Point(32, 392)
$form.Controls.Add($signalLabel)

$submitButton = New-Object System.Windows.Forms.Button
$submitButton.Text = 'Commit'
$submitButton.Location = New-Object System.Drawing.Point(650, 348)
$submitButton.Size = New-Object System.Drawing.Size(120, 42)
$submitButton.FlatStyle = 'Flat'
$submitButton.BackColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
$form.Controls.Add($submitButton)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Reactor'
$startButton.Location = New-Object System.Drawing.Point(790, 348)
$startButton.Size = New-Object System.Drawing.Size(150, 42)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$form.Controls.Add($startButton)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Score: 0    Time: 75    Streak: 0    Round: 1'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(30, 412)
$form.Controls.Add($hud)

$bestLabel = New-Object System.Windows.Forms.Label
$bestLabel.Text = 'Best containment: 0'
$bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$bestLabel.AutoSize = $true
$bestLabel.Location = New-Object System.Drawing.Point(30, 446)
$form.Controls.Add($bestLabel)

$recapLabel = New-Object System.Windows.Forms.Label
$recapLabel.Text = 'Last containment: none yet'
$recapLabel.ForeColor = [System.Drawing.Color]::FromArgb(203, 214, 255)
$recapLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$recapLabel.AutoSize = $true
$recapLabel.MaximumSize = New-Object System.Drawing.Size(900, 0)
$recapLabel.Location = New-Object System.Drawing.Point(180, 446)
$form.Controls.Add($recapLabel)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = 'Containment title: queue intern'
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 230, 156)
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$titleLabel.AutoSize = $true
$titleLabel.MaximumSize = New-Object System.Drawing.Size(900, 0)
$titleLabel.Location = New-Object System.Drawing.Point(30, 470)
$form.Controls.Add($titleLabel)

$heatLabel = New-Object System.Windows.Forms.Label
$heatLabel.Text = 'Heat: 18%'
$heatLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 156, 108)
$heatLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$heatLabel.AutoSize = $true
$heatLabel.Location = New-Object System.Drawing.Point(30, 496)
$form.Controls.Add($heatLabel)

$heatBar = New-Object System.Windows.Forms.ProgressBar
$heatBar.Location = New-Object System.Drawing.Point(120, 496)
$heatBar.Size = New-Object System.Drawing.Size(320, 20)
$heatBar.Maximum = 100
$heatBar.Value = 18
$form.Controls.Add($heatBar)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Containment cold. Prime the queue when ready.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$status.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$status.MaximumSize = New-Object System.Drawing.Size(900, 0)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(30, 540)
$form.Controls.Add($status)

$moduleRoot = Join-Path $PSScriptRoot 'modules'
. (Join-Path $moduleRoot 'WordReactor.Persistence.ps1')
. (Join-Path $moduleRoot 'WordReactor.QueueHud.ps1')
. (Join-Path $moduleRoot 'WordReactor.Gameplay.ps1')
. (Join-Path $moduleRoot 'WordReactor.Runtime.ps1')

Start-WordReactorRuntime
