$env:PATH = 'C:\Users\Jk Lee\.cargo\bin;C:\Users\Jk Lee\.avm\bin;C:\Users\Jk Lee\.local\share\solana\install\active_release\bin;' + $env:PATH
Set-Location 'C:\Users\Jk Lee\Documents\GitHub\BAY_Mileage_Store'
New-Item -ItemType Directory -Force -Path 'C:\Temp' | Out-Null
$p = Start-Process -FilePath 'C:\Users\Jk Lee\.avm\bin\anchor-0.32.1' -ArgumentList 'build' -Wait -PassThru -NoNewWindow -RedirectStandardOutput 'C:\Temp\anchor-out.txt' -RedirectStandardError 'C:\Temp\anchor-err.txt'
Write-Output "ExitCode: $($p.ExitCode)"
if (Test-Path 'C:\Temp\anchor-out.txt') {
    Write-Output "=== STDOUT ==="
    Get-Content 'C:\Temp\anchor-out.txt'
}
if (Test-Path 'C:\Temp\anchor-err.txt') {
    Write-Output "=== STDERR ==="
    Get-Content 'C:\Temp\anchor-err.txt'
}
