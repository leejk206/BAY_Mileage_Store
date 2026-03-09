## BAY Mileage Store — Devnet Configuration (Single Source of Truth)

이 파일은 Solana Devnet 환경에서 사용하는 핵심 온체인 주소의 **단일 진실 소스(Single Source of Truth)** 입니다.
프론트엔드, 스크립트, 문서는 모두 이 값을 기준으로 설정해야 합니다.

### Program

- **Program ID**  
  `8vLkdQq3Ya6ZRx4ApVLsBC6s1aLbS5dkEH29fJa8oMuW`

### Token (BAY SPL Mint)

- **BAY Mint (devnet)**  
  `agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB`

### Store Configuration

- **StoreConfig PDA**  
  _Derived from `PROGRAM_ID` and seeds `[b"store_config_v2"]`_

- **Authority Wallet (StoreConfig.authority)**  
  _Set at runtime via `initialize_store` (see admin flow)_

### RPC Endpoint

- **Devnet RPC URL (기본값)**  
  `https://api.devnet.solana.com`

> 변경이 필요할 경우: 이 파일을 먼저 업데이트한 다음, 루트 `.env` 및 `web/.env.local`(또는 `web/.env.example`)을 이 값에 맞춰 수정하세요.

