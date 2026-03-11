export const env = {
  NEXT_PUBLIC_SOLANA_CLUSTER:
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  // SOLANA RPC URL: 항상 Devnet 을 향하도록 강제.
  // 1순위: NEXT_PUBLIC_SOLANA_RPC_URL (권장)
  // 2순위: 아무 것도 없으면 기본 devnet RPC 사용.
  NEXT_PUBLIC_SOLANA_RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  // NEXT_PUBLIC_RPC_URL 은 과거 호환용으로만 유지하며, 항상 devnet 기본값으로만 사용.
  NEXT_PUBLIC_RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  // 기본값은 DEVNET_CONFIG.md 에 기록된 devnet 주소와 동일하게 맞춰 둡니다.
  // 실제 배포 시에는 .env.local / 환경변수로 오버라이드하는 것을 권장합니다.
  NEXT_PUBLIC_PROGRAM_ID:
    process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "8vLkdQq3Ya6ZRx4ApVLsBC6s1aLbS5dkEH29fJa8oMuW",
  NEXT_PUBLIC_BAY_MINT:
    process.env.NEXT_PUBLIC_BAY_MINT ??
    "agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB",
} as const;

