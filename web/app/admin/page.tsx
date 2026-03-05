"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../../lib/env";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

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
        .rpc();

      setAddName("");
      setAddPriceBay("");
      setAddStock("");

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
        .rpc();

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
      <h1>Admin</h1>

      {error && <p className="error">{error}</p>}

      <p>
        <strong>StoreConfig PDA:</strong> {env.NEXT_PUBLIC_STORE_CONFIG_PDA}
      </p>
      <p>
        <strong>Store authority:</strong>{" "}
        {storeAuthority ?? "loading from chain..."}
      </p>

      {publicKey ? (
        <p>
          <strong>Your wallet:</strong> {publicKey.toBase58()}
        </p>
      ) : (
        <p>Please connect your wallet to check admin rights.</p>
      )}

      {!isAdmin && (
        <p className="muted">Not authorized. You are not the store authority.</p>
      )}

      {isAdmin && (
        <div className="card">
          <h2>Add Item</h2>
          <form onSubmit={handleAddItem}>
            <div>
              <label>
                Name (≤ 32)
                <br />
                <input
                  type="text"
                  value={addName}
                  maxLength={32}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </label>
            </div>
            <div>
              <label>
                Price (BAY)
                <br />
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={addPriceBay}
                  onChange={(e) => setAddPriceBay(e.target.value)}
                  required
                />
              </label>
            </div>
            <div>
              <label>
                Stock
                <br />
                <input
                  type="number"
                  min="0"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add Item"}
            </button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Update Item</h2>
          {itemsLoading && <p>Loading items...</p>}
          {!itemsLoading && items.length === 0 && (
            <p>No items found. Add an item first.</p>
          )}
          {items.length > 0 && (
            <form onSubmit={handleUpdateItem}>
              <div>
                <label>
                  Select item
                  <br />
                  <select
                    value={selectedItemPk}
                    onChange={(e) => setSelectedItemPk(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    {items.map((item) => (
                      <option key={item.publicKey} value={item.publicKey}>
                        {item.name} ({item.publicKey})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label>
                  New price (BAY)
                  <br />
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={updatePriceBay}
                    onChange={(e) => setUpdatePriceBay(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div>
                <label>
                  New stock
                  <br />
                  <input
                    type="number"
                    min="0"
                    value={updateStock}
                    onChange={(e) => setUpdateStock(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button type="submit" disabled={updating}>
                {updating ? "Updating..." : "Update Item"}
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}


