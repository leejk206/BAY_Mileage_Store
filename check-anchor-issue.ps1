# Check if anchor can find its cargo-build-sbf
$env:PATH = 'C:\Users\Jk Lee\.cargo\bin;C:\Users\Jk Lee\.avm\bin;C:\Users\Jk Lee\.local\share\solana\install\active_release\bin;' + $env:PATH

Write-Output "=== anchor version ==="
& 'C:\Users\Jk Lee\.avm\bin\anchor-0.32.1' --version 2>&1

Write-Output "`n=== anchor build --skip-lint (verbose error) ==="
Set-Location 'C:\Users\Jk Lee\Documents\GitHub\BAY_Mileage_Store'

New-Item -ItemType Directory -Force -Path 'C:\Temp' | Out-Null
$p = Start-Process -FilePath 'C:\Users\Jk Lee\.avm\bin\anchor-0.32.1' -ArgumentList 'build','--skip-lint' -Wait -PassThru -NoNewWindow -RedirectStandardOutput 'C:\Temp\anchor-out2.txt' -RedirectStandardError 'C:\Temp\anchor-err2.txt'
Write-Output "ExitCode: $($p.ExitCode)"
if (Test-Path 'C:\Temp\anchor-out2.txt') {
    Write-Output "=== STDOUT ==="
    Get-Content 'C:\Temp\anchor-out2.txt'
}
if (Test-Path 'C:\Temp\anchor-err2.txt') {
    Write-Output "=== STDERR (last 30 lines) ==="
    Get-Content 'C:\Temp\anchor-err2.txt' | Select-Object -Last 30
}
