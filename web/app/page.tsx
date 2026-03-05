"use client";

import { useEffect, useState } from "react";
import { useAnchorProgram } from "../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../lib/env";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { GlassCard } from "../components/ui/GlassCard";
import { NeonButton } from "../components/ui/NeonButton";
import { Badge } from "../components/ui/Badge";
import { StatPill } from "../components/ui/StatPill";
import { SectionHeader } from "../components/ui/SectionHeader";

type StoreItem = {
  publicKey: string;
  name: string;
  price: number;
  stock: number;
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
  const storeConfigPda = PublicKey.findProgramAddressSync(
    [Buffer.from("store_config")],
    programId
  )[0];

  useEffect(() => {
    if (!program) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const accounts = await (program as any).account.storeItem.all();
        const mapped: StoreItem[] = accounts.map((acc: any) => ({
          publicKey: acc.publicKey.toBase58(),
          name: acc.account.name,
          price: Number(acc.account.price),
          stock: Number(acc.account.stock),
        }));
        setItems(mapped);
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
        .rpc();

      setLastTx(txSig);

      // Refresh catalog and balance
      const accounts = await (program as any).account.storeItem.all();
      const mapped: StoreItem[] = accounts.map((acc: any) => ({
        publicKey: acc.publicKey.toBase58(),
        name: acc.account.name,
        price: Number(acc.account.price),
        stock: Number(acc.account.stock),
      }));
      setItems(mapped);

      const balanceInfo = await connection.getTokenAccountBalance(buyerAta);
      setBayBalance(balanceInfo.value.uiAmountString ?? balanceInfo.value.amount);
    } catch (e: any) {
      setError(e?.message ?? "Purchase failed");
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
          title="Mileage Shop"
          subtitle="Burn BAY to redeem items on devnet"
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
                <div className="flex items-center gap-2 text-[0.8rem] text-gray-400">
                  <span>{shortPda(env.NEXT_PUBLIC_STORE_CONFIG_PDA)}</span>
                  <NeonButton
                    variant="ghost"
                    className="px-2 py-1 text-[0.8rem]"
                    type="button"
                    onClick={() =>
                      copyToClipboard(env.NEXT_PUBLIC_STORE_CONFIG_PDA)
                    }
                  >
                    Copy
                  </NeonButton>
                </div>
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
          <GlassCard key={item.publicKey} className="modern-card glass-hover">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="m-0 text-sm font-semibold hover:text-purple-300 transition-colors">
                  {item.name}
                </h2>
                <p className="muted mt-1 text-[0.8rem]">
                  Redeemable item · {shortPda(item.publicKey)}
                </p>
              </div>
              <Badge tone={item.stock > 0 ? "default" : "danger"}>
                {item.stock > 0 ? "Available" : "Sold out"}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-[8px] px-2 py-0.5 text-[0.8rem] text-slate-100 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(145deg, rgba(15,17,23,0.95), rgba(15,23,42,0.9))",
                }}
              >
                {(item.price / 1_000_000).toString()} BAY
              </span>
              <span className="inline-flex items-center rounded-[8px] border border-white/15 bg-black/30 px-2 py-0.5 text-[0.8rem] text-gray-200">
                Stock: {item.stock}
              </span>
            </div>

            <div className="mt-4">
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
          </GlassCard>
        ))}
      </div>
    </main>
  );
}

