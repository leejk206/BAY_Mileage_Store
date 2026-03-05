export const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").trim();

export function checkIsAdmin(
  address: string | null | undefined
): boolean {
  const envAdmin = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").trim();

  if (!envAdmin) {
    if (typeof window !== "undefined") {
      console.error("NEXT_PUBLIC_ADMIN_ADDRESS is not defined");
    }
    return false;
  }

  if (!address) return false;

  const walletAddress = address.trim();

  return walletAddress === envAdmin;
}

