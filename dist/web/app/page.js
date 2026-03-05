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
exports.default = CatalogPage;
const react_1 = require("react");
const anchorClient_1 = require("../lib/anchorClient");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const env_1 = require("../lib/env");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
function CatalogPage() {
    const { program, connection } = (0, anchorClient_1.useAnchorProgram)();
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [bayBalance, setBayBalance] = (0, react_1.useState)(null);
    const [buying, setBuying] = (0, react_1.useState)(null);
    const [lastTx, setLastTx] = (0, react_1.useState)(null);
    const programId = new web3_js_1.PublicKey(env_1.env.NEXT_PUBLIC_PROGRAM_ID);
    const bayMint = new web3_js_1.PublicKey(env_1.env.NEXT_PUBLIC_BAY_MINT);
    const storeConfigPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("store_config")], programId)[0];
    (0, react_1.useEffect)(() => {
        if (!program)
            return;
        setLoading(true);
        setError(null);
        (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
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
                // For MVP, just show a simple message
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to load catalog");
            }
            finally {
                setLoading(false);
            }
        }))();
    }, [program]);
    // Load BAY token balance for connected wallet
    (0, react_1.useEffect)(() => {
        if (!publicKey) {
            setBayBalance(null);
            return;
        }
        (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const ata = yield (0, spl_token_1.getAssociatedTokenAddress)(bayMint, publicKey, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
                const info = yield connection.getTokenAccountBalance(ata);
                setBayBalance((_a = info.value.uiAmountString) !== null && _a !== void 0 ? _a : info.value.amount);
            }
            catch (_b) {
                // If no ATA or balance, treat as 0 for MVP
                setBayBalance("0");
            }
        }))();
    }, [connection, publicKey, bayMint]);
    function handleBuy(item) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!program || !publicKey)
                return;
            setError(null);
            setLastTx(null);
            setBuying(item.publicKey);
            try {
                // Derive PDAs
                const itemPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("item"), Buffer.from(item.name)], programId)[0];
                const receiptCounterPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("receipt_counter"), publicKey.toBuffer(), itemPda.toBuffer()], programId)[0];
                // Fetch current counter (if exists) to determine next index
                let nextIndex = 0;
                try {
                    const counter = yield program.account.receiptCounter.fetch(receiptCounterPda);
                    nextIndex = Number(counter.nextIndex);
                }
                catch (_c) {
                    nextIndex = 0;
                }
                const indexBytes = Buffer.alloc(8);
                indexBytes.writeBigUInt64LE(BigInt(nextIndex));
                const receiptPda = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from("receipt"),
                    publicKey.toBuffer(),
                    itemPda.toBuffer(),
                    indexBytes,
                ], programId)[0];
                const buyerAta = yield (0, spl_token_1.getAssociatedTokenAddress)(bayMint, publicKey, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
                const txSig = yield program.methods
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
                const accounts = yield program.account.storeItem.all();
                const mapped = accounts.map((acc) => ({
                    publicKey: acc.publicKey.toBase58(),
                    name: acc.account.name,
                    price: Number(acc.account.price),
                    stock: Number(acc.account.stock),
                }));
                setItems(mapped);
                const balanceInfo = yield connection.getTokenAccountBalance(buyerAta);
                setBayBalance((_a = balanceInfo.value.uiAmountString) !== null && _a !== void 0 ? _a : balanceInfo.value.amount);
            }
            catch (e) {
                setError((_b = e === null || e === void 0 ? void 0 : e.message) !== null && _b !== void 0 ? _b : "Purchase failed");
            }
            finally {
                setBuying(null);
            }
        });
    }
    return (<main className="container">
      <h1>BAY Mileage Store</h1>
      <p className="subtitle">On-chain catalog (devnet)</p>

      {publicKey && (<p>
          Your BAY balance:{" "}
          {bayBalance !== null ? `${bayBalance} BAY` : "loading..."}
        </p>)}
      {!publicKey && (<p className="muted">
          Connect your wallet to see your BAY balance and purchase items.
        </p>)}

      {loading && <p>Loading catalog...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && items.length === 0 && (<p>No items found. Ask the admin to add some.</p>)}

      {lastTx && (<p>
          Last purchase tx:{" "}
          <a href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`} target="_blank" rel="noreferrer">
            View on Solana Explorer
          </a>
        </p>)}

      <div className="card-grid">
        {items.map((item) => (<div key={item.publicKey} className="card">
            <h2>{item.name}</h2>
            <p>Price: {item.price}</p>
            <p>
              Stock:{" "}
              {item.stock > 0 ? (<span>{item.stock} available</span>) : (<span className="pill pill-out">Out of stock</span>)}
            </p>
            <button disabled={!publicKey || item.stock === 0 || buying === item.publicKey} onClick={() => handleBuy(item)}>
              {item.stock === 0
                ? "Sold out"
                : !publicKey
                    ? "Connect wallet"
                    : buying === item.publicKey
                        ? "Buying..."
                        : "Buy"}
            </button>
          </div>))}
      </div>
    </main>);
}
