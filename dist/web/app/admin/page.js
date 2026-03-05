"use strict";
"use client";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminPage;
const react_1 = require("react");
const anchorClient_1 = require("../../lib/anchorClient");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const env_1 = require("../../lib/env");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
function AdminPage() {
    const { program } = (0, anchorClient_1.useAnchorProgram)();
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const [isAdmin, setIsAdmin] = (0, react_1.useState)(false);
    const [storeAuthority, setStoreAuthority] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [items, setItems] = (0, react_1.useState)([]);
    const [itemsLoading, setItemsLoading] = (0, react_1.useState)(false);
    // Add Item form
    const [addName, setAddName] = (0, react_1.useState)("");
    const [addPriceBay, setAddPriceBay] = (0, react_1.useState)("");
    const [addStock, setAddStock] = (0, react_1.useState)("");
    const [adding, setAdding] = (0, react_1.useState)(false);
    // Update Item form
    const [selectedItemPk, setSelectedItemPk] = (0, react_1.useState)("");
    const [updatePriceBay, setUpdatePriceBay] = (0, react_1.useState)("");
    const [updateStock, setUpdateStock] = (0, react_1.useState)("");
    const [updating, setUpdating] = (0, react_1.useState)(false);
    const storeConfigPda = (0, react_1.useMemo)(() => new web3_js_1.PublicKey(env_1.env.NEXT_PUBLIC_STORE_CONFIG_PDA), []);
    (0, react_1.useEffect)(() => {
        if (!program)
            return;
        (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                setError(null);
                const config = yield program.account.storeConfig.fetch(storeConfigPda);
                const authority = config.authority.toBase58();
                setStoreAuthority(authority);
                if (publicKey && publicKey.toBase58() === authority) {
                    setIsAdmin(true);
                }
                else {
                    setIsAdmin(false);
                }
            }
            catch (e) {
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to load store config");
            }
        }))();
    }, [program, publicKey, storeConfigPda]);
    // Load items for update form
    (0, react_1.useEffect)(() => {
        if (!program || !isAdmin)
            return;
        (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                setItemsLoading(true);
                const accounts = yield program.account.storeItem.all();
                const mapped = accounts.map((acc) => ({
                    publicKey: acc.publicKey.toBase58(),
                    name: acc.account.name,
                    price: Number(acc.account.price),
                    stock: Number(acc.account.stock),
                }));
                setItems(mapped);
            }
            catch (e) {
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to load items");
            }
            finally {
                setItemsLoading(false);
            }
        }))();
    }, [program, isAdmin]);
    function parseBayToRaw(bay) {
        const n = Number(bay);
        if (!Number.isFinite(n) || n < 0) {
            throw new Error("Invalid BAY amount");
        }
        // 1 BAY = 1_000_000 raw units
        const raw = Math.round(n * 1000000);
        return new anchor_1.BN(raw);
    }
    function handleAddItem(e) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            e.preventDefault();
            if (!program || !publicKey)
                return;
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
                const [itemPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("item"), Buffer.from(addName)], new web3_js_1.PublicKey(env_1.env.NEXT_PUBLIC_PROGRAM_ID));
                yield program.methods
                    .addItem(addName, priceRaw, new anchor_1.BN(stockNum))
                    .accounts({
                    item: itemPda,
                    storeConfig: storeConfigPda,
                    authority: publicKey,
                })
                    .rpc();
                setAddName("");
                setAddPriceBay("");
                setAddStock("");
                const accounts = yield program.account.storeItem.all();
                const mapped = accounts.map((acc) => ({
                    publicKey: acc.publicKey.toBase58(),
                    name: acc.account.name,
                    price: Number(acc.account.price),
                    stock: Number(acc.account.stock),
                }));
                setItems(mapped);
            }
            catch (e) {
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to add item");
            }
            finally {
                setAdding(false);
            }
        });
    }
    function handleUpdateItem(e) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            e.preventDefault();
            if (!program || !publicKey)
                return;
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
                const itemPubkey = new web3_js_1.PublicKey(selectedItemPk);
                yield program.methods
                    .updateItem(priceRaw, new anchor_1.BN(stockNum))
                    .accounts({
                    item: itemPubkey,
                    storeConfig: storeConfigPda,
                    authority: publicKey,
                })
                    .rpc();
                setUpdatePriceBay("");
                setUpdateStock("");
                const accounts = yield program.account.storeItem.all();
                const mapped = accounts.map((acc) => ({
                    publicKey: acc.publicKey.toBase58(),
                    name: acc.account.name,
                    price: Number(acc.account.price),
                    stock: Number(acc.account.stock),
                }));
                setItems(mapped);
            }
            catch (e) {
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to update item");
            }
            finally {
                setUpdating(false);
            }
        });
    }
    return (<main className="container">
      <h1>Admin</h1>

      {error && <p className="error">{error}</p>}

      <p>
        <strong>StoreConfig PDA:</strong> {env_1.env.NEXT_PUBLIC_STORE_CONFIG_PDA}
      </p>
      <p>
        <strong>Store authority:</strong>{" "}
        {storeAuthority !== null && storeAuthority !== void 0 ? storeAuthority : "loading from chain..."}
      </p>

      {publicKey ? (<p>
          <strong>Your wallet:</strong> {publicKey.toBase58()}
        </p>) : (<p>Please connect your wallet to check admin rights.</p>)}

      {!isAdmin && (<p className="muted">Not authorized. You are not the store authority.</p>)}

      {isAdmin && (<div className="card">
          <h2>Add Item</h2>
          <form onSubmit={handleAddItem}>
            <div>
              <label>
                Name (≤ 32)
                <br />
                <input type="text" value={addName} maxLength={32} onChange={(e) => setAddName(e.target.value)} required/>
              </label>
            </div>
            <div>
              <label>
                Price (BAY)
                <br />
                <input type="number" step="0.000001" min="0" value={addPriceBay} onChange={(e) => setAddPriceBay(e.target.value)} required/>
              </label>
            </div>
            <div>
              <label>
                Stock
                <br />
                <input type="number" min="0" value={addStock} onChange={(e) => setAddStock(e.target.value)} required/>
              </label>
            </div>
            <button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add Item"}
            </button>
          </form>
        </div>)}

      {isAdmin && (<div className="card" style={{ marginTop: "1rem" }}>
          <h2>Update Item</h2>
          {itemsLoading && <p>Loading items...</p>}
          {!itemsLoading && items.length === 0 && (<p>No items found. Add an item first.</p>)}
          {items.length > 0 && (<form onSubmit={handleUpdateItem}>
              <div>
                <label>
                  Select item
                  <br />
                  <select value={selectedItemPk} onChange={(e) => setSelectedItemPk(e.target.value)} required>
                    <option value="">Select...</option>
                    {items.map((item) => (<option key={item.publicKey} value={item.publicKey}>
                        {item.name} ({item.publicKey})
                      </option>))}
                  </select>
                </label>
              </div>
              <div>
                <label>
                  New price (BAY)
                  <br />
                  <input type="number" step="0.000001" min="0" value={updatePriceBay} onChange={(e) => setUpdatePriceBay(e.target.value)} required/>
                </label>
              </div>
              <div>
                <label>
                  New stock
                  <br />
                  <input type="number" min="0" value={updateStock} onChange={(e) => setUpdateStock(e.target.value)} required/>
                </label>
              </div>
              <button type="submit" disabled={updating}>
                {updating ? "Updating..." : "Update Item"}
              </button>
            </form>)}
        </div>)}
    </main>);
}
