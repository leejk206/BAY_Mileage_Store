"use client";

import { useEffect, useState } from "react";
import { useAnchorProgram } from "../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../lib/env";
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

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
        // If no ATA or balance, treat as 0 for MVP
        setBayBalance("0");
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

  return (
    <main className="container">
      <h1>BAY Mileage Store</h1>
      <p className="subtitle">On-chain catalog (devnet)</p>

      {publicKey && (
        <p>
          Your BAY balance:{" "}
          {bayBalance !== null ? `${bayBalance} BAY` : "loading..."}
        </p>
      )}
      {!publicKey && (
        <p className="muted">
          Connect your wallet to see your BAY balance and purchase items.
        </p>
      )}

      {loading && <p>Loading catalog...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p>No items found. Ask the admin to add some.</p>
      )}

      {lastTx && (
        <p>
          Last purchase tx:{" "}
          <a
            href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View on Solana Explorer
          </a>
        </p>
      )}

      <div className="card-grid">
        {items.map((item) => (
          <div key={item.publicKey} className="card">
            <h2>{item.name}</h2>
            <p>Price: {item.price}</p>
            <p>
              Stock:{" "}
              {item.stock > 0 ? (
                <span>{item.stock} available</span>
              ) : (
                <span className="pill pill-out">Out of stock</span>
              )}
            </p>
            <button
              disabled={!publicKey || item.stock === 0 || buying === item.publicKey}
              onClick={() => handleBuy(item)}
            >
              {item.stock === 0
                ? "Sold out"
                : !publicKey
                ? "Connect wallet"
                : buying === item.publicKey
                ? "Buying..."
                : "Buy"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

