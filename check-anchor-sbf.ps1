$env:PATH = 'C:\Users\Jk Lee\.cargo\bin;C:\Users\Jk Lee\.avm\bin;C:\Users\Jk Lee\.local\share\solana\install\active_release\bin;' + $env:PATH

# Check what solana tools anchor expects
Write-Output "=== Anchor.toml ==="
Get-Content 'C:\Users\Jk Lee\Documents\GitHub\BAY_Mileage_Store\Anchor.toml'

Write-Output "`n=== Platform tools installed ==="
Get-ChildItem 'C:\Users\Jk Lee\.local\share\solana\install\active_release\bin\deps' -ErrorAction SilentlyContinue | Select-Object -First 10

Write-Output "`n=== Rustup show ==="
& 'C:\Users\Jk Lee\.cargo\bin\rustup.exe' show 2>&1

Write-Output "`n=== sbpf toolchain location ==="
& 'C:\Users\Jk Lee\.cargo\bin\rustup.exe' toolchain list --verbose 2>&1
