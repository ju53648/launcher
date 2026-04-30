function New-GraveyardShiftUi {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Graveyard Shift'
    $form.StartPosition = 'CenterScreen'
    $form.ClientSize = New-Object System.Drawing.Size(980, 620)
    $form.BackColor = [System.Drawing.Color]::FromArgb(15, 17, 28)
    $form.FormBorderStyle = 'FixedSingle'
    $form.MaximizeBox = $false

    $title = New-Object System.Windows.Forms.Label
    $title.Text = 'GRAVEYARD SHIFT'
    $title.ForeColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $title.Font = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Bold)
    $title.AutoSize = $true
    $title.Location = New-Object System.Drawing.Point(22, 16)
    $form.Controls.Add($title)

    $yard = New-Object System.Windows.Forms.Panel
    $yard.Location = New-Object System.Drawing.Point(22, 58)
    $yard.Size = New-Object System.Drawing.Size(700, 530)
    $yard.BackColor = [System.Drawing.Color]::FromArgb(24, 33, 42)
    $form.Controls.Add($yard)

    $hud = New-Object System.Windows.Forms.Label
    $hud.Text = 'Score: 0    Lanterns: 3    Time: 45'
    $hud.ForeColor = [System.Drawing.Color]::White
    $hud.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
    $hud.AutoSize = $true
    $hud.Location = New-Object System.Drawing.Point(748, 78)
    $form.Controls.Add($hud)

    $status = New-Object System.Windows.Forms.Label
    $status.Text = 'Keep the graves quiet.'
    $status.ForeColor = [System.Drawing.Color]::FromArgb(255, 188, 121)
    $status.MaximumSize = New-Object System.Drawing.Size(190, 0)
    $status.AutoSize = $true
    $status.Location = New-Object System.Drawing.Point(748, 126)
    $form.Controls.Add($status)

    $startButton = New-Object System.Windows.Forms.Button
    $startButton.Text = 'Light Lanterns'
    $startButton.Location = New-Object System.Drawing.Point(748, 210)
    $startButton.Size = New-Object System.Drawing.Size(180, 42)
    $startButton.FlatStyle = 'Flat'
    $startButton.BackColor = [System.Drawing.Color]::FromArgb(204, 255, 146)
    $form.Controls.Add($startButton)

    return @{
        Form = $form
        Yard = $yard
        Hud = $hud
        Status = $status
        StartButton = $startButton
    }
}
