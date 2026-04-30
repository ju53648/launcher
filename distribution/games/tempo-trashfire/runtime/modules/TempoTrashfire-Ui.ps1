function Initialize-TempoTrashfireUi {
    $script:form = New-Object System.Windows.Forms.Form
    $script:form.Text = 'Tempo Trashfire'
    $script:form.StartPosition = 'CenterScreen'
    $script:form.ClientSize = New-Object System.Drawing.Size(980, 700)
    $script:form.BackColor = [System.Drawing.Color]::FromArgb(12, 9, 18)
    $script:form.FormBorderStyle = 'FixedSingle'
    $script:form.MaximizeBox = $false
    $script:form.KeyPreview = $true

    $script:lanePanel = New-Object System.Windows.Forms.Panel
    $script:lanePanel.Location = New-Object System.Drawing.Point(36, 34)
    $script:lanePanel.Size = New-Object System.Drawing.Size(560, 620)
    $script:lanePanel.BackColor = [System.Drawing.Color]::FromArgb(22, 20, 38)
    $script:form.Controls.Add($script:lanePanel)

    $script:colors = @(
        [System.Drawing.Color]::FromArgb(255, 82, 138),
        [System.Drawing.Color]::FromArgb(255, 185, 86),
        [System.Drawing.Color]::FromArgb(86, 255, 208),
        [System.Drawing.Color]::FromArgb(104, 144, 255)
    )
    $script:laneBaseColor = [System.Drawing.Color]::FromArgb(34, 32, 50)
    $script:keyHintLabels = @()
    $script:laneFlashResetTimers = @($null, $null, $null, $null)

    $script:lanes = @()
    for ($index = 0; $index -lt 4; $index++) {
        $panel = New-Object System.Windows.Forms.Panel
        $panel.Size = New-Object System.Drawing.Size(118, 560)
        $panel.Location = New-Object System.Drawing.Point(14 + ($index * 134), 18)
        $panel.BackColor = $script:laneBaseColor
        $script:lanePanel.Controls.Add($panel)
        $script:lanes += $panel
    }

    $script:hitLine = New-Object System.Windows.Forms.Panel
    $script:hitLine.Location = New-Object System.Drawing.Point(12, 528)
    $script:hitLine.Size = New-Object System.Drawing.Size(534, 6)
    $script:hitLine.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
    $script:lanePanel.Controls.Add($script:hitLine)

    $keyHints = @('A', 'S', 'D', 'F')
    for ($kIdx = 0; $kIdx -lt 4; $kIdx++) {
        $keyHintLabel = New-Object System.Windows.Forms.Label
        $keyHintLabel.Text = $keyHints[$kIdx]
        $keyHintLabel.ForeColor = $script:colors[$kIdx]
        $keyHintLabel.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
        $keyHintLabel.AutoSize = $true
        $keyHintLabel.Location = New-Object System.Drawing.Point((61 + ($kIdx * 134)), 590)
        $script:lanePanel.Controls.Add($keyHintLabel)
        $script:keyHintLabels += $keyHintLabel
    }

    $script:overlayLabel = New-Object System.Windows.Forms.Label
    $script:overlayLabel.Text = 'PAUSED'
    $script:overlayLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 214, 108)
    $script:overlayLabel.BackColor = [System.Drawing.Color]::FromArgb(150, 12, 9, 18)
    $script:overlayLabel.Font = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
    $script:overlayLabel.Size = New-Object System.Drawing.Size(300, 64)
    $script:overlayLabel.Location = New-Object System.Drawing.Point(130, 232)
    $script:overlayLabel.TextAlign = 'MiddleCenter'
    $script:overlayLabel.Visible = $false
    $script:lanePanel.Controls.Add($script:overlayLabel)
    [void]$script:lanePanel.Controls.SetChildIndex($script:overlayLabel, 0)

    $script:hud = New-Object System.Windows.Forms.Label
    $script:hud.Text = 'Score: 0    Combo: 0    Time: 60    Phase: 1    Mult: x1'
    $script:hud.ForeColor = [System.Drawing.Color]::White
    $script:hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
    $script:hud.AutoSize = $true
    $script:hud.Location = New-Object System.Drawing.Point(640, 62)
    $script:form.Controls.Add($script:hud)

    $script:status = New-Object System.Windows.Forms.Label
    $script:status.Text = 'Hit A S D F on the line. Keep the room upright through each busted phase.'
    $script:status.ForeColor = [System.Drawing.Color]::FromArgb(255, 185, 86)
    $script:status.MaximumSize = New-Object System.Drawing.Size(280, 0)
    $script:status.AutoSize = $true
    $script:status.Location = New-Object System.Drawing.Point(640, 108)
    $script:form.Controls.Add($script:status)

    $script:crowdLabel = New-Object System.Windows.Forms.Label
    $script:crowdLabel.Text = 'Crowd: 65%'
    $script:crowdLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 112, 148)
    $script:crowdLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $script:crowdLabel.AutoSize = $true
    $script:crowdLabel.Location = New-Object System.Drawing.Point(640, 176)
    $script:form.Controls.Add($script:crowdLabel)

    $script:crowdBar = New-Object System.Windows.Forms.ProgressBar
    $script:crowdBar.Location = New-Object System.Drawing.Point(640, 204)
    $script:crowdBar.Size = New-Object System.Drawing.Size(240, 20)
    $script:crowdBar.Maximum = 100
    $script:crowdBar.Value = 65
    $script:form.Controls.Add($script:crowdBar)

    $script:phaseLabel = New-Object System.Windows.Forms.Label
    $script:phaseLabel.Text = 'Phase 1: basement soundcheck'
    $script:phaseLabel.ForeColor = [System.Drawing.Color]::FromArgb(151, 238, 255)
    $script:phaseLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $script:phaseLabel.AutoSize = $true
    $script:phaseLabel.Location = New-Object System.Drawing.Point(640, 252)
    $script:form.Controls.Add($script:phaseLabel)

    $script:judgementLabel = New-Object System.Windows.Forms.Label
    $script:judgementLabel.Text = 'Judgement: --'
    $script:judgementLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
    $script:judgementLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $script:judgementLabel.AutoSize = $true
    $script:judgementLabel.Location = New-Object System.Drawing.Point(640, 286)
    $script:form.Controls.Add($script:judgementLabel)
    $script:judgementResetTimer = $null

    $script:assistLabel = New-Object System.Windows.Forms.Label
    $script:assistLabel.Text = 'Keep combo alive to wake the room up.'
    $script:assistLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
    $script:assistLabel.MaximumSize = New-Object System.Drawing.Size(280, 0)
    $script:assistLabel.AutoSize = $true
    $script:assistLabel.Location = New-Object System.Drawing.Point(640, 316)
    $script:form.Controls.Add($script:assistLabel)

    $script:startButton = New-Object System.Windows.Forms.Button
    $script:startButton.Text = 'Soundcheck Set'
    $script:startButton.Location = New-Object System.Drawing.Point(640, 366)
    $script:startButton.Size = New-Object System.Drawing.Size(180, 42)
    $script:startButton.BackColor = [System.Drawing.Color]::FromArgb(86, 255, 208)
    $script:startButton.FlatStyle = 'Flat'
    $script:form.Controls.Add($script:startButton)

    $script:controlLabel = New-Object System.Windows.Forms.Label
    $script:controlLabel.Text = 'Controls: A S D F hit   P/Space pause   R restart the set'
    $script:controlLabel.ForeColor = [System.Drawing.Color]::FromArgb(151, 238, 255)
    $script:controlLabel.MaximumSize = New-Object System.Drawing.Size(280, 0)
    $script:controlLabel.AutoSize = $true
    $script:controlLabel.Location = New-Object System.Drawing.Point(640, 418)
    $script:form.Controls.Add($script:controlLabel)

    $script:bestLabel = New-Object System.Windows.Forms.Label
    $script:bestLabel.Text = 'Best crowd: 0 score / phase 1'
    $script:bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(151, 238, 255)
    $script:bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $script:bestLabel.AutoSize = $true
    $script:bestLabel.Location = New-Object System.Drawing.Point(640, 458)
    $script:form.Controls.Add($script:bestLabel)

    $script:recapLabel = New-Object System.Windows.Forms.Label
    $script:recapLabel.Text = 'Last show: none yet'
    $script:recapLabel.ForeColor = [System.Drawing.Color]::FromArgb(214, 214, 214)
    $script:recapLabel.MaximumSize = New-Object System.Drawing.Size(280, 0)
    $script:recapLabel.AutoSize = $true
    $script:recapLabel.Location = New-Object System.Drawing.Point(640, 490)
    $script:form.Controls.Add($script:recapLabel)

    $script:titleLabel = New-Object System.Windows.Forms.Label
    $script:titleLabel.Text = 'Stage title: garage opener'
    $script:titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 185, 86)
    $script:titleLabel.MaximumSize = New-Object System.Drawing.Size(280, 0)
    $script:titleLabel.AutoSize = $true
    $script:titleLabel.Location = New-Object System.Drawing.Point(640, 548)
    $script:form.Controls.Add($script:titleLabel)
}
