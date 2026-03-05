export const env = {
  NEXT_PUBLIC_SOLANA_CLUSTER:
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  NEXT_PUBLIC_RPC_URL:
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
  // 기본값은 DEVNET_CONFIG.md 에 기록된 devnet 주소와 동일하게 맞춰 둡니다.
  // 실제 배포 시에는 .env.local / 환경변수로 오버라이드하는 것을 권장합니다.
  NEXT_PUBLIC_PROGRAM_ID:
    process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag",
  NEXT_PUBLIC_BAY_MINT:
    process.env.NEXT_PUBLIC_BAY_MINT ??
    "agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB",
  NEXT_PUBLIC_STORE_CONFIG_PDA:
    process.env.NEXT_PUBLIC_STORE_CONFIG_PDA ??
    "9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn",
} as const;

