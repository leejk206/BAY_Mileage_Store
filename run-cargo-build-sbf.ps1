$env:PATH = 'C:\Users\Jk Lee\.cargo\bin;C:\Users\Jk Lee\.avm\bin;C:\Users\Jk Lee\.local\share\solana\install\active_release\bin;' + $env:PATH
Set-Location 'C:\Users\Jk Lee\Documents\GitHub\BAY_Mileage_Store\programs\bay-mileage-store'
New-Item -ItemType Directory -Force -Path 'C:\Temp' | Out-Null
$p = Start-Process -FilePath 'C:\Users\Jk Lee\.local\share\solana\install\active_release\bin\cargo-build-sbf.exe' -Wait -PassThru -NoNewWindow -RedirectStandardOutput 'C:\Temp\sbf-out.txt' -RedirectStandardError 'C:\Temp\sbf-err.txt'
Write-Output "ExitCode: $($p.ExitCode)"
if (Test-Path 'C:\Temp\sbf-out.txt') {
    Write-Output "=== STDOUT ==="
    Get-Content 'C:\Temp\sbf-out.txt'
}
if (Test-Path 'C:\Temp\sbf-err.txt') {
    Write-Output "=== STDERR (last 50 lines) ==="
    Get-Content 'C:\Temp\sbf-err.txt' | Select-Object -Last 50
}
