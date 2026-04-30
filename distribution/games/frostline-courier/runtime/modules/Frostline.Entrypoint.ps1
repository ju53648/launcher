function Start-FrostlineCourierRuntime {
    Register-FrostlineEvents
    Reset-Route
    Update-Hud
    [void]$form.ShowDialog()
}
