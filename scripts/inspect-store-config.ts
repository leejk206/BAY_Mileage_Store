import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Program constants (devnet)
const PROGRAM_ID = new PublicKey("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag");

function deriveStoreConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("store_config_v2")],
    PROGRAM_ID
  );
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const walletPath =
    process.env.ANCHOR_WALLET ||
    (process.platform === "win32"
      ? "C:/solana/id.json"
      : path.join(process.env.HOME || "", ".config/solana/id.json"));

  console.log("Using wallet file:", walletPath);

  const raw = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(raw));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const idl = require("../target/idl/bay_mileage_store.json");
  const program = new anchor.Program(idl as any, provider);

  const [storeConfigPDA] = deriveStoreConfigPDA();
  console.log("StoreConfig PDA (v2):", storeConfigPDA.toBase58());

  const accountInfo = await connection.getAccountInfo(storeConfigPDA);
  if (!accountInfo) {
    console.log("StoreConfig PDA does not exist on-chain yet.");
    return;
  }

  const config = await (program as any).account.storeConfig.fetch(storeConfigPDA);
  console.log("StoreConfig.authority:", config.authority.toBase58());
  console.log("Current wallet:", keypair.publicKey.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

