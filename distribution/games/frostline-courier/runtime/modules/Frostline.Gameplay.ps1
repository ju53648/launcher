function Get-StationLabel([int]$stationIndex) {
    $bonus = [int]$stations[$stationIndex].Bonus
    if ($bonus -gt 0) {
        return "$($stations[$stationIndex].Name) (+$bonus)"
    }

    return $stations[$stationIndex].Name
}

function Get-RunTitle {
    if ($script:deliveries -ge 8 -and $script:maxStreak -ge 4 -and $script:score -ge 220) {
        return 'whiteout legend'
    }
    if ($script:deliveries -ge 6 -and $script:score -ge 170) {
        return 'ice road closer'
    }
    if ($script:deliveries -ge 4 -or $script:score -ge 120) {
        return 'relay specialist'
    }
    return 'snowline rookie'
}

function Update-CareerLabel {
    $careerLabel.Text = "Best run: $($script:bestScore) score / $($script:bestDeliveries) deliveries / $($script:bestTitle)  |  Best condition: $($script:bestCondition)"
}

function Load-Progress {
    if (-not (Test-Path $script:savePath)) {
        Update-CareerLabel
        return
    }

    try {
        $saveData = Get-Content $script:savePath -Raw | ConvertFrom-Json
        if ($null -ne $saveData.bestScore) {
            $script:bestScore = [int]$saveData.bestScore
        }
        if ($null -ne $saveData.bestDeliveries) {
            $script:bestDeliveries = [int]$saveData.bestDeliveries
        }
        if ($null -ne $saveData.bestTitle) {
            $script:bestTitle = [string]$saveData.bestTitle
        }
        if ($null -ne $saveData.bestCondition) {
            $script:bestCondition = [string]$saveData.bestCondition
        }
    }
    catch {
    }

    Update-CareerLabel
}

function Save-Progress {
    $candidateTitle = Get-RunTitle
    $improved = $false

    if ($script:score -gt $script:bestScore) {
        $script:bestScore = $script:score
        $improved = $true
    }
    if ($script:deliveries -gt $script:bestDeliveries) {
        $script:bestDeliveries = $script:deliveries
        $improved = $true
    }
    if ($improved) {
        $script:bestTitle = $candidateTitle
        if ($null -ne $script:runCondition) {
            $script:bestCondition = [string]$script:runCondition.Name
        }
    }

    $payload = @{
        bestScore = $script:bestScore
        bestDeliveries = $script:bestDeliveries
        bestTitle = $script:bestTitle
        bestCondition = $script:bestCondition
    } | ConvertTo-Json

    Set-Content -Path $script:savePath -Value $payload -Encoding UTF8
    Update-CareerLabel
}

function New-RunCondition {
    $conditions = @(
        @{
            Name = 'Clear lanes'
            Description = 'Balanced dispatch. Standard payout, standard fuel pressure.'
            StartingFuel = 8
            DeliveryBonus = 0
            CacheFuel = 3
            RelayScore = 0
            StreakBonus = 0
            DockBonusBoost = 0
        },
        @{
            Name = 'Whiteout charter'
            Description = 'Lower opening fuel, but contracts pay richer and caches hit harder.'
            StartingFuel = 7
            DeliveryBonus = 12
            CacheFuel = 4
            RelayScore = 0
            StreakBonus = 2
            DockBonusBoost = 0
        },
        @{
            Name = 'Festival relay'
            Description = 'Stations run hotter: better dock gains and relay stops do not feel dead.'
            StartingFuel = 8
            DeliveryBonus = 4
            CacheFuel = 3
            RelayScore = 4
            StreakBonus = 0
            DockBonusBoost = 1
        },
        @{
            Name = 'Tight margins'
            Description = 'Standard fuel, but clean handoffs explode in value if you stay disciplined.'
            StartingFuel = 8
            DeliveryBonus = 0
            CacheFuel = 2
            RelayScore = 0
            StreakBonus = 7
            DockBonusBoost = 0
        }
    )

    return Get-Random -InputObject $conditions
}

function Add-EventLog([string]$message) {
    if ([string]::IsNullOrWhiteSpace($message)) {
        return
    }

    $script:eventLog = @($message) + @($script:eventLog)
    if ($script:eventLog.Count -gt 5) {
        $script:eventLog = @($script:eventLog[0..4])
    }

    $logBody.Text = $script:eventLog -join "`r`n"
}

function Select-Station([int]$stationIndex) {
    if ($stationIndex -lt 0 -or $stationIndex -ge $stations.Count) {
        return
    }

    $script:selectedStation = $stationIndex
    Update-Hud
}

