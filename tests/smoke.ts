import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import idl from "../target/idl/bay_mileage_store.json";

// -- Constants ----------------------------------------------------------------

const PROGRAM_ID = new PublicKey("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag");
const BAY_MINT = new PublicKey("agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB");
const TEST_WALLET_PUBKEY = new PublicKey("GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3");

// -- Load keypairs ------------------------------------------------------------

function loadKeypair(filePath: string): Keypair {
  const resolved = filePath.startsWith("~")
    ? filePath.replace("~", process.env.HOME || process.env.USERPROFILE || "")
    : filePath;
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(raw));
}

const deployerKeypair = loadKeypair(
  process.env.ANCHOR_WALLET ||
  (process.platform === "win32"
    ? "C:/solana/id.json"
    : "~/.config/solana/id.json")
);

const testWalletKeypair = loadKeypair(
  path.join(__dirname, "../wallets/test-wallet.json")
);

// -- PDA helpers --------------------------------------------------------------

function deriveStoreConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("store_config")],
    PROGRAM_ID
  );
}

function deriveItemPDA(itemName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("item"), Buffer.from(itemName)],
    PROGRAM_ID
  );
}

function deriveReceiptPDA(buyer: PublicKey, item: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), buyer.toBuffer(), item.toBuffer()],
    PROGRAM_ID
  );
}

// -- Test suite ---------------------------------------------------------------

