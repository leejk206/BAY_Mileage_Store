"use client";

import { useEffect, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

type Purchase = {
  publicKey: string;
  itemPubkey: string;
  itemName?: string;
  amountBurned: number;
  timestamp: number;
  purchaseIndex?: number;
};

export default function MyPurchasesPage() {
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program || !publicKey) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // Filter by buyer pubkey (offset 8: discriminator)
        const accounts = await (program as any).account.purchaseReceipt.all([
          {
            memcmp: {
              offset: 8,
              bytes: publicKey.toBase58(),
            },
          },
        ]);
        const mapped: Purchase[] = accounts.map((acc: any) => ({
          publicKey: acc.publicKey.toBase58(),
          itemPubkey: acc.account.item.toBase58(),
          amountBurned: Number(acc.account.amountBurned),
          timestamp: Number(acc.account.timestamp),
          purchaseIndex:
            typeof acc.account.purchaseIndex !== "undefined"
              ? Number(acc.account.purchaseIndex)
              : undefined,
        }));

        // Resolve item names for each unique item pubkey
        const uniqueItemPubkeys = Array.from(
          new Set(mapped.map((p) => p.itemPubkey))
        );

        const itemNameMap = new Map<string, string>();
        await Promise.all(
          uniqueItemPubkeys.map(async (pkStr) => {
            try {
              const pk = new PublicKey(pkStr);
              const itemAccount: any = await (program as any).account.storeItem.fetch(
                pk
              );
              itemNameMap.set(pkStr, itemAccount.name as string);
            } catch {
              // ignore failures, fallback to pubkey
            }
          })
        );

        const withNames: Purchase[] = mapped.map((p) => ({
          ...p,
          itemName: itemNameMap.get(p.itemPubkey),
        }));

        // Sort by timestamp desc, then purchaseIndex asc
        withNames.sort((a, b) => {
          if (a.timestamp !== b.timestamp) {
            return b.timestamp - a.timestamp;
          }
          const ai = a.purchaseIndex ?? 0;
          const bi = b.purchaseIndex ?? 0;
          return ai - bi;
        });

        setPurchases(withNames);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load purchases");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, publicKey]);

  if (!publicKey) {
    return (
      <main className="container">
        <h1>My Purchases</h1>
        <p>Please connect your wallet to view your purchase history.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>My Purchases</h1>

      {loading && <p>Loading purchases...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && purchases.length === 0 && (
        <p>No purchases found for this wallet.</p>
      )}

      <ul className="list">
        {purchases.map((p) => (
          <li key={p.publicKey} className="list-item">
            <div>
              <div>
                Item:{" "}
                {p.itemName ? `${p.itemName} (${p.itemPubkey})` : p.itemPubkey}
              </div>
              {typeof p.purchaseIndex === "number" && (
                <div>Purchase index: {p.purchaseIndex}</div>
              )}
              <div>Amount burned: {p.amountBurned}</div>
            </div>
            <div className="muted">
              {new Date(p.timestamp * 1000).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

