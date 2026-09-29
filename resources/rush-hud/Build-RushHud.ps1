param([switch]$Install)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & node --test model.test.mjs motion.test.mjs radar.test.mjs theme.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'HUD tests failed.' }
    & node --check app.mjs
    if ($LASTEXITCODE -ne 0) { throw 'HUD syntax check failed.' }
    $outputDirectory = Join-Path $PSScriptRoot 'dist'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $archive = Join-Path $outputDirectory 'rush-hud.zip'
    Compress-Archive -Path index.html,hud.json,panel.json,images.json,app.mjs,model.mjs,motion.mjs,radar.mjs,theme.mjs,view.mjs,style.css,preview.mjs,assets,README.md,FEATURE-PARITY.md,LICENSE -DestinationPath $archive -Force
    $archiveHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    Set-Content -LiteralPath (Join-Path $outputDirectory 'SHA256SUMS.txt') -Value "$archiveHash  rush-hud.zip" -Encoding ascii
    Write-Output "Package: $archive"
    if ($Install) {
        if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'Use pwsh (PowerShell 7) for -Install.' }
        Invoke-RestMethod -Uri 'http://localhost:1349/api/huds/upload-zip' -Method Post -Form @{ hud = Get-Item $archive }
    }
} finally {
    Pop-Location
}
