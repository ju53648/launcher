function New-GraveyardShiftUi {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Graveyard Shift'
    $form.StartPosition = 'CenterScreen'
    $form.ClientSize = New-Object System.Drawing.Size(980, 620)
    $form.BackColor = [System.Drawing.Color]::FromArgb(15, 17, 28)
    $form.FormBorderStyle = 'FixedSingle'
    $form.MaximizeBox = $false

    $title = New-Object System.Windows.Forms.Label
    $title.Text = 'GRAVEYARD SHIFT // LANTERN WATCH'
    $title.ForeColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
    $title.AutoSize = $true
    $title.Location = New-Object System.Drawing.Point(22, 16)
    $form.Controls.Add($title)

    $yard = New-Object System.Windows.Forms.Panel
    $yard.Location = New-Object System.Drawing.Point(22, 58)
    $yard.Size = New-Object System.Drawing.Size(700, 530)
    $yard.BackColor = [System.Drawing.Color]::FromArgb(24, 33, 42)
    $yard.BorderStyle = 'FixedSingle'
    $form.Controls.Add($yard)

    $hud = New-Object System.Windows.Forms.Label
    $hud.Text = 'Score: 0    Lanterns: 3    Time: 45'
    $hud.ForeColor = [System.Drawing.Color]::White
    $hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
    $hud.AutoSize = $true
    $hud.Location = New-Object System.Drawing.Point(748, 78)
    $form.Controls.Add($hud)

    $comboLabel = New-Object System.Windows.Forms.Label
    $comboLabel.Text = 'Combo: x1'
    $comboLabel.ForeColor = [System.Drawing.Color]::FromArgb(156, 225, 255)
    $comboLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $comboLabel.AutoSize = $true
    $comboLabel.Location = New-Object System.Drawing.Point(748, 110)
    $form.Controls.Add($comboLabel)

    $bestLabel = New-Object System.Windows.Forms.Label
    $bestLabel.Text = 'Best: 0'
    $bestLabel.ForeColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $bestLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $bestLabel.AutoSize = $true
    $bestLabel.Location = New-Object System.Drawing.Point(748, 136)
    $form.Controls.Add($bestLabel)

    $status = New-Object System.Windows.Forms.Label
    $status.Text = 'Hold the lantern corridor. Nothing leaves the ground twice.'
    $status.ForeColor = [System.Drawing.Color]::FromArgb(255, 188, 121)
    $status.MaximumSize = New-Object System.Drawing.Size(190, 0)
    $status.AutoSize = $true
    $status.Location = New-Object System.Drawing.Point(748, 174)
    $form.Controls.Add($status)

    $startButton = New-Object System.Windows.Forms.Button
    $startButton.Text = 'Open Night Shift'
    $startButton.Location = New-Object System.Drawing.Point(748, 248)
    $startButton.Size = New-Object System.Drawing.Size(180, 42)
    $startButton.FlatStyle = 'Flat'
    $startButton.BackColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $form.Controls.Add($startButton)

    $legendTitle = New-Object System.Windows.Forms.Label
    $legendTitle.Text = 'FIELD NOTES'
    $legendTitle.ForeColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $legendTitle.Font = New-Object System.Drawing.Font('Consolas', 12, [System.Drawing.FontStyle]::Bold)
    $legendTitle.AutoSize = $true
    $legendTitle.Location = New-Object System.Drawing.Point(748, 322)
    $form.Controls.Add($legendTitle)

    $legendBody = New-Object System.Windows.Forms.Label
    $legendBody.Text = "SPT  quiet drift`r`nPGT  gleam surge`r`nHEX  bad marker`r`n`r`nCold blue turns amber, then red before a spirit breaks the lane.`r`nKeep a streak alive to bank score bursts and extra clock."
    $legendBody.ForeColor = [System.Drawing.Color]::FromArgb(215, 219, 230)
    $legendBody.MaximumSize = New-Object System.Drawing.Size(200, 0)
    $legendBody.AutoSize = $true
    $legendBody.Location = New-Object System.Drawing.Point(748, 352)
    $form.Controls.Add($legendBody)

    return @{
        Form = $form
        Yard = $yard
        Hud = $hud
        ComboLabel = $comboLabel
        BestLabel = $bestLabel
        Status = $status
        StartButton = $startButton
    }
}
