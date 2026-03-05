"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../../lib/env";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { SectionHeader } from "../../components/ui/SectionHeader";

type StoreItem = {
  publicKey: string;
  name: string;
  price: number;
  stock: number;
};

export default function AdminPage() {
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();

  const [isAdmin, setIsAdmin] = useState(false);
  const [storeAuthority, setStoreAuthority] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<StoreItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Add Item form
  const [addName, setAddName] = useState("");
  const [addPriceBay, setAddPriceBay] = useState("");
  const [addStock, setAddStock] = useState("");
  const [adding, setAdding] = useState(false);

  // Update Item form
  const [selectedItemPk, setSelectedItemPk] = useState("");
  const [updatePriceBay, setUpdatePriceBay] = useState("");
  const [updateStock, setUpdateStock] = useState("");
  const [updating, setUpdating] = useState(false);

  const [addTxSig, setAddTxSig] = useState<string | null>(null);
  const [updateTxSig, setUpdateTxSig] = useState<string | null>(null);

  const storeConfigPda = useMemo(
    () => new PublicKey(env.NEXT_PUBLIC_STORE_CONFIG_PDA),
    []
  );

  useEffect(() => {
    if (!program) return;
    (async () => {
      try {
        setError(null);
        const config: any = await (program as any).account.storeConfig.fetch(
          storeConfigPda
        );
        const authority = config.authority.toBase58();
        setStoreAuthority(authority);
        if (publicKey && publicKey.toBase58() === authority) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load store config");
      }
    })();
  }, [program, publicKey, storeConfigPda]);

  // Load items for update form
  useEffect(() => {
    if (!program || !isAdmin) return;
    (async () => {
      try {
        setItemsLoading(true);
        const accounts = await (program as any).account.storeItem.all();
        const mapped: StoreItem[] = accounts.map((acc: any) => ({
          publicKey: acc.publicKey.toBase58(),
          name: acc.account.name,
          price: Number(acc.account.price),
          stock: Number(acc.account.stock),
        }));
        setItems(mapped);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load items");
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [program, isAdmin]);

  const selectedItem = useMemo(
    () => items.find((i) => i.publicKey === selectedItemPk),
    [items, selectedItemPk]
  );

  const formatAddress = (addr: string | null | undefined) => {
    if (!addr) return "Loading...";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  function parseBayToRaw(bay: string): BN {
    const n = Number(bay);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Invalid BAY amount");
    }
    // 1 BAY = 1_000_000 raw units
    const raw = Math.round(n * 1_000_000);
    return new BN(raw);
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    if (!addName || addName.length > 32) {
      setError("Name is required and must be ≤ 32 characters.");
      return;
    }

    try {
      setError(null);
      setAdding(true);

      const priceRaw = parseBayToRaw(addPriceBay);
      const stockNum = Number(addStock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        throw new Error("Invalid stock value");
      }

      const [itemPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("item"), Buffer.from(addName)],
        new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID)
      );

      await (program as any).methods
        .addItem(addName, priceRaw, new BN(stockNum))
        .accounts({
          item: itemPda,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setAddTxSig(sig);
        });

      setAddName("");
      setAddPriceBay("");
      setAddStock("");
      // keep last tx sig visible

      const accounts = await (program as any).account.storeItem.all();
      const mapped: StoreItem[] = accounts.map((acc: any) => ({
        publicKey: acc.publicKey.toBase58(),
        name: acc.account.name,
        price: Number(acc.account.price),
        stock: Number(acc.account.stock),
      }));
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add item");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateItem(e: FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    if (!selectedItemPk) {
      setError("Select an item to update.");
      return;
    }

    try {
      setError(null);
      setUpdating(true);

      const priceRaw = parseBayToRaw(updatePriceBay);
      const stockNum = Number(updateStock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        throw new Error("Invalid stock value");
      }

      const itemPubkey = new PublicKey(selectedItemPk);

      await (program as any).methods
        .updateItem(priceRaw, new BN(stockNum))
        .accounts({
          item: itemPubkey,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setUpdateTxSig(sig);
        });

      setUpdatePriceBay("");
      setUpdateStock("");

      const accounts = await (program as any).account.storeItem.all();
      const mapped: StoreItem[] = accounts.map((acc: any) => ({
        publicKey: acc.publicKey.toBase58(),
        name: acc.account.name,
        price: Number(acc.account.price),
        stock: Number(acc.account.stock),
      }));
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update item");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="container">
      <SectionHeader
        title="Admin Console"
        subtitle="Operate the BAY Mileage Store catalog on devnet."
        rightSlot={
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/5 px-3 py-1 text-[0.8rem] text-gray-200">
            <span className="uppercase tracking-[0.16em] text-[0.8rem] text-gray-400">
              Authority
            </span>
            <span className="font-mono">
              {formatAddress(storeAuthority)}
            </span>
          </div>
        }
      />

      {error && <p className="error">{error}</p>}

      <GlassCard className="mt-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-300">
              <span className="font-medium">StoreConfig PDA:</span>{" "}
              <span className="font-mono text-xs">
                {env.NEXT_PUBLIC_STORE_CONFIG_PDA}
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Use this console to add or update catalog items for the event
              store.
            </p>
          </div>
          <div className="text-sm text-right sm:text-left">
            {publicKey ? (
              <>
                <div className="text-gray-400 text-[0.8rem] mb-1">
                  Connected wallet
                </div>
                <div className="font-mono text-[0.8rem]">
                  {formatAddress(publicKey.toBase58())}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Connect your wallet to check admin rights.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {!isAdmin && (
        <GlassCard className="mt-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-red-400">!</div>
            <div>
              <p className="text-sm font-medium text-red-300">
                Not authorized for admin actions
              </p>
              <p className="mt-1 text-[0.8rem] text-red-200/80">
                This wallet is not the store authority configured in
                StoreConfig. Only the authority can add or update catalog
                items.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {isAdmin && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <GlassCard>
            <h2 className="text-sm font-semibold text-gray-100">
              Add Item
            </h2>
            <p className="mt-1 text-[0.8rem] text-gray-400">
              Name is the on-chain ID and is immutable once created.
            </p>
            <form onSubmit={handleAddItem} className="mt-4 space-y-1.5">
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Name (≤ 32)
                </label>
                <input
                  type="text"
                  value={addName}
                  maxLength={32}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. BAY Hoodie"
                />
                <p className="mt-1 text-[0.8rem] text-gray-500">
                  Name is used as the PDA seed and cannot be changed later.
                </p>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Price (BAY)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={addPriceBay}
                  onChange={(e) => setAddPriceBay(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. 10"
                />
              </div>
              <NeonButton type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Item"}
              </NeonButton>
              {addTxSig && (
                <div className="mt-2 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[0.8rem] text-emerald-100">
                  <div className="font-medium mb-0.5">
                    Add item transaction sent
                  </div>
                  <div className="font-mono break-all">
                    {addTxSig}
                  </div>
                </div>
              )}
            </form>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold text-gray-100">
              Update Item
            </h2>
            {itemsLoading && (
              <p className="mt-2 text-[0.8rem] text-gray-400">
                Loading items from chain...
              </p>
            )}
            {!itemsLoading && items.length === 0 && (
              <p className="mt-2 text-[0.8rem] text-gray-400">
                No items found. Add an item first.
              </p>
            )}
            {items.length > 0 && (
              <form onSubmit={handleUpdateItem} className="mt-4 space-y-1.5">
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    Select item
                  </label>
                  <select
                    value={selectedItemPk}
                    onChange={(e) => setSelectedItemPk(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.publicKey} value={item.publicKey}>
                        {item.name} ({formatAddress(item.publicKey)})
                      </option>
                    ))}
                  </select>
                  {selectedItem && (
                    <p className="mt-1 text-[0.8rem] text-gray-500">
                      Current:{" "}
                      <span className="font-mono">
                        {(selectedItem.price / 1_000_000).toString()} BAY
                      </span>{" "}
                      · Stock{" "}
                      <span className="font-mono">
                        {selectedItem.stock}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New price (BAY)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={updatePriceBay}
                    onChange={(e) => setUpdatePriceBay(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="e.g. 6"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={updateStock}
                    onChange={(e) => setUpdateStock(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="e.g. 12"
                  />
                </div>
                <NeonButton type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Update Item"}
                </NeonButton>
                {updateTxSig && (
                  <div className="mt-2 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[0.8rem] text-emerald-100">
                    <div className="font-medium mb-0.5">
                      Update item transaction sent
                    </div>
                    <div className="font-mono break-all">
                      {updateTxSig}
                    </div>
                  </div>
                )}
              </form>
            )}
          </GlassCard>
        </div>
      )}
    </main>
  );
}


