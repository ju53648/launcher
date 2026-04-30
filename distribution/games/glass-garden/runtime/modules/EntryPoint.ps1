function Start-GlassGardenRuntime {
    $resetButton.Add_Click({ Reset-Run })
    Reset-Run
    [void]$form.ShowDialog()
}