function Get-CleanHandoffBonus {
    $conditionBonus = if ($null -ne $script:runCondition) { [int]$script:runCondition.StreakBonus } else { 0 }
    return 4 + ($script:routeStreak * 4) + $conditionBonus
}

function Show-EndOfRun([string]$headline) {
    Save-Progress
    $title = Get-RunTitle
    $conditionName = if ($null -ne $script:runCondition) { $script:runCondition.Name } else { 'Clear lanes' }
    [System.Windows.Forms.MessageBox]::Show(
        "$headline`nDeliveries: $($script:deliveries)  |  Score: $($script:score)  |  Best streak: $($script:maxStreak)`nRun title: $title  |  Dispatch condition: $conditionName",
        'Frostline Courier'
    ) | Out-Null
    Reset-Route
    Update-Hud
}

function New-Contract {
    $options = 0..($stations.Count - 1) | Where-Object { $_ -ne $script:location }
    $script:target = Get-Random -InputObject $options
    $script:contractHops = 0
    $script:selectedStation = $script:target
    $status.Text = "Current contract: $(Get-StationLabel $script:target)"
}

function Update-RouteIntel {
    $contractLabel.Text = "Contract: $(Get-StationLabel $script:target)"

    $cacheState = if ($script:usedSupplyDrop) { 'Spent' } else { 'Ready (+3 fuel)' }
    if ($null -ne $script:runCondition) {
        $cacheState = if ($script:usedSupplyDrop) { 'Spent' } else { "Ready (+$($script:runCondition.CacheFuel) fuel)" }
        $legendLabel.Text = "Cond: $($script:runCondition.Name)`r`nStreak: $($script:routeStreak)   Best: $($script:maxStreak)`r`nCache: $cacheState"
    }
    else {
        $legendLabel.Text = "Streak: $($script:routeStreak)   Best: $($script:maxStreak)`r`nCache: $cacheState"
    }

    $selected = if ($script:selectedStation -ge 0 -and $script:selectedStation -lt $stations.Count) {
        $script:selectedStation
    }
    else {
        $script:target
    }

    if ($selected -eq $script:location) {
        $routeBody.Text = @(
            "Selected stop: $(Get-StationLabel $selected)"
            'Status: Current depot.'
            'Move preview: Pick another stop'
            'to see fuel, bonus, and reward'
            'projections before departure.'
        ) -join "`r`n"
        return
    }

    $cost = $distances[$script:location][$selected]
    $fuelAfterTravel = [Math]::Max(0, $script:fuel - $cost)
    $dockBonusBoost = if ($null -ne $script:runCondition) { [int]$script:runCondition.DockBonusBoost } else { 0 }
    $dockBonus = [int]$stations[$selected].Bonus + $dockBonusBoost
    $fuelAfterDock = [Math]::Min(12, $fuelAfterTravel + $dockBonus)
    $shortfall = [Math]::Max(0, $cost - $script:fuel)
    $isContractStop = $selected -eq $script:target

    $outcome = if ($isContractStop) { 'Delivery completes the contract.' } else { 'Cargo stays onboard after docking.' }
    $routeNote = if ($isContractStop) {
        if ($script:contractHops -eq 0) {
            "One-hop handoff bonus: +$(Get-CleanHandoffBonus)"
        }
        else {
            'Detour delivery: streak will reset.'
        }
    }
    else {
        'Relay stop: useful for fuel, but it breaks a clean handoff streak.'
    }

    $statusLine = if ($shortfall -eq 0) { 'Route is clear.' } else { "Need $shortfall more fuel." }

    $rewardLine = if ($isContractStop) {
        $deliveryBonus = if ($null -ne $script:runCondition) { [int]$script:runCondition.DeliveryBonus } else { 0 }
        $deliveryReward = 25 + ($fuelAfterTravel * 2) + ($cost * 4) + $deliveryBonus
        "Projected delivery reward: +$deliveryReward"
    }
    else {
        $relayScore = if ($null -ne $script:runCondition) { [int]$script:runCondition.RelayScore } else { 0 }
        if ($relayScore -gt 0) {
            "Projected reward: relay reposition (+$relayScore floor pressure rebate)."
        }
        else {
            'Projected reward: reposition only.'
        }
    }

    $routeBody.Text = @(
        "Selected stop: $(Get-StationLabel $selected)"
        "Cost: $cost fuel"
        "Arrival fuel: $fuelAfterTravel"
        "Dock bonus: +$dockBonus"
        "Fuel after docking: $fuelAfterDock"
        $rewardLine
        "Outcome: $outcome"
        "Route note: $routeNote"
        "Status: $statusLine"
        $(if ($null -ne $script:runCondition) { "Dispatch note: $($script:runCondition.Description)" } else { '' })
    ) -join "`r`n"
}

