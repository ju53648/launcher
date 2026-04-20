param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath
)

$certSha1 = $env:LUMORIX_SIGN_CERT_SHA1
$timestampUrl = if ($env:LUMORIX_SIGN_TIMESTAMP_URL) { $env:LUMORIX_SIGN_TIMESTAMP_URL } else { "http://timestamp.digicert.com" }

if ([string]::IsNullOrWhiteSpace($certSha1)) {
  Write-Host "Skipping Windows code signing because LUMORIX_SIGN_CERT_SHA1 is not set."
  exit 0
}

$signTool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe"
if (!(Test-Path $signTool)) {
  throw "signtool.exe not found at $signTool. Install Windows SDK Signing Tools."
}

& $signTool sign /sha1 $certSha1 /fd SHA256 /tr $timestampUrl /td SHA256 "$FilePath"
if ($LASTEXITCODE -ne 0) {
  throw "signtool failed with exit code $LASTEXITCODE"
}