describe("BAY Mileage Store — Smoke Tests", () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployerKeypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // Use the IDL directly (typed via any to avoid strict IDL typing issues)
  const program = new Program(idl as any, provider);

  const [storeConfigPDA] = deriveStoreConfigPDA();
  const [itemPDA] = deriveItemPDA("TestBadge");

  // -----------------------------------------------------------------------
  // Task a: initialize_store
  // -----------------------------------------------------------------------
  it("a) initialize_store — creates StoreConfig PDA on-chain", async () => {
    // Check if already initialized (idempotent for re-runs)
    const existing = await connection.getAccountInfo(storeConfigPDA);
    if (existing) {
      console.log(
        `  [skip] StoreConfig PDA already exists: ${storeConfigPDA.toBase58()}`
      );
      return;
    }

    const tx = await program.methods
      .initializeStore()
      .accounts({
        storeConfig: storeConfigPDA,
        bayMint: BAY_MINT,
        authority: deployerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([deployerKeypair])
      .rpc();

    console.log(`  [OK] initialize_store tx: ${tx}`);
    assert.ok(tx, "Expected a transaction signature");
  });

  // -----------------------------------------------------------------------
  // Task b: add_item
  // -----------------------------------------------------------------------
  it("b) add_item — creates TestBadge StoreItem PDA on-chain", async () => {
    // Check if already added (idempotent for re-runs)
    const existing = await connection.getAccountInfo(itemPDA);
    if (existing) {
      console.log(
        `  [skip] TestBadge PDA already exists: ${itemPDA.toBase58()}`
      );
      return;
    }

    const tx = await program.methods
      .addItem("TestBadge", new BN(5_000_000), new BN(10))
      .accounts({
        item: itemPDA,
        storeConfig: storeConfigPDA,
        authority: deployerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([deployerKeypair])
      .rpc();

    console.log(`  [OK] add_item tx: ${tx}`);
    assert.ok(tx, "Expected a transaction signature");
  });

  // -----------------------------------------------------------------------
  // Task c: purchase (success)
  // -----------------------------------------------------------------------
  it("c) purchase — test wallet burns 5 BAY for TestBadge", async () => {
    // Derive receipt PDA
    const [receiptPDA] = deriveReceiptPDA(testWalletKeypair.publicKey, itemPDA);

    // Check if already purchased (idempotent — receipt PDA is unique per buyer+item)
    const existingReceipt = await connection.getAccountInfo(receiptPDA);
    if (existingReceipt) {
      console.log(
        `  [skip] PurchaseReceipt already exists for test wallet: ${receiptPDA.toBase58()}`
      );
      return;
    }

    // Derive test wallet ATA
    const buyerATA = getAssociatedTokenAddressSync(
      BAY_MINT,
      testWalletKeypair.publicKey
    );

    // Ensure test wallet has an ATA (create if missing)
    const ataInfo = await connection.getAccountInfo(buyerATA);
    if (!ataInfo) {
      // Create the ATA for the test wallet funded by the deployer
      const createAtaIx = createAssociatedTokenAccountInstruction(
        deployerKeypair.publicKey, // payer
        buyerATA,
        testWalletKeypair.publicKey,
        BAY_MINT
      );
      const ataTx = new anchor.web3.Transaction().add(createAtaIx);
      const ataSig = await connection.sendTransaction(ataTx, [deployerKeypair]);
      await connection.confirmTransaction(ataSig, "confirmed");
      console.log(`  [setup] Created test wallet ATA: ${buyerATA.toBase58()}`);

      // Mint 100 BAY (100_000_000 raw units) to test wallet
      const mintIx = createMintToInstruction(
        BAY_MINT,
        buyerATA,
        deployerKeypair.publicKey, // mint authority
        100_000_000
      );
      const mintTx = new anchor.web3.Transaction().add(mintIx);
      const mintSig = await connection.sendTransaction(mintTx, [deployerKeypair]);
      await connection.confirmTransaction(mintSig, "confirmed");
      console.log(`  [setup] Minted 100 BAY to test wallet`);
    }

    // Ensure test wallet has enough SOL to sign (need for receipt account rent)
    const testWalletBalance = await connection.getBalance(testWalletKeypair.publicKey);
    if (testWalletBalance < 0.02 * LAMPORTS_PER_SOL) {
      // Transfer SOL from deployer to test wallet
      const transferTx = new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: deployerKeypair.publicKey,
          toPubkey: testWalletKeypair.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      const transferSig = await connection.sendTransaction(transferTx, [deployerKeypair]);
      await connection.confirmTransaction(transferSig, "confirmed");
      console.log(`  [setup] Transferred 0.05 SOL to test wallet for rent`);
    }

    const tx = await program.methods
      .purchase()
      .accounts({
        buyer: testWalletKeypair.publicKey,
        buyerTokenAccount: buyerATA,
        bayMint: BAY_MINT,
        storeConfig: storeConfigPDA,
        item: itemPDA,
        receipt: receiptPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([testWalletKeypair])
      .rpc();

    console.log(`  [OK] purchase tx: ${tx}`);
    assert.ok(tx, "Expected a transaction signature");
  });

  // -----------------------------------------------------------------------
  // Task d: purchase (failure — PUR-03)
  // -----------------------------------------------------------------------
  it("d) purchase failure — PUR-03: insufficient funds correctly rejected", async () => {
    // Create a fresh keypair with 0 BAY but enough SOL to sign
    const brokeWallet = Keypair.generate();

    // Fund with a tiny bit of SOL so it can sign
    const fundTx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployerKeypair.publicKey,
        toPubkey: brokeWallet.publicKey,
        lamports: 0.02 * LAMPORTS_PER_SOL,
      })
    );
    const fundSig = await connection.sendTransaction(fundTx, [deployerKeypair]);
    await connection.confirmTransaction(fundSig, "confirmed");

    // Create the ATA for the broke wallet (but don't mint any tokens)
    const brokeATA = getAssociatedTokenAddressSync(BAY_MINT, brokeWallet.publicKey);
    const createAtaIx = createAssociatedTokenAccountInstruction(
      deployerKeypair.publicKey, // payer
      brokeATA,
      brokeWallet.publicKey,
      BAY_MINT
    );
    const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
    const createAtaSig = await connection.sendTransaction(createAtaTx, [deployerKeypair]);
    await connection.confirmTransaction(createAtaSig, "confirmed");

    const [brokeReceiptPDA] = deriveReceiptPDA(brokeWallet.publicKey, itemPDA);

    let errorCaught = false;
    try {
      await program.methods
        .purchase()
        .accounts({
          buyer: brokeWallet.publicKey,
          buyerTokenAccount: brokeATA,
          bayMint: BAY_MINT,
          storeConfig: storeConfigPDA,
          item: itemPDA,
          receipt: brokeReceiptPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([brokeWallet])
        .rpc();
    } catch (err: any) {
      const errMsg: string = err?.message || JSON.stringify(err);
      if (
        errMsg.includes("InsufficientFunds") ||
        errMsg.includes("0x1770") || // 6000 in hex
        errMsg.includes("BAY token balance is insufficient")
      ) {
        errorCaught = true;
        console.log("  [OK] PUR-03: Insufficient funds correctly rejected");
      } else {
        throw new Error(`Unexpected error during purchase failure test: ${errMsg}`);
      }
    }

    assert.ok(errorCaught, "Expected InsufficientFunds error was not thrown");
  });

  // -----------------------------------------------------------------------
  // Task e: Record StoreConfig PDA in .env
  // -----------------------------------------------------------------------
  it("e) record StoreConfig PDA in .env", async () => {
    const envPath = path.join(__dirname, "../.env");
    const envContent = fs.readFileSync(envPath, "utf-8");

    const pdaAddress = storeConfigPDA.toBase58();

    if (envContent.includes("STORE_CONFIG_PDA=")) {
      console.log(`  [skip] STORE_CONFIG_PDA already in .env: ${pdaAddress}`);
    } else {
      const newLine = `STORE_CONFIG_PDA=${pdaAddress}\n`;
      fs.appendFileSync(envPath, newLine);
      console.log(`  [OK] Appended STORE_CONFIG_PDA=${pdaAddress} to .env`);
    }

    // Verify on-chain account exists
    const accountInfo = await connection.getAccountInfo(storeConfigPDA);
    assert.ok(accountInfo, `StoreConfig PDA ${pdaAddress} not found on-chain`);
    console.log(`  [OK] StoreConfig PDA verified on-chain: ${pdaAddress}`);
  });
});