function Update-Hud {
    $hud.Text = "Station: $($stations[$script:location].Name)    Fuel: $($script:fuel)    Deliveries: $($script:deliveries)    Score: $($script:score)"
    $hud.ForeColor = if ($script:fuel -le 2) { [System.Drawing.Color]::FromArgb(255, 160, 40) } else { [System.Drawing.Color]::White }

    for ($index = 0; $index -lt $buttons.Count; $index++) {
        $button = $buttons[$index]
        $stationLabel = Get-StationLabel $index
        $cost = $distances[$script:location][$index]

        if ($index -eq $script:location) {
            $button.Text = "$stationLabel`r`nCurrent depot"
            $button.Enabled = $false
            $button.BackColor = [System.Drawing.Color]::FromArgb(255, 214, 100)
            $button.ForeColor = [System.Drawing.Color]::FromArgb(12, 22, 34)
        }
        else {
            $button.Text = "$stationLabel`r`nCost $cost fuel"
            $button.Enabled = $cost -le $script:fuel
            $button.ForeColor = if ($button.Enabled) { [System.Drawing.Color]::White } else { [System.Drawing.Color]::FromArgb(120, 135, 156) }

            if (-not $button.Enabled) {
                $button.BackColor = [System.Drawing.Color]::FromArgb(27, 35, 49)
            }
            elseif ($index -eq $script:target) {
                $button.BackColor = [System.Drawing.Color]::FromArgb(67, 121, 194)
            }
            else {
                $button.BackColor = [System.Drawing.Color]::FromArgb(34, 46, 66)
            }
        }

        $button.FlatAppearance.BorderSize = if ($index -eq $script:selectedStation) { 2 } else { 1 }
        $button.FlatAppearance.BorderColor = if ($index -eq $script:selectedStation) {
            [System.Drawing.Color]::FromArgb(150, 229, 255)
        }
        elseif ($index -eq $script:target) {
            [System.Drawing.Color]::FromArgb(150, 205, 255)
        }
        else {
            [System.Drawing.Color]::FromArgb(62, 80, 107)
        }
    }

    $cacheButton.Enabled = (-not $script:usedSupplyDrop) -and ($script:fuel -lt 12)
    $cacheFuel = if ($null -ne $script:runCondition) { [int]$script:runCondition.CacheFuel } else { 3 }
    $cacheButton.Text = if ($script:usedSupplyDrop) { 'Supply Cache Spent' } else { "Deploy Supply Cache (+$cacheFuel fuel)" }
    $cacheButton.BackColor = if ($cacheButton.Enabled) {
        [System.Drawing.Color]::FromArgb(104, 191, 161)
    }
    else {
        [System.Drawing.Color]::FromArgb(52, 76, 78)
    }

    Update-RouteIntel
}

function Use-SupplyCache {
    if ($script:usedSupplyDrop -or $script:fuel -ge 12) {
        return
    }

    $fuelBefore = $script:fuel
    $cacheFuel = if ($null -ne $script:runCondition) { [int]$script:runCondition.CacheFuel } else { 3 }
    $script:usedSupplyDrop = $true
    $script:fuel = [Math]::Min(12, $script:fuel + $cacheFuel)

    if ($script:routeStreak -gt 0) {
        $script:routeStreak = 0
        Add-EventLog("Supply cache deployed at $($stations[$script:location].Name). Fuel $fuelBefore->$($script:fuel). Clean handoff streak reset.")
    }
    else {
        Add-EventLog("Supply cache deployed at $($stations[$script:location].Name). Fuel $fuelBefore->$($script:fuel).")
    }

    $status.Text = "Supply cache deployed. Fresh range available from $($stations[$script:location].Name)."
    Update-Hud
}

