param(
    [string[]]$GameSlugs
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$gamesRoot = Join-Path $repoRoot 'distribution\games'
$distributionManifestRoot = Join-Path $repoRoot 'distribution\manifests\games'
$embeddedManifestRoot = Join-Path $repoRoot 'src-tauri\manifests'
$templatePath = Join-Path $PSScriptRoot 'RuntimeGameHost.cs.tpl'
$automationAssembly = 'C:\Windows\Microsoft.NET\assembly\GAC_MSIL\System.Management.Automation\v4.0_3.0.0.0__31bf3856ad364e35\System.Management.Automation.dll'
$runtimeHostProfiles = @{
    'frostline-courier' = @{
        Intro = 'Chart the safest cargo route, stretch every unit of fuel, and keep the storm from eating your margin.'
        StartLabel = 'Start Route'
        FeatureOne = 'Read the route intel before committing to a long burn.'
        FeatureTwo = 'Build delivery streaks and cash them into score pressure relief.'
        FeatureThree = 'Deploy the supply cache at the right moment to save a collapsing run.'
        ControlOne = 'Click a station to travel there from your current depot.'
        ControlTwo = 'Hover a stop to preview distance, fuel cost and contract pressure.'
        ControlThree = 'Use Reset Route to begin a fresh logistics run.'
        Footer = 'Premium pass: native launch, cleaner route readability, field log feedback and stronger run recovery tools.'
        Accent = @(150, 229, 255)
    }
    'glass-garden' = @{
        Intro = 'Memorize the beds, preserve the sunlight budget, and restore the greenhouse across three fragile seasons.'
        StartLabel = 'Start Season'
        FeatureOne = 'Garden Focus reveals the full board for a short emergency read.'
        FeatureTwo = 'Combo blooms repair pressure and slow the decay spiral.'
        FeatureThree = 'Perfect seasons pay out real score and stability bonuses.'
        ControlOne = 'Click matching beds to bloom the pair before sunlight fades.'
        ControlTwo = 'Press H for Garden Focus when charges are available.'
        ControlThree = 'Press R or Start Season to reset into a fresh run.'
        Footer = 'Premium pass: native launch, clearer card states, better decay tuning and stronger season-level payoffs.'
        Accent = @(137, 212, 176)
    }
    'graveyard-shift' = @{
        Intro = 'Hold the yard together, read ghost telegraphs early, and chain lantern work into a stable score run.'
        StartLabel = 'Light Lanterns'
        FeatureOne = 'Threat cues are sharper so misses feel fair instead of random.'
        FeatureTwo = 'Combo flow now matters, with better score lift for clean handling.'
        FeatureThree = 'Best-score persistence keeps each run inside a longer mastery loop.'
        ControlOne = 'Click the haunted tiles before they age out of the lantern cycle.'
        ControlTwo = 'Watch the legend and status text to read the next danger surge.'
        ControlThree = 'Use the main action button to start the next yard shift.'
        Footer = 'Premium pass: native launch, clearer ghost telegraphs, combo scoring and a stronger replay loop.'
        Accent = @(204, 255, 146)
    }
    'neon-circuit' = @{
        Intro = 'Ride the grid, chain sync gates, bank pulse energy, and survive the overload waves without burning out.'
        StartLabel = 'Energize Circuit'
        FeatureOne = 'Fairer spawns reward routing skill instead of cheap collisions.'
        FeatureTwo = 'Pulse cascades now cash out into real momentum swings.'
        FeatureThree = 'Pause, restart and board feedback keep the run readable at full speed.'
        ControlOne = 'Arrow keys move the rider through the live board.'
        ControlTwo = 'Press Space to fire a charged pulse burst across nearby nodes.'
        ControlThree = 'Press P to pause, Enter to start and R to reset the run.'
        Footer = 'Premium pass: native launch, stronger pulse payoff, cleaner wave feedback and tighter arcade readability.'
        Accent = @(57, 255, 192)
    }
    'pocket-heist' = @{
        Intro = 'Read the floor, ghost the patrol lines, and extract three clean bags before the whole tower locks down.'
        StartLabel = 'Start Job'
        FeatureOne = 'Threat scan borders expose next-turn guard pressure at a glance.'
        FeatureTwo = 'Intel pickups now buy real ghost passes and recovery windows.'
        FeatureThree = 'Hot extractions become score-positive instead of pure punishment.'
        ControlOne = 'Use the arrow keys to move one tile at a time through the floor.'
        ControlTwo = 'Press Space to drop smoke and break the patrol read.'
        ControlThree = 'Press Enter to start or retry and R to restart the current job.'
        Footer = 'Premium pass: native launch, sharper stealth readability, better intel rewards and cleaner restart flow.'
        Accent = @(255, 214, 74)
    }
    'tempo-trashfire' = @{
        Intro = 'Keep the crowd alive, hold the lane timing together, and turn a collapsing set into a clutch recovery.'
        StartLabel = 'Start Set'
        FeatureOne = 'Judgements and lane flashes now read instantly under pressure.'
        FeatureTwo = 'Clutch assist keeps low-crowd moments tense without becoming hopeless.'
        FeatureThree = 'Pause and restart support make reruns feel fast and deliberate.'
        ControlOne = 'Hit the lane keys on time to maintain the crowd meter.'
        ControlTwo = 'Watch the judgement feedback and lane flashes for recovery windows.'
        ControlThree = 'Use pause and restart controls to reset a set cleanly.'
        Footer = 'Premium pass: native launch, more readable rhythm feedback and stronger crowd-recovery pacing.'
        Accent = @(255, 129, 89)
    }
    'velvet-rook' = @{
        Intro = 'Thread the rook through hostile lines, steal every sigil on the board, and survive the sentinel response.'
        StartLabel = 'Enter Board'
        FeatureOne = 'Hover previews expose move cost, blockers and danger before you commit.'
        FeatureTwo = 'Undo lets one bad read become a lesson instead of a dead run.'
        FeatureThree = 'Risk labels and haven bonuses make the board easier to parse fast.'
        ControlOne = 'Click a straight lane destination to move the rook there.'
        ControlTwo = 'Hover a square to preview route cost and post-move danger.'
        ControlThree = 'Press U or use Undo Last Move to rewind the latest commitment.'
        Footer = 'Premium pass: native launch, board previews, undo support and cleaner tactical readability.'
        Accent = @(238, 153, 209)
    }
    'word-reactor' = @{
        Intro = 'Process the live command queue under heat, keep the streak alive, and stop the reactor from tipping over.'
        StartLabel = 'Start Reactor'
        FeatureOne = 'Directive modifiers turn the queue into a richer scoring system.'
        FeatureTwo = 'Live typing feedback makes misses easier to correct before heat spikes.'
        FeatureThree = 'Heat and timer tuning now produce cleaner comeback windows.'
        ControlOne = 'Type the active command and commit it before the queue punishes you.'
        ControlTwo = 'Use FLUSH, VENT and GAMBIT at the right moment to swing the run.'
        ControlThree = 'Use the Start button to begin a new containment cycle.'
        Footer = 'Premium pass: native launch, better typing feedback, stronger directive play and fairer reactor pacing.'
        Accent = @(255, 196, 68)
    }
}

if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) {
    throw "Host template not found: $templatePath"
}

