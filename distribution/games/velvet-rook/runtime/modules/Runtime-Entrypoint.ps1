function Register-VelvetRookHandlers {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $cellButton = $buttons[$row][$col]
            $cellButton.Add_Click({
                param($sender, $eventArgs)
                Move-Rook([string]$sender.Tag)
            })
        }
    }

    $resetButton.Add_Click({
        $recapLabel.Text = "Last board: manual reset (was level $($script:level), score $($script:score))"
        $script:level = 1
        $script:score = 0
        $script:shieldCharges = 0
        $status.Text = 'New board. Watch the threatened lines.'
        Build-Level
    })
}

function Start-VelvetRookRuntime {
    Register-VelvetRookHandlers
    Build-Level
    [void]$form.ShowDialog()
}
