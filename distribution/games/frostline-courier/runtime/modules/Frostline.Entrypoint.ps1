function Start-FrostlineCourierRuntime {
    Register-FrostlineEvents
    Load-Progress
    Reset-Route
    Update-Hud
    [void]$form.ShowDialog()
}
