# Phase 1 Setup — 실행 가이드

PowerShell (관리자 권한)에서 순서대로 실행.

---

## Step 1: Solana CLI 설치

```powershell
$url = "https://release.anza.xyz/stable/solana-install-init-x86_64-pc-windows-msvc.exe"
$out = "$env:TEMP\solana-install-init.exe"
Invoke-WebRequest $url -OutFile $out
& $out stable
```

설치 후 **PowerShell 재시작**, 그 다음 실행:

```powershell
$env:Path += ";$env:USERPROFILE\.local\share\solana\install\active_release\bin"
solana --version
```

---

## Step 2: Anchor (AVM) 설치 — 10~20분 소요

```powershell
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest
avm use latest
anchor --version
```

---

## Step 3: spl-token-cli 설치

```powershell
cargo install spl-token-cli
spl-token --version
```

---

## Step 4: Node.js 설치

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## Step 5: Anchor 워크스페이스 초기화

```powershell
cd "C:\Users\ljk91\OneDrive\문서\GitHub\BAY_Mileage_Store"
anchor init bay-mileage-store --no-git
Copy-Item -Recurse bay-mileage-store\* . -Force
Remove-Item -Recurse -Force bay-mileage-store
anchor build
anchor keys sync
anchor build
$PROGRAM_ID = ((anchor keys list) -join '') -replace '(?s).*?([1-9A-HJ-NP-Za-km-z]{32,44}).*', '$1'
Write-Host "PROGRAM_ID: $PROGRAM_ID"
```

---

## Step 6: BAY SPL Token 생성

```powershell
solana config set --url devnet
solana airdrop 2
solana balance

$mintOutput = (spl-token create-token --decimals 6) -join ''
$BAY_MINT = [regex]::Match($mintOutput, '[1-9A-HJ-NP-Za-km-z]{32,44}').Value
Write-Host "BAY_MINT: $BAY_MINT"

spl-token create-account $BAY_MINT
spl-token mint $BAY_MINT 1000000
```

---

## Step 7: 테스트 지갑 생성 및 BAY 민팅

```powershell
New-Item -ItemType Directory -Force wallets
solana-keygen new --outfile wallets\test-wallet.json --no-bip39-passphrase
$TEST_WALLET_PUBKEY = (solana-keygen pubkey wallets\test-wallet.json).Trim()
Write-Host "TEST_WALLET: $TEST_WALLET_PUBKEY"

solana airdrop 1 $TEST_WALLET_PUBKEY

$accountOutput = (spl-token create-account $BAY_MINT --owner $TEST_WALLET_PUBKEY) -join ''
$TEST_TOKEN_ACCOUNT = [regex]::Match($accountOutput, '[1-9A-HJ-NP-Za-km-z]{32,44}').Value
spl-token mint $BAY_MINT 100000 $TEST_TOKEN_ACCOUNT
```

---

## Step 8: 최종 값 확인 — 이 출력을 Claude에 붙여넣기

```powershell
$DEPLOYER_PUBKEY = (solana address).Trim()

Write-Host ""
Write-Host "=== Claude에 붙여넣기 ==="
Write-Host "PROGRAM_ID=$PROGRAM_ID"
Write-Host "BAY_MINT=$BAY_MINT"
Write-Host "TEST_WALLET_PUBKEY=$TEST_WALLET_PUBKEY"
Write-Host "DEPLOYER_PUBKEY=$DEPLOYER_PUBKEY"
```
