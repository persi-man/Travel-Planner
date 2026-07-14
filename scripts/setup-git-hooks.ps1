$Root = Split-Path -Parent $PSScriptRoot
$HookSrc = Join-Path $Root ".githooks\commit-msg"
$HooksDir = Join-Path $Root ".git\hooks"
$HookDst = Join-Path $HooksDir "commit-msg"

if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

Copy-Item -Path $HookSrc -Destination $HookDst -Force
Write-Host "Git commit-msg hook installed at $HookDst"
