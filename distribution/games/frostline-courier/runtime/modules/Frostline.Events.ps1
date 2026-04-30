function Register-FrostlineEvents {
    foreach ($button in $buttons) {
        $button.Add_Click({
            param($sender, $eventArgs)
            Travel-To([int]$sender.Tag)
        })
    }

    $startButton.Add_Click({
        Reset-Route
        Update-Hud
    })
}
