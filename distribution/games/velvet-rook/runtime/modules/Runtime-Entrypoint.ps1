function Register-VelvetRookHandlers {
    for ($row = 0; $row -lt $size; $row++) {
        for ($col = 0; $col -lt $size; $col++) {
            $cellButton = $buttons[$row][$col]
            $cellButton.Add_MouseEnter({
                param($sender, $eventArgs)
                Set-HoverPreview([string]$sender.Tag)
            })
            $cellButton.Add_MouseLeave({
                param($sender, $eventArgs)
                Clear-HoverPreview
            })
            $cellButton.Add_GotFocus({
                param($sender, $eventArgs)
                Set-HoverPreview([string]$sender.Tag)
            })
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

    $undoButton.Add_Click({
        if (Restore-UndoSnapshot) {
            $status.Text = 'Last move rewound. Re-evaluate the board before committing again.'
            Update-Board
            Update-PreviewText
        }
    })

    $form.Add_KeyDown({
        param($sender, $eventArgs)
        if ($eventArgs.KeyCode -eq 'U') {
            if (Restore-UndoSnapshot) {
                $status.Text = 'Last move rewound. Re-evaluate the board before committing again.'
                Update-Board
                Update-PreviewText
            }
        }
    })
}

function Start-VelvetRookRuntime {
    Register-VelvetRookHandlers
    Build-Level
    [void]$form.ShowDialog()
}
