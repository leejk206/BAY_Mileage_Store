$env:PATH = 'C:\Users\Jk Lee\.cargo\bin;C:\Users\Jk Lee\.avm\bin;C:\Users\Jk Lee\.local\share\solana\install\active_release\bin;' + $env:PATH

# Show rustup toolchains
Write-Output "=== rustup toolchains ==="
& 'C:\Users\Jk Lee\.cargo\bin\rustup.exe' toolchain list 2>&1

Write-Output "`n=== cargo version ==="
& 'C:\Users\Jk Lee\.cargo\bin\cargo.exe' --version 2>&1

Write-Output "`n=== solana version ==="
& 'C:\Users\Jk Lee\.local\share\solana\install\active_release\bin\solana.exe' --version 2>&1

Write-Output "`n=== cargo-build-sbf ==="
& 'C:\Users\Jk Lee\.local\share\solana\install\active_release\bin\cargo-build-sbf.exe' --version 2>&1
