Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Word Reactor'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(880, 520)
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 13, 31)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$words = @(
    'voltage','coolant','reactor','cascade','plasma','vector','stabilize','override','containment',
    'switchyard','gridlock','pressure','thermal','shadowline','failsafe','uplink','conductive','sparkstorm'
)
$rng = [System.Random]::new()
$script:score = 0
$script:timeLeft = 60
$script:streak = 0
$script:targetWord = ''

$title = New-Object System.Windows.Forms.Label
$title.Text = 'WORD REACTOR'
$title.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(26, 20)
$form.Controls.Add($title)

$prompt = New-Object System.Windows.Forms.Label
$prompt.Text = 'Type the highlighted control phrase before the reactor slips.'
$prompt.ForeColor = [System.Drawing.Color]::White
$prompt.AutoSize = $true
$prompt.Location = New-Object System.Drawing.Point(30, 60)
$form.Controls.Add($prompt)

$wordPanel = New-Object System.Windows.Forms.Panel
$wordPanel.Location = New-Object System.Drawing.Point(28, 100)
$wordPanel.Size = New-Object System.Drawing.Size(520, 180)
$wordPanel.BackColor = [System.Drawing.Color]::FromArgb(26, 24, 52)
$form.Controls.Add($wordPanel)

$currentWordLabel = New-Object System.Windows.Forms.Label
$currentWordLabel.Text = 'Press Start'
$currentWordLabel.ForeColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
$currentWordLabel.Font = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold)
$currentWordLabel.AutoSize = $true
$currentWordLabel.Location = New-Object System.Drawing.Point(30, 62)
$wordPanel.Controls.Add($currentWordLabel)

$entryBox = New-Object System.Windows.Forms.TextBox
$entryBox.Location = New-Object System.Drawing.Point(30, 320)
$entryBox.Size = New-Object System.Drawing.Size(520, 36)
$entryBox.Font = New-Object System.Drawing.Font('Segoe UI', 16)
$form.Controls.Add($entryBox)

$submitButton = New-Object System.Windows.Forms.Button
$submitButton.Text = 'Commit'
$submitButton.Location = New-Object System.Drawing.Point(570, 318)
$submitButton.Size = New-Object System.Drawing.Size(120, 40)
$submitButton.FlatStyle = 'Flat'
$submitButton.BackColor = [System.Drawing.Color]::FromArgb(88, 255, 214)
$form.Controls.Add($submitButton)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Reactor'
$startButton.Location = New-Object System.Drawing.Point(704, 318)
$startButton.Size = New-Object System.Drawing.Size(140, 40)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$form.Controls.Add($startButton)

$hud = New-Object System.Windows.Forms.Label
$hud.Text = 'Score: 0    Time: 60    Streak: 0'
$hud.ForeColor = [System.Drawing.Color]::White
$hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$hud.AutoSize = $true
$hud.Location = New-Object System.Drawing.Point(30, 380)
$form.Controls.Add($hud)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Stabilization idle.'
$status.ForeColor = [System.Drawing.Color]::FromArgb(255, 196, 68)
$status.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(30, 420)
$form.Controls.Add($status)

$running = $false

function Set-NewWord {
    $script:targetWord = $words[$rng.Next(0, $words.Count)]
    $currentWordLabel.Text = $script:targetWord.ToUpperInvariant()
    $entryBox.Text = ''
    $entryBox.Focus()
}

function Update-Hud {
    $hud.Text = "Score: $($script:score)    Time: $($script:timeLeft)    Streak: $($script:streak)"
}

function Submit-Word {
    if (-not $running) {
        return
    }

    if ($entryBox.Text.Trim().ToLowerInvariant() -eq $script:targetWord) {
        $script:streak += 1
        $script:score += ($script:targetWord.Length * 5) + ($script:streak * 2)
        $status.Text = 'Clean input. Pressure dropping.'
        Set-NewWord
    }
    else {
        $script:streak = 0
        $script:score = [Math]::Max(0, $script:score - 12)
        $status.Text = 'Mistyped. Reactor shook the walls.'
        $entryBox.SelectAll()
        $entryBox.Focus()
    }
    Update-Hud
}

$entryBox.Add_KeyDown({
    param($sender, $eventArgs)
    if ($eventArgs.KeyCode -eq 'Enter') {
        Submit-Word
        $eventArgs.SuppressKeyPress = $true
    }
})

$submitButton.Add_Click({ Submit-Word })

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({
    if (-not $running) {
        return
    }

    $script:timeLeft -= 1
    if ($script:timeLeft -le 0) {
        $running = $false
        $timer.Stop()
        $status.Text = "Meltdown avoided. Final score: $($script:score)."
        [System.Windows.Forms.MessageBox]::Show("Final score: $($script:score)", 'Word Reactor') | Out-Null
    }
    elseif ($script:timeLeft % 8 -eq 0) {
        $status.Text = 'Heat spike. Type faster.'
    }
    Update-Hud
})

$startButton.Add_Click({
    $script:score = 0
    $script:timeLeft = 60
    $script:streak = 0
    $running = $true
    Set-NewWord
    Update-Hud
    $status.Text = 'Containment live.'
    $timer.Start()
})

[void]$form.ShowDialog()