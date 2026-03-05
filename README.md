BAY_Mileage_Store

## Deployment Notes

- **Program ID (devnet)**: `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- **BAY MINT (devnet)**: `agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB`
- **StoreConfig PDA (devnet)**: `9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn`

- **Redeploy to devnet**
  - Ensure `Anchor.toml` has `provider.cluster = "devnet"` and `programs.devnet.bay_mileage_store` matches the `declare_id!` in `lib.rs`.
  - Run:
    - `anchor build`
    - `anchor deploy`

- **Re-initialize StoreConfig (devnet)**
  - The StoreConfig PDA is derived with seeds `[b"store_config"]`, so only one config exists per program.
  - If you need to (re)initialize on a fresh devnet:
    - Make sure `BAY_MINT` exists and the deployer wallet has mint authority.
    - Run the smoke test task **a)**, or manually call `initialize_store` via Anchor/CLI with:
      - `storeConfig = STORE_CONFIG_PDA`
      - `bayMint = BAY_MINT`
      - `authority = <deployer wallet pubkey>`
  - For a hard reset on devnet, you typically airdrop a new wallet and redeploy the program; PDAs are deterministic and will be re-created on first initialization.