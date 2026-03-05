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
exports.default = MyPurchasesPage;
const react_1 = require("react");
const anchorClient_1 = require("../../lib/anchorClient");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const web3_js_1 = require("@solana/web3.js");
function MyPurchasesPage() {
    const { program } = (0, anchorClient_1.useAnchorProgram)();
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const [purchases, setPurchases] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!program || !publicKey)
            return;
        setLoading(true);
        setError(null);
        (() => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Filter by buyer pubkey (offset 8: discriminator)
                const accounts = yield program.account.purchaseReceipt.all([
                    {
                        memcmp: {
                            offset: 8,
                            bytes: publicKey.toBase58(),
                        },
                    },
                ]);
                const mapped = accounts.map((acc) => ({
                    publicKey: acc.publicKey.toBase58(),
                    itemPubkey: acc.account.item.toBase58(),
                    amountBurned: Number(acc.account.amountBurned),
                    timestamp: Number(acc.account.timestamp),
                    purchaseIndex: typeof acc.account.purchaseIndex !== "undefined"
                        ? Number(acc.account.purchaseIndex)
                        : undefined,
                }));
                // Resolve item names for each unique item pubkey
                const uniqueItemPubkeys = Array.from(new Set(mapped.map((p) => p.itemPubkey)));
                const itemNameMap = new Map();
                yield Promise.all(uniqueItemPubkeys.map((pkStr) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const pk = new web3_js_1.PublicKey(pkStr);
                        const itemAccount = yield program.account.storeItem.fetch(pk);
                        itemNameMap.set(pkStr, itemAccount.name);
                    }
                    catch (_a) {
                        // ignore failures, fallback to pubkey
                    }
                })));
                const withNames = mapped.map((p) => (Object.assign(Object.assign({}, p), { itemName: itemNameMap.get(p.itemPubkey) })));
                // Sort by timestamp desc, then purchaseIndex asc
                withNames.sort((a, b) => {
                    var _a, _b;
                    if (a.timestamp !== b.timestamp) {
                        return b.timestamp - a.timestamp;
                    }
                    const ai = (_a = a.purchaseIndex) !== null && _a !== void 0 ? _a : 0;
                    const bi = (_b = b.purchaseIndex) !== null && _b !== void 0 ? _b : 0;
                    return ai - bi;
                });
                setPurchases(withNames);
            }
            catch (e) {
                setError((_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "Failed to load purchases");
            }
            finally {
                setLoading(false);
            }
        }))();
    }, [program, publicKey]);
    if (!publicKey) {
        return (<main className="container">
        <h1>My Purchases</h1>
        <p>Please connect your wallet to view your purchase history.</p>
      </main>);
    }
    return (<main className="container">
      <h1>My Purchases</h1>

      {loading && <p>Loading purchases...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && purchases.length === 0 && (<p>No purchases found for this wallet.</p>)}

      <ul className="list">
        {purchases.map((p) => (<li key={p.publicKey} className="list-item">
            <div>
              <div>
                Item:{" "}
                {p.itemName ? `${p.itemName} (${p.itemPubkey})` : p.itemPubkey}
              </div>
              {typeof p.purchaseIndex === "number" && (<div>Purchase index: {p.purchaseIndex}</div>)}
              <div>Amount burned: {p.amountBurned}</div>
            </div>
            <div className="muted">
              {new Date(p.timestamp * 1000).toLocaleString()}
            </div>
          </li>))}
      </ul>
    </main>);
}
