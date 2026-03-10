"use client";

import { useEffect, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BAY_DECIMAL_FACTOR } from "../constants";
import { GlassCard } from "../../components/ui/GlassCard";
import { SectionHeader } from "../../components/ui/SectionHeader";

type Purchase = {
  publicKey: string;
  itemPubkey: string;
  itemName?: string;
  itemImageUrl?: string;
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
  const [itemsLoading, setItemsLoading] = useState(false);
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

        const itemMetaMap = new Map<
          string,
          { name?: string; imageUrl?: string }
        >();
        setItemsLoading(true);
        await Promise.all(
          uniqueItemPubkeys.map(async (pkStr) => {
            try {
              const pk = new PublicKey(pkStr);
              const itemAccount: any = await (program as any).account.storeItem.fetch(
                pk
              );
              itemMetaMap.set(pkStr, {
                name: itemAccount.displayName as string,
                imageUrl: itemAccount.imageUrl as string,
              });
            } catch {
              // ignore failures, fallback to pubkey
            }
          })
        );
        setItemsLoading(false);

        const withNames: Purchase[] = mapped.map((p) => {
          const meta = itemMetaMap.get(p.itemPubkey);
          return {
            ...p,
            itemName: meta?.name,
            itemImageUrl: meta?.imageUrl,
          };
        });

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
      {!loading && itemsLoading && !error && (
        <p className="muted mt-1 text-sm">아이템 정보 불러오는 중...</p>
      )}
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
                    <th className="py-2 pr-4">Price (BAY)</th>
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
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md border border-white/10 bg-slate-900">
                            {p.itemImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.itemImageUrl}
                                alt={p.itemName ?? "Item image"}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%231f2937'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='9'%3ENo%3C/text%3E%3C/svg%3E";
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[0.6rem] text-slate-400">
                                No
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.8rem] font-medium">
                              {p.itemName ?? "알 수 없는 아이템"}
                            </span>
                            <span className="text-[0.8rem] text-gray-500">
                              {p.itemPubkey}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-[0.8rem]">
                        {(p.amountBurned / BAY_DECIMAL_FACTOR).toString()}
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