if (-not (Test-Path -LiteralPath $automationAssembly -PathType Leaf)) {
    throw "System.Management.Automation assembly not found: $automationAssembly"
}

if (-not $GameSlugs -or $GameSlugs.Count -eq 0) {
    $GameSlugs = Get-ChildItem -LiteralPath $gamesRoot -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName 'runtime\modules') } |
        Select-Object -ExpandProperty Name |
        Where-Object { $_ -ne 'echo-protocol' -and $_ -ne 'lumorix-dropdash' }
}

function Write-JsonFile([string]$Path, $Value) {
    $json = $Value | ConvertTo-Json -Depth 30
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Escape-CSharpLiteral([string]$Value) {
    if ($null -eq $Value) {
        return ''
    }

    return $Value.Replace('\', '\\').Replace('"', '\"')
}

function Get-RuntimeHostProfile([string]$GameSlug, [string]$GameName) {
    if ($runtimeHostProfiles.ContainsKey($GameSlug)) {
        return $runtimeHostProfiles[$GameSlug]
    }

    return @{
        Intro = "Launch into $GameName with the native Lumorix runtime host."
        StartLabel = 'Start'
        FeatureOne = 'Native launch flow for a cleaner first-run experience.'
        FeatureTwo = 'Direct controls and status framing before the run begins.'
        FeatureThree = 'Polished desktop packaging for launcher delivery.'
        ControlOne = 'Use the in-game controls shown after launch.'
        ControlTwo = 'Press Enter to begin the build.'
        ControlThree = 'Close the window to leave the release shell.'
        Footer = 'Official Lumorix runtime build.'
        Accent = @(118, 239, 255)
    }
}

function Update-ManifestForExe([string]$ManifestPath, [string]$ExecutableName) {
    $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    $manifest.executable = $ExecutableName

    if ($manifest.PSObject.Properties.Name -contains 'changelog') {
        foreach ($entry in $manifest.changelog) {
            if ($entry.PSObject.Properties.Name -contains 'items') {
                for ($index = 0; $index -lt $entry.items.Count; $index++) {
                    $entry.items[$index] = [string]$entry.items[$index] `
                        -replace 'Runs as a native PowerShell Windows Forms desktop window\.', 'Runs as a native Windows desktop executable with the Lumorix runtime host.' `
                        -replace 'Uses a PowerShell Windows Forms runtime so it launches as a native desktop window\.', 'Uses the Lumorix runtime host so it launches as a native Windows desktop executable.'
                }
            }
        }
    }

    Write-JsonFile $ManifestPath $manifest
    return $manifest
}

$template = Get-Content -LiteralPath $templatePath -Raw

foreach ($gameSlug in $GameSlugs) {
    $distributionManifestPath = Join-Path $distributionManifestRoot "$gameSlug.json"
    $embeddedManifestPath = Join-Path $embeddedManifestRoot "$gameSlug.json"
    $runtimeDir = Join-Path $gamesRoot "$gameSlug\runtime"

    if (-not (Test-Path -LiteralPath $distributionManifestPath -PathType Leaf)) {
        throw "Distribution manifest not found for ${gameSlug}: $distributionManifestPath"
    }
    if (-not (Test-Path -LiteralPath $embeddedManifestPath -PathType Leaf)) {
        throw "Embedded manifest not found for ${gameSlug}: $embeddedManifestPath"
    }
    if (-not (Test-Path -LiteralPath $runtimeDir -PathType Container)) {
        throw "Runtime directory not found for ${gameSlug}: $runtimeDir"
    }

    $distributionManifest = Get-Content -LiteralPath $distributionManifestPath -Raw | ConvertFrom-Json
    $launchScript = $null
    if ($distributionManifest.executable -like '*.ps1') {
        $launchScript = [string]$distributionManifest.executable
    }
    else {
        $launchScriptCandidates = @(
            Get-ChildItem -LiteralPath $runtimeDir -Filter 'Launch-*.ps1' -File |
                Select-Object -ExpandProperty Name
        )

        if ($launchScriptCandidates.Count -ne 1) {
            throw "Could not infer unique launch script for ${gameSlug} in $runtimeDir"
        }

        $launchScript = [string]$launchScriptCandidates[0]
    }

    $launchScriptPath = Join-Path $runtimeDir $launchScript
    if (-not (Test-Path -LiteralPath $launchScriptPath -PathType Leaf)) {
        throw "Launch script not found for ${gameSlug}: $launchScriptPath"
    }

    $exeName = [string]$distributionManifest.executable
    if ($exeName -notlike '*.exe') {
        $exeName = [System.IO.Path]::GetFileNameWithoutExtension($launchScript)
        if ($exeName.StartsWith('Launch-', [System.StringComparison]::OrdinalIgnoreCase)) {
            $exeName = $exeName.Substring(7)
        }
        $exeName = "$exeName.exe"
    }

    $exePath = Join-Path $runtimeDir $exeName

    if (Test-Path -LiteralPath $exePath) {
        Remove-Item -LiteralPath $exePath -Force
    }

    $hostProfile = Get-RuntimeHostProfile -GameSlug $gameSlug -GameName ([string]$distributionManifest.name)
    $accent = @($hostProfile.Accent)
    if ($accent.Count -ne 3) {
        throw "Accent profile for ${gameSlug} must contain exactly 3 values."
    }

    $hostSource = (
        $template.Replace('__ASSEMBLY_TITLE__', (Escape-CSharpLiteral $distributionManifest.name))
    ).Replace('__GAME_TITLE__', (Escape-CSharpLiteral $distributionManifest.name)).
      Replace('__DEVELOPER_NAME__', (Escape-CSharpLiteral $distributionManifest.developer)).
      Replace('__LAUNCH_SCRIPT__', (Escape-CSharpLiteral $launchScript)).
      Replace('__GAME_INTRO__', (Escape-CSharpLiteral $hostProfile.Intro)).
      Replace('__START_LABEL__', (Escape-CSharpLiteral $hostProfile.StartLabel)).
      Replace('__FEATURE_ONE__', (Escape-CSharpLiteral $hostProfile.FeatureOne)).
      Replace('__FEATURE_TWO__', (Escape-CSharpLiteral $hostProfile.FeatureTwo)).
      Replace('__FEATURE_THREE__', (Escape-CSharpLiteral $hostProfile.FeatureThree)).
      Replace('__CONTROL_ONE__', (Escape-CSharpLiteral $hostProfile.ControlOne)).
      Replace('__CONTROL_TWO__', (Escape-CSharpLiteral $hostProfile.ControlTwo)).
      Replace('__CONTROL_THREE__', (Escape-CSharpLiteral $hostProfile.ControlThree)).
      Replace('__FOOTER_TEXT__', (Escape-CSharpLiteral $hostProfile.Footer)).
      Replace('__ACCENT_R__', ([string]$accent[0])).
      Replace('__ACCENT_G__', ([string]$accent[1])).
      Replace('__ACCENT_B__', ([string]$accent[2]))

    Add-Type -TypeDefinition $hostSource `
        -ReferencedAssemblies @(
            'System.Windows.Forms.dll',
            'System.Drawing.dll',
            $automationAssembly
        ) `
        -OutputType WindowsApplication `
        -OutputAssembly $exePath

    Update-ManifestForExe -ManifestPath $distributionManifestPath -ExecutableName $exeName | Out-Null
    Update-ManifestForExe -ManifestPath $embeddedManifestPath -ExecutableName $exeName | Out-Null

    Write-Host "Built runtime host for $gameSlug -> $exeName"
}
