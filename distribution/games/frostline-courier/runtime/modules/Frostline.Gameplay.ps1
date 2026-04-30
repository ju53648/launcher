function New-Contract {
    $options = 0..($stations.Count - 1) | Where-Object { $_ -ne $script:location }
    $script:target = Get-Random -InputObject $options
    $status.Text = "Current contract: $($stations[$script:target].Name)"
}

function Update-Hud {
    $hud.Text = "Station: $($stations[$script:location].Name)    Fuel: $($script:fuel)    Deliveries: $($script:deliveries)    Score: $($script:score)"
    $hud.ForeColor = if ($script:fuel -le 2) { [System.Drawing.Color]::FromArgb(255, 160, 40) } else { [System.Drawing.Color]::White }
    foreach ($button in $buttons) {
        $button.BackColor = if ([int]$button.Tag -eq $script:location) {
            [System.Drawing.Color]::FromArgb(255, 214, 100)
        }
        elseif ([int]$button.Tag -eq $script:target) {
            [System.Drawing.Color]::FromArgb(105, 172, 255)
        }
        else {
            [System.Drawing.Color]::FromArgb(34, 46, 66)
        }
    }
}

function Travel-To([int]$destination) {
    if ($destination -eq $script:location) { return }
    $cost = $distances[$script:location][$destination]
    if ($cost -gt $script:fuel) {
        $status.Text = "Need $cost fuel, have $($script:fuel) -- $($stations[$script:target].Name) still pending."
        return
    }

    $script:fuel -= $cost
    $script:location = $destination
    $fuelBeforeBonus = $script:fuel
    $script:fuel = [Math]::Min(12, $script:fuel + $stations[$destination].Bonus)
    $justDelivered = $false
    if ($script:location -eq $script:target) {
        $justDelivered = $true
        $script:deliveries += 1
        $script:score += 25 + ($fuelBeforeBonus * 2) + ($cost * 4)
        $bonusLine = ''
        if ((Get-Random -Minimum 0 -Maximum 1000) -lt 25) {
            $script:score += 6
            $bonusLine = ' Hermit relay +6!'
        }
        New-Contract
        $status.Text = "Delivered!$bonusLine  Next: $($stations[$script:target].Name)"
    }
    else {
        $script:score = [Math]::Max(0, $script:score + 3 - $cost)
        $costToTarget = $distances[$script:location][$script:target]
        $status.Text = "Cargo still onboard -- deliver to $($stations[$script:target].Name) (need $costToTarget fuel)."
    }

    if ($script:fuel -le 0) {
        $stallMsg = if ($justDelivered) { "Last delivery made -- convoy stalled." } else { "Convoy stalled." }
        [System.Windows.Forms.MessageBox]::Show("$stallMsg`nDeliveries: $($script:deliveries)  |  Score: $($script:score)", 'Frostline Courier') | Out-Null
        Reset-Route
    }
    else {
        $reachable = 0..($stations.Count - 1) | Where-Object { $_ -ne $script:location -and $distances[$script:location][$_] -le $script:fuel }
        if (-not $reachable) {
            $strandMsg = if ($justDelivered) { "Last delivery made -- convoy stranded." } else { "Convoy stranded -- no affordable routes." }
            [System.Windows.Forms.MessageBox]::Show("$strandMsg`nDeliveries: $($script:deliveries)  |  Score: $($script:score)", 'Frostline Courier') | Out-Null
            Reset-Route
        }
    }

    Update-Hud
}

function Reset-Route {
    $script:location = 0
    $script:fuel = 8
    $script:score = 0
    $script:deliveries = 0
    New-Contract
}
