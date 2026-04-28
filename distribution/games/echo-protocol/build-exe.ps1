$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $scriptDir "EchoProtocol.cs"
$outFile = Join-Path $scriptDir "EchoProtocol.exe"

if (-not (Test-Path $sourceFile)) {
  throw "Source not found: $sourceFile"
}

if (Test-Path $outFile) {
  Remove-Item -LiteralPath $outFile -Force
}

Add-Type -TypeDefinition (Get-Content $sourceFile -Raw) `
  -ReferencedAssemblies @("System.Windows.Forms.dll", "System.Drawing.dll") `
  -OutputType WindowsApplication `
  -OutputAssembly $outFile

Write-Host "Built $outFile"
