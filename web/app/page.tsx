"use client";

import { useEffect, useMemo, useState } from "react";
import { useAnchorProgram } from "../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../lib/env";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BAY_DECIMAL_FACTOR } from "./constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { GlassCard } from "../components/ui/GlassCard";
import { NeonButton } from "../components/ui/NeonButton";
import { Badge } from "../components/ui/Badge";
import { StatPill } from "../components/ui/StatPill";
import { SectionHeader } from "../components/ui/SectionHeader";

type StoreItem = {
  publicKey: string;
  name: string; // internal ID
  displayName: string; // user-facing label
  price: number;
  stock: number;
  imageUrl?: string;
};

export default function CatalogPage() {
  const { program, connection } = useAnchorProgram();
  const { publicKey } = useWallet();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bayBalance, setBayBalance] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const programId = new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID);
  const bayMint = new PublicKey(env.NEXT_PUBLIC_BAY_MINT);
  const storeConfigPda = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("store_config_v2")],
      programId
    );
    return pda;
  }, [programId]);

  useEffect(() => {
    if (!program) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const conn =
          connection ?? (program as any).provider?.connection;
        const rawAccounts = await conn.getProgramAccounts(program.programId);
        const coder = (program as any).coder;

        const decoded: StoreItem[] = [];
        for (const acc of rawAccounts) {
          try {
            const itemAccount: any = coder.accounts.decode(
              "storeItem",
              acc.account.data
            );
            decoded.push({
              publicKey: acc.pubkey.toBase58(),
              name: itemAccount.name as string,
              displayName: itemAccount.displayName as string,
              price: Number(itemAccount.price),
              stock: Number(itemAccount.stock),
              imageUrl: itemAccount.imageUrl as string | undefined,
            });
          } catch {
            // Not a StoreItem or old layout; safely ignore
          }
        }

        setItems(decoded);
      } catch (e: any) {
        // For MVP, just show a simple message
        setError(e?.message ?? "Failed to load catalog");
      } finally {
        setLoading(false);
      }
    })();
  }, [program]);

  // Load BAY token balance for connected wallet
  useEffect(() => {
    if (!publicKey) {
      setBayBalance(null);
      setSolBalance(null);
      return;
    }
    (async () => {
      try {
        const ata = await getAssociatedTokenAddress(
          bayMint,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const info = await connection.getTokenAccountBalance(ata);
        setBayBalance(info.value.uiAmountString ?? info.value.amount);
      } catch {
        setBayBalance("0");
      }

      try {
        const lamports = await connection.getBalance(publicKey);
        setSolBalance((lamports / LAMPORTS_PER_SOL).toFixed(3));
      } catch {
        setSolBalance(null);
      }
    })();
  }, [connection, publicKey, bayMint]);

  async function handleBuy(item: StoreItem) {
    if (!program || !publicKey) return;
    setError(null);
    setLastTx(null);
    setBuying(item.publicKey);
    try {
      // Derive PDAs
      const itemPda = PublicKey.findProgramAddressSync(
        [Buffer.from("item"), Buffer.from(item.name)],
        programId
      )[0];

      const receiptCounterPda = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt_counter"), publicKey.toBuffer(), itemPda.toBuffer()],
        programId
      )[0];

      // Fetch current counter (if exists) to determine next index
      let nextIndex = 0;
      try {
        const counter: any = await (program as any).account.receiptCounter.fetch(
          receiptCounterPda
        );
        nextIndex = Number(counter.nextIndex);
      } catch {
        nextIndex = 0;
      }

      const indexBytes = Buffer.alloc(8);
      indexBytes.writeBigUInt64LE(BigInt(nextIndex));

      const receiptPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("receipt"),
          publicKey.toBuffer(),
          itemPda.toBuffer(),
          indexBytes,
        ],
        programId
      )[0];

      const buyerAta = await getAssociatedTokenAddress(
        bayMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      let needsAta = false;
      try {
        await getAccount(connection, buyerAta);
      } catch {
        needsAta = true;
      }

      const preIxs = [];
      if (needsAta) {
        preIxs.push(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            buyerAta,
            publicKey, // owner
            bayMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      const txSig = await (program as any).methods
        .purchase()
        .accounts({
          buyer: publicKey,
          buyerTokenAccount: buyerAta,
          bayMint,
          storeConfig: storeConfigPda,
          item: itemPda,
          receiptCounter: receiptCounterPda,
          receipt: receiptPda,
        })
        .preInstructions(preIxs)
        .rpc();

      setLastTx(txSig);

      // Refresh catalog and balance
      const conn =
        connection ?? (program as any).provider?.connection;
      const rawAccounts = await conn.getProgramAccounts(program.programId);
      const coder = (program as any).coder;
      const decoded: StoreItem[] = [];
      for (const acc of rawAccounts) {
        try {
          const itemAccount: any = coder.accounts.decode(
            "storeItem",
            acc.account.data
          );
          decoded.push({
            publicKey: acc.pubkey.toBase58(),
            name: itemAccount.name as string,
            displayName: itemAccount.displayName as string,
            price: Number(itemAccount.price),
            stock: Number(itemAccount.stock),
            imageUrl: itemAccount.imageUrl as string | undefined,
          });
        } catch {
          // ignore non-StoreItem / old layout accounts
        }
      }
      setItems(decoded);

      const balanceInfo = await connection.getTokenAccountBalance(buyerAta);
      setBayBalance(balanceInfo.value.uiAmountString ?? balanceInfo.value.amount);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (
        msg.includes("InsufficientFunds") ||
        msg.includes("BAY token balance is insufficient")
      ) {
        setError("BAY 토큰이 부족합니다. 관리자에게 문의하세요.");
      } else {
        setError(msg || "Purchase failed");
      }
    } finally {
      setBuying(null);
    }
  }

  function shortPda(pda: string) {
    if (pda.length <= 10) return pda;
    return `${pda.slice(0, 4)}...${pda.slice(-4)}`;
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // noop for MVP
    }
  }

  return (
    <main className="container">
      <GlassCard className="mb-6 glass-hover">
        <SectionHeader
          title="BAY Mileage Exclusive Shop"
          subtitle="Burn BAY to redeem exclusive items on devnet"
          rightSlot={
            publicKey ? (
              <div className="flex flex-col gap-2 items-end">
                <div className="flex flex-wrap gap-2 justify-end">
                  <StatPill
                    label="BAY"
                    value={
                      bayBalance !== null ? `${bayBalance} BAY` : "Loading..."
                    }
                  />
                  <StatPill
                    label="SOL"
                    value={
                      solBalance !== null ? `${solBalance} SOL` : "Loading..."
                    }
                  />
                </div>
                {bayBalance === "0" && (
                  <p className="text-[0.75rem] text-yellow-200 mt-1">
                    상점에서 사용 가능한 BAY 토큰이 없습니다.
                  </p>
                )}
              </div>
            ) : (
              <span className="muted">Connect wallet to view balances</span>
            )
          }
        />
      </GlassCard>

      {loading && <p className="muted">Loading catalog...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="muted">No items found. Ask the admin to add some.</p>
      )}

      {lastTx && (
          <GlassCard className="mb-4 glass-hover">
          <div className="flex flex-col gap-1 text-[0.8rem] text-gray-300">
            <span className="muted">Last purchase transaction</span>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View on Solana Explorer
              </a>
              <NeonButton
                variant="ghost"
                className="px-2 py-1 text-[0.8rem]"
                type="button"
                onClick={() => copyToClipboard(lastTx)}
              >
                Copy tx
              </NeonButton>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {items.map((item) => (
          <GlassCard
            key={item.publicKey}
            className="modern-card glass-hover p-0 overflow-hidden"
          >
            <div className="relative w-full aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='100%25' height='100%25' fill='%231f2937'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs text-slate-400">
                  No Image
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="m-0 text-sm font-semibold hover:text-purple-300 transition-colors">
                    {item.displayName}
                  </h2>
                  <p className="muted mt-1 text-[0.8rem]">
                    ID: {item.name} · {shortPda(item.publicKey)}
                  </p>
                </div>
                <Badge tone={item.stock > 0 ? "default" : "danger"}>
                  {item.stock > 0 ? "Available" : "Sold out"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-[8px] px-2 py-0.5 text-[0.8rem] text-slate-100 shadow-sm"
                  style={{
                    backgroundImage:
                      "linear-gradient(145deg, rgba(15,17,23,0.95), rgba(15,23,42,0.9))",
                  }}
                >
                  {(item.price / BAY_DECIMAL_FACTOR).toString()} BAY
                </span>
                <span className="inline-flex items-center rounded-[8px] border border-white/15 bg-black/30 px-2 py-0.5 text-[0.8rem] text-gray-200">
                  Stock: {item.stock}
                </span>
              </div>

              <div className="pt-1">
                <NeonButton
                  disabled={
                    !publicKey || item.stock === 0 || buying === item.publicKey
                  }
                  onClick={() => handleBuy(item)}
                >
                  {item.stock === 0
                    ? "Sold out"
                    : !publicKey
                    ? "Connect wallet"
                    : buying === item.publicKey
                    ? "Buying..."
                    : "Buy"}
                </NeonButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </main>
  );
}