function Travel-To([int]$destination) {
    if ($destination -eq $script:location) {
        return
    }

    Select-Station $destination

    $cost = $distances[$script:location][$destination]
    if ($cost -gt $script:fuel) {
        $status.Text = "Need $cost fuel, have $($script:fuel) -- $(Get-StationLabel $script:target) still pending."
        return
    }

    $origin = $script:location
    $script:fuel -= $cost
    $script:location = $destination
    $script:contractHops += 1

    $fuelBeforeBonus = $script:fuel
    $dockBonusBoost = if ($null -ne $script:runCondition) { [int]$script:runCondition.DockBonusBoost } else { 0 }
    $dockBonus = [int]$stations[$destination].Bonus + $dockBonusBoost
    $script:fuel = [Math]::Min(12, $script:fuel + $dockBonus)
    $justDelivered = $false

    if ($script:location -eq $script:target) {
        $justDelivered = $true
        $deliveredTo = Get-StationLabel $destination
        $script:deliveries += 1

        $deliveryBonus = if ($null -ne $script:runCondition) { [int]$script:runCondition.DeliveryBonus } else { 0 }
        $deliveryScore = 25 + ($fuelBeforeBonus * 2) + ($cost * 4) + $deliveryBonus
        $script:score += $deliveryScore

        $bonusNotes = @()
        if ($script:contractHops -eq 1) {
            $chainBonus = Get-CleanHandoffBonus
            $script:routeStreak += 1
            $script:maxStreak = [Math]::Max($script:maxStreak, $script:routeStreak)
            $script:score += $chainBonus
            $bonusNotes += "Clean handoff +$chainBonus"
        }
        else {
            if ($script:routeStreak -gt 0) {
                $bonusNotes += 'Streak reset by detour'
            }
            $script:routeStreak = 0
        }

        if ((Get-Random -Minimum 0 -Maximum 1000) -lt 25) {
            $script:score += 6
            $bonusNotes += 'Hermit relay +6'
        }

        New-Contract
        $status.Text = "Delivered to $deliveredTo. Next contract: $(Get-StationLabel $script:target)"

        $logMessage = "Delivered to $deliveredTo for +$deliveryScore."
        if ($bonusNotes.Count -gt 0) {
            $logMessage = "$logMessage $($bonusNotes -join ' | ')."
        }
        Add-EventLog($logMessage)
    }
    else {
        if ($script:routeStreak -gt 0) {
            $script:routeStreak = 0
            Add-EventLog("Relay stop at $(Get-StationLabel $destination). Clean handoff streak broken.")
        }

        $relayScore = if ($null -ne $script:runCondition) { [int]$script:runCondition.RelayScore } else { 0 }
        $script:score = [Math]::Max(0, $script:score + 3 + $relayScore - $cost)
        $costToTarget = $distances[$script:location][$script:target]
        $status.Text = "Cargo still onboard -- deliver to $(Get-StationLabel $script:target) (need $costToTarget fuel)."
        Add-EventLog("Moved $($stations[$origin].Name) -> $(Get-StationLabel $destination). Fuel $fuelBeforeBonus->$($script:fuel) after docking bonus.")
    }

    if ($script:fuel -le 0) {
        if (-not $script:usedSupplyDrop) {
            $status.Text = "Convoy stalled, but a supply cache can still get you moving."
            Add-EventLog('Convoy stalled at zero fuel. Supply cache is your last recovery.')
            Update-Hud
            return
        }

        $stallMsg = if ($justDelivered) { 'Last delivery made -- convoy stalled.' } else { 'Convoy stalled.' }
        Show-EndOfRun $stallMsg
        return
    }

    $reachable = 0..($stations.Count - 1) | Where-Object {
        $_ -ne $script:location -and $distances[$script:location][$_] -le $script:fuel
    }
    if (-not $reachable) {
        if (-not $script:usedSupplyDrop) {
            $status.Text = "No route affordable from $($stations[$script:location].Name). Supply cache available."
            Add-EventLog("Convoy boxed in at $($stations[$script:location].Name). Supply cache can reopen the map.")
            Update-Hud
            return
        }

        $strandMsg = if ($justDelivered) { 'Last delivery made -- convoy stranded.' } else { 'Convoy stranded -- no affordable routes.' }
        Show-EndOfRun $strandMsg
        return
    }

    Update-Hud
}

function Reset-Route {
    $script:runCondition = New-RunCondition
    $script:location = 0
    $script:fuel = [int]$script:runCondition.StartingFuel
    $script:score = 0
    $script:deliveries = 0
    $script:routeStreak = 0
    $script:maxStreak = 0
    $script:usedSupplyDrop = $false
    $script:eventLog = @()
    New-Contract
    $status.Text = "Current contract: $(Get-StationLabel $script:target)"
    Add-EventLog("Dispatch condition: $($script:runCondition.Name) -- $($script:runCondition.Description)")
    Add-EventLog("Fresh convoy deployed from Aster with $($script:fuel) fuel on the gauge.")
    Add-EventLog('Hover any stop to preview fuel, delivery reward, and docking bonus.')
}
