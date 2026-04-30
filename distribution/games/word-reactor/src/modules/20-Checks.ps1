Set-StrictMode -Version Latest

function Test-RuntimeLaunchExists {
  $launchPath = Get-RuntimeLaunchPath
  if (-not (Test-Path $launchPath)) {
    throw "Runtime launch script missing: $launchPath"
  }
}

function Test-RuntimeLaunchParser {
  $launchPath = Get-RuntimeLaunchPath
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($launchPath, [ref]$tokens, [ref]$errors) | Out-Null
  if ($errors.Count -gt 0) {
    $first = $errors[0]
    throw "Parser failed for $launchPath at line $($first.Extent.StartLineNumber): $($first.Message)"
  }
}
