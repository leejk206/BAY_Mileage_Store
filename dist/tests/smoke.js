"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const anchor = __importStar(require("@coral-xyz/anchor"));
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const assert = __importStar(require("assert"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("../../target/idl/bay_mileage_store.json");
// -- Constants ----------------------------------------------------------------
const PROGRAM_ID = new web3_js_1.PublicKey("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag");
const BAY_MINT = new web3_js_1.PublicKey("agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB");
const TEST_WALLET_PUBKEY = new web3_js_1.PublicKey("GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3");
// -- Load keypairs ------------------------------------------------------------
function loadKeypair(filePath) {
    const resolved = filePath.startsWith("~")
        ? filePath.replace("~", process.env.HOME || process.env.USERPROFILE || "")
        : filePath;
    const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    return web3_js_1.Keypair.fromSecretKey(new Uint8Array(raw));
}
const deployerKeypair = loadKeypair(process.env.ANCHOR_WALLET ||
    (process.platform === "win32"
        ? "C:/solana/id.json"
        : "~/.config/solana/id.json"));
const testWalletKeypair = loadKeypair(path.join(__dirname, "../../wallets/test-wallet.json"));
// -- PDA helpers --------------------------------------------------------------
function deriveStoreConfigPDA() {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("store_config")], PROGRAM_ID);
}
function deriveItemPDA(itemName) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("item"), Buffer.from(itemName)], PROGRAM_ID);
}
function deriveReceiptCounterPDA(buyer, item) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("receipt_counter"), buyer.toBuffer(), item.toBuffer()], PROGRAM_ID);
}
function deriveReceiptPDA(buyer, item, index) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from("receipt"),
        buyer.toBuffer(),
        item.toBuffer(),
        Buffer.from(index.toArray("le", 8)),
    ], PROGRAM_ID);
}
// -- Test suite ---------------------------------------------------------------
describe("BAY Mileage Store — Smoke Tests", () => {
    const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(deployerKeypair), { commitment: "confirmed" });
    anchor.setProvider(provider);
    // Use the IDL directly (typed via any to avoid strict IDL typing issues)
    const program = new anchor_1.Program(idl, provider);
    const [storeConfigPDA] = deriveStoreConfigPDA();
    const [itemPDA] = deriveItemPDA("TestBadge");
    // -----------------------------------------------------------------------
    // Task a: initialize_store
    // -----------------------------------------------------------------------
    it("a) initialize_store — creates StoreConfig PDA on-chain", () => __awaiter(void 0, void 0, void 0, function* () {
        // Check if already initialized (idempotent for re-runs)
        const existing = yield connection.getAccountInfo(storeConfigPDA);
        if (existing) {
            console.log(`  [skip] StoreConfig PDA already exists: ${storeConfigPDA.toBase58()}`);
            return;
        }
        const tx = yield program.methods
            .initializeStore()
            .accounts({
            storeConfig: storeConfigPDA,
            bayMint: BAY_MINT,
            authority: deployerKeypair.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([deployerKeypair])
            .rpc();
        console.log(`  [OK] initialize_store tx: ${tx}`);
        assert.ok(tx, "Expected a transaction signature");
    }));
    // -----------------------------------------------------------------------
    // Task b: add_item
    // -----------------------------------------------------------------------
    it("b) add_item — creates TestBadge StoreItem PDA on-chain", () => __awaiter(void 0, void 0, void 0, function* () {
        // Check if already added (idempotent for re-runs)
        const existing = yield connection.getAccountInfo(itemPDA);
        if (existing) {
            console.log(`  [skip] TestBadge PDA already exists: ${itemPDA.toBase58()}`);
            return;
        }
        const tx = yield program.methods
            .addItem("TestBadge", new anchor_1.BN(5000000), new anchor_1.BN(10))
            .accounts({
            item: itemPDA,
            storeConfig: storeConfigPDA,
            authority: deployerKeypair.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([deployerKeypair])
            .rpc();
        console.log(`  [OK] add_item tx: ${tx}`);
        assert.ok(tx, "Expected a transaction signature");
    }));
    // -----------------------------------------------------------------------
    // Task c: purchase (success)
    // -----------------------------------------------------------------------
    it.skip("c) purchase — test wallet burns 5 BAY for TestBadge", () => __awaiter(void 0, void 0, void 0, function* () {
        // Derive receipt counter and receipt PDA for first purchase (index 0)
        const [receiptCounterPDA] = deriveReceiptCounterPDA(testWalletKeypair.publicKey, itemPDA);
        const [receiptPDA] = deriveReceiptPDA(testWalletKeypair.publicKey, itemPDA, new anchor_1.BN(0));
        // Check if already purchased (idempotent — receipt PDA is unique per buyer+item)
        const existingReceipt = yield connection.getAccountInfo(receiptPDA);
        if (existingReceipt) {
            console.log(`  [skip] PurchaseReceipt already exists for test wallet: ${receiptPDA.toBase58()}`);
            return;
        }
        // Derive test wallet ATA
        const buyerATA = (0, spl_token_1.getAssociatedTokenAddressSync)(BAY_MINT, testWalletKeypair.publicKey);
        // Ensure test wallet has an ATA (create if missing)
        const ataInfo = yield connection.getAccountInfo(buyerATA);
        if (!ataInfo) {
            // Create the ATA for the test wallet funded by the deployer
            const createAtaIx = (0, spl_token_1.createAssociatedTokenAccountInstruction)(deployerKeypair.publicKey, // payer
            buyerATA, testWalletKeypair.publicKey, BAY_MINT);
            const ataTx = new anchor.web3.Transaction().add(createAtaIx);
            const ataSig = yield connection.sendTransaction(ataTx, [deployerKeypair]);
            yield connection.confirmTransaction(ataSig, "confirmed");
            console.log(`  [setup] Created test wallet ATA: ${buyerATA.toBase58()}`);
            // Mint 100 BAY (100_000_000 raw units) to test wallet
            const mintIx = (0, spl_token_1.createMintToInstruction)(BAY_MINT, buyerATA, deployerKeypair.publicKey, // mint authority
            100000000);
            const mintTx = new anchor.web3.Transaction().add(mintIx);
            const mintSig = yield connection.sendTransaction(mintTx, [deployerKeypair]);
            yield connection.confirmTransaction(mintSig, "confirmed");
            console.log(`  [setup] Minted 100 BAY to test wallet`);
        }
        // Ensure test wallet has enough SOL to sign (need for receipt account rent)
        const testWalletBalance = yield connection.getBalance(testWalletKeypair.publicKey);
        if (testWalletBalance < 0.02 * web3_js_1.LAMPORTS_PER_SOL) {
            // Transfer SOL from deployer to test wallet
            const transferTx = new anchor.web3.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: deployerKeypair.publicKey,
                toPubkey: testWalletKeypair.publicKey,
                lamports: 0.05 * web3_js_1.LAMPORTS_PER_SOL,
            }));
            const transferSig = yield connection.sendTransaction(transferTx, [deployerKeypair]);
            yield connection.confirmTransaction(transferSig, "confirmed");
            console.log(`  [setup] Transferred 0.05 SOL to test wallet for rent`);
        }
        const tx = yield program.methods
            .purchase()
            .accounts({
            buyer: testWalletKeypair.publicKey,
            buyerTokenAccount: buyerATA,
            bayMint: BAY_MINT,
            storeConfig: storeConfigPDA,
            item: itemPDA,
            receiptCounter: receiptCounterPDA,
            receipt: receiptPDA,
        })
            .signers([testWalletKeypair])
            .rpc();
        console.log(`  [OK] purchase tx: ${tx}`);
        assert.ok(tx, "Expected a transaction signature");
    }));
    // -----------------------------------------------------------------------
    // Task d: purchase (failure — PUR-03)
    // -----------------------------------------------------------------------
    it.skip("d) purchase failure — PUR-03: insufficient funds correctly rejected", () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a fresh keypair with 0 BAY but enough SOL to sign
        const brokeWallet = web3_js_1.Keypair.generate();
        // Fund with a tiny bit of SOL so it can sign
        const fundTx = new anchor.web3.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: deployerKeypair.publicKey,
            toPubkey: brokeWallet.publicKey,
            lamports: 0.02 * web3_js_1.LAMPORTS_PER_SOL,
        }));
        const fundSig = yield connection.sendTransaction(fundTx, [deployerKeypair]);
        yield connection.confirmTransaction(fundSig, "confirmed");
        // Create the ATA for the broke wallet (but don't mint any tokens)
        const brokeATA = (0, spl_token_1.getAssociatedTokenAddressSync)(BAY_MINT, brokeWallet.publicKey);
        const createAtaIx = (0, spl_token_1.createAssociatedTokenAccountInstruction)(deployerKeypair.publicKey, // payer
        brokeATA, brokeWallet.publicKey, BAY_MINT);
        const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
        const createAtaSig = yield connection.sendTransaction(createAtaTx, [deployerKeypair]);
        yield connection.confirmTransaction(createAtaSig, "confirmed");
        const [brokeReceiptCounterPDA] = deriveReceiptCounterPDA(brokeWallet.publicKey, itemPDA);
        const [brokeReceiptPDA] = deriveReceiptPDA(brokeWallet.publicKey, itemPDA, new anchor_1.BN(0));
        let errorCaught = false;
        try {
            yield program.methods
                .purchase()
                .accounts({
                buyer: brokeWallet.publicKey,
                buyerTokenAccount: brokeATA,
                bayMint: BAY_MINT,
                storeConfig: storeConfigPDA,
                item: itemPDA,
                receiptCounter: brokeReceiptCounterPDA,
                receipt: brokeReceiptPDA,
            })
                .signers([brokeWallet])
                .rpc();
        }
        catch (err) {
            const errMsg = (err === null || err === void 0 ? void 0 : err.message) || JSON.stringify(err);
            if (errMsg.includes("InsufficientFunds") ||
                errMsg.includes("0x1770") || // 6000 in hex
                errMsg.includes("BAY token balance is insufficient")) {
                errorCaught = true;
                console.log("  [OK] PUR-03: Insufficient funds correctly rejected");
            }
            else {
                throw new Error(`Unexpected error during purchase failure test: ${errMsg}`);
            }
        }
        assert.ok(errorCaught, "Expected InsufficientFunds error was not thrown");
    }));
    // -----------------------------------------------------------------------
    // Task f: repeat purchase (same buyer, same item)
    // -----------------------------------------------------------------------
    it("f) repeat purchase — same buyer buys TestBadge twice", () => __awaiter(void 0, void 0, void 0, function* () {
        // Fresh buyer so this test is idempotent across runs
        const repeatBuyer = web3_js_1.Keypair.generate();
        // Derive PDAs
        const [receiptCounterPDA] = deriveReceiptCounterPDA(repeatBuyer.publicKey, itemPDA);
        const [firstReceiptPDA] = deriveReceiptPDA(repeatBuyer.publicKey, itemPDA, new anchor_1.BN(0));
        const [secondReceiptPDA] = deriveReceiptPDA(repeatBuyer.publicKey, itemPDA, new anchor_1.BN(1));
        // Ensure receipts do not exist yet
        const existingFirst = yield connection.getAccountInfo(firstReceiptPDA);
        const existingSecond = yield connection.getAccountInfo(secondReceiptPDA);
        if (existingFirst || existingSecond) {
            console.log(`  [skip] Repeat purchase receipts already exist for buyer: ${repeatBuyer.publicKey.toBase58()}`);
            return;
        }
        // Fund buyer with SOL for rent/fees
        const fundTx = new anchor.web3.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: deployerKeypair.publicKey,
            toPubkey: repeatBuyer.publicKey,
            lamports: 0.05 * web3_js_1.LAMPORTS_PER_SOL,
        }));
        const fundSig = yield connection.sendTransaction(fundTx, [deployerKeypair]);
        yield connection.confirmTransaction(fundSig, "confirmed");
        // Fetch item to read price and initial stock
        const itemAccount = yield program.account.storeItem.fetch(itemPDA);
        const price = itemAccount.price;
        const initialStock = itemAccount.stock;
        // Prepare buyer ATA and token balance
        const buyerATA = (0, spl_token_1.getAssociatedTokenAddressSync)(BAY_MINT, repeatBuyer.publicKey);
        const ataInfo = yield connection.getAccountInfo(buyerATA);
        if (!ataInfo) {
            const createAtaIx = (0, spl_token_1.createAssociatedTokenAccountInstruction)(deployerKeypair.publicKey, buyerATA, repeatBuyer.publicKey, BAY_MINT);
            const ataTx = new anchor.web3.Transaction().add(createAtaIx);
            const ataSig = yield connection.sendTransaction(ataTx, [deployerKeypair]);
            yield connection.confirmTransaction(ataSig, "confirmed");
            console.log(`  [setup] Created repeat buyer ATA: ${buyerATA.toBase58()}`);
        }
        // Ensure buyer has enough BAY (mint some extra each run)
        const mintAmount = price.mul(new anchor_1.BN(4)); // 4x price for safety
        const mintIx = (0, spl_token_1.createMintToInstruction)(BAY_MINT, buyerATA, deployerKeypair.publicKey, BigInt(mintAmount.toString()));
        const mintTx = new anchor.web3.Transaction().add(mintIx);
        const mintSig = yield connection.sendTransaction(mintTx, [deployerKeypair]);
        yield connection.confirmTransaction(mintSig, "confirmed");
        const beforeBalanceResp = yield connection.getTokenAccountBalance(buyerATA);
        const beforeBalanceRaw = BigInt(beforeBalanceResp.value.amount);
        // First purchase (index 0)
        const tx1 = yield program.methods
            .purchase()
            .accounts({
            buyer: repeatBuyer.publicKey,
            buyerTokenAccount: buyerATA,
            bayMint: BAY_MINT,
            storeConfig: storeConfigPDA,
            item: itemPDA,
            receiptCounter: receiptCounterPDA,
            receipt: firstReceiptPDA,
        })
            .signers([repeatBuyer])
            .rpc();
        console.log(`  [OK] repeat purchase tx1: ${tx1}`);
        // Second purchase (index 1)
        const tx2 = yield program.methods
            .purchase()
            .accounts({
            buyer: repeatBuyer.publicKey,
            buyerTokenAccount: buyerATA,
            bayMint: BAY_MINT,
            storeConfig: storeConfigPDA,
            item: itemPDA,
            receiptCounter: receiptCounterPDA,
            receipt: secondReceiptPDA,
        })
            .signers([repeatBuyer])
            .rpc();
        console.log(`  [OK] repeat purchase tx2: ${tx2}`);
        // Check receipts
        const firstReceipt = yield program.account.purchaseReceipt.fetch(firstReceiptPDA);
        const secondReceipt = yield program.account.purchaseReceipt.fetch(secondReceiptPDA);
        assert.notStrictEqual(firstReceiptPDA.toBase58(), secondReceiptPDA.toBase58(), "Expected two different receipt PDAs");
        assert.strictEqual(firstReceipt.purchaseIndex.toNumber(), 0, "First receipt purchase_index should be 0");
        assert.strictEqual(secondReceipt.purchaseIndex.toNumber(), 1, "Second receipt purchase_index should be 1");
        // Check stock decreased by 2
        const itemAfter = yield program.account.storeItem.fetch(itemPDA);
        const finalStock = itemAfter.stock;
        const stockDiff = initialStock.sub(finalStock).toNumber();
        assert.strictEqual(stockDiff, 2, `Expected stock to decrease by 2, got ${stockDiff}`);
        // Check buyer token balance decreased by 2 * price
        const afterBalanceResp = yield connection.getTokenAccountBalance(buyerATA);
        const afterBalanceRaw = BigInt(afterBalanceResp.value.amount);
        const balanceDiff = beforeBalanceRaw - afterBalanceRaw;
        const expectedDiff = BigInt(price.mul(new anchor_1.BN(2)).toString());
        assert.strictEqual(balanceDiff, expectedDiff, `Expected BAY balance decrease of ${expectedDiff}, got ${balanceDiff}`);
        // Check ReceiptCounter.next_index == 2
        const counterAccount = yield program.account.receiptCounter.fetch(receiptCounterPDA);
        const nextIndex = counterAccount.nextIndex;
        assert.strictEqual(nextIndex.toNumber(), 2, `Expected ReceiptCounter.next_index == 2, got ${nextIndex.toNumber()}`);
    }));
    // -----------------------------------------------------------------------
    // Task e: Record StoreConfig PDA in .env
    // -----------------------------------------------------------------------
    it("e) record StoreConfig PDA in .env", () => __awaiter(void 0, void 0, void 0, function* () {
        const envPath = path.join(__dirname, "../../.env");
        const envContent = fs.readFileSync(envPath, "utf-8");
        const pdaAddress = storeConfigPDA.toBase58();
        if (envContent.includes("STORE_CONFIG_PDA=")) {
            console.log(`  [skip] STORE_CONFIG_PDA already in .env: ${pdaAddress}`);
        }
        else {
            const newLine = `STORE_CONFIG_PDA=${pdaAddress}\n`;
            fs.appendFileSync(envPath, newLine);
            console.log(`  [OK] Appended STORE_CONFIG_PDA=${pdaAddress} to .env`);
        }
        // Verify on-chain account exists
        const accountInfo = yield connection.getAccountInfo(storeConfigPDA);
        assert.ok(accountInfo, `StoreConfig PDA ${pdaAddress} not found on-chain`);
        console.log(`  [OK] StoreConfig PDA verified on-chain: ${pdaAddress}`);
    }));
});
