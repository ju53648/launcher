function Register-FrostlineEvents {
    foreach ($button in $buttons) {
        $button.Add_MouseEnter({
            param($sender, $eventArgs)
            Select-Station([int]$sender.Tag)
        })

        $button.Add_GotFocus({
            param($sender, $eventArgs)
            Select-Station([int]$sender.Tag)
        })

        $button.Add_Click({
            param($sender, $eventArgs)
            Select-Station([int]$sender.Tag)
            Travel-To([int]$sender.Tag)
        })
    }

    $startButton.Add_Click({
        Reset-Route
        Update-Hud
    })

    $cacheButton.Add_Click({
        Use-SupplyCache
    })

    $form.Add_KeyDown({
        param($sender, $eventArgs)

        switch ($eventArgs.KeyCode) {
            'Enter' {
                Travel-To([int]$script:selectedStation)
                $eventArgs.SuppressKeyPress = $true
            }
            'C' {
                Use-SupplyCache
                $eventArgs.SuppressKeyPress = $true
            }
            'R' {
                Reset-Route
                Update-Hud
                $eventArgs.SuppressKeyPress = $true
            }
        }
    })
}
