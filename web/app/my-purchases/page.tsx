"use client";

import { useEffect, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { GlassCard } from "../../components/ui/GlassCard";
import { SectionHeader } from "../../components/ui/SectionHeader";

type Purchase = {
  publicKey: string;
  itemPubkey: string;
  itemName?: string;
  amountBurned: number;
  timestamp: number;
  purchaseIndex?: number;
  txSignature?: string; // not stored yet; for future extension
};

export default function MyPurchasesPage() {
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

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

  const filtered = purchases.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.itemName?.toLowerCase().includes(q) ||
      p.itemPubkey.toLowerCase().includes(q)
    );
  });

  const displayPurchases = [...filtered].sort((a, b) => {
    if (a.timestamp === b.timestamp) return 0;
    return sortOrder === "newest"
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp;
  });

  if (!publicKey) {
    return (
      <main className="container">
        <SectionHeader
          title="My Receipts"
          subtitle="Connect your wallet to view your BAY burn history."
        />
        <p className="muted">
          Please connect your wallet to view your purchase history.
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <SectionHeader
        title="My Receipts"
        subtitle="On-chain receipts for your BAY burns."
      />

              {loading && <p className="muted">Loading purchases...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && purchases.length === 0 && (
          <GlassCard className="mt-4 text-center p-8">
          <div className="text-3xl mb-2 neon-text">◎</div>
          <p className="font-medium">No purchases yet</p>
          <p className="muted mt-1 text-sm">
            Your BAY burn history will appear here after you complete a purchase.
          </p>
        </GlassCard>
      )}

      {!loading && !error && purchases.length > 0 && (
        <>
          <GlassCard className="mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Search by item name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <div className="flex items-center gap-2">
                <span className="text-[0.8rem] text-gray-400">Sort</span>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "newest" | "oldest")
                  }
                  className="rounded-[8px] border border-white/15 bg-black/40 px-2 py-1 text-[0.8rem] text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[0.8rem] text-gray-200">
                <thead className="border-b border-white/10 text-[0.8rem] uppercase tracking-[0.16em] text-gray-400">
                  <tr>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Burned (BAY)</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Receipt index</th>
                    <th className="py-2 pr-2">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPurchases.map((p) => (
                    <tr
                      key={p.publicKey}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="text-[0.8rem] font-medium">
                            {p.itemName ?? p.itemPubkey}
                          </span>
                          {p.itemName && (
                            <span className="text-[0.8rem] text-gray-500">
                              {p.itemPubkey}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-[0.8rem]">
                        {(p.amountBurned / 1_000_000).toString()}
                      </td>
                      <td className="py-2 pr-4 text-[0.8rem] text-gray-400">
                        {new Date(p.timestamp * 1000).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-[0.8rem]">
                        {typeof p.purchaseIndex === "number"
                          ? p.purchaseIndex
                          : "—"}
                      </td>
                      <td className="py-2 pr-2 text-[0.8rem] text-gray-500">
                        N/A
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </main>
  );
}

