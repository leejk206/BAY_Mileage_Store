import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("8vLkdQq3Ya6ZRx4ApVLsBC6s1aLbS5dkEH29fJa8oMuW");
const NEW_BAY_MINT = new PublicKey(
  "Cy4KkUGwgqNgdbzddrhuvNStCKFFesjws7FaQLYPNmJW"
);

function deriveStoreConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("store_config_v2")],
    PROGRAM_ID
  );
}

function loadKeypair(filePath: string): anchor.web3.Keypair {
  const resolved = filePath.startsWith("~")
    ? filePath.replace("~", process.env.HOME || process.env.USERPROFILE || "")
    : filePath;
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(raw));
}

async function main() {
  const rpcUrl = "https://api.devnet.solana.com";

  // ES9D... 지갑 키파일 경로를 ANCHOR_WALLET 로 지정해 두어야 합니다.
  const walletPath =
    process.env.ANCHOR_WALLET ||
    (process.platform === "win32"
      ? "C:/solana/id.json"
      : path.join(process.env.HOME || "", ".config/solana/id.json"));

  console.log("RPC URL:", rpcUrl);
  console.log("Using wallet file:", walletPath);

  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = loadKeypair(walletPath);

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const idl = require("../target/idl/bay_mileage_store.json");
  const program = new anchor.Program(idl as any, provider);

  const [storeConfigPda] = deriveStoreConfigPda();

  console.log("StoreConfig PDA:", storeConfigPda.toBase58());
  console.log("Signer (should be NEXT_PUBLIC_ADMIN_ADDRESS):", keypair.publicKey.toBase58());

  const before: any = await (program as any).account.storeConfig.fetch(
    storeConfigPda
  );
  console.log("Before bay_mint:", before.bayMint.toBase58());

  const tx = await program.methods
    .updateConfig(NEW_BAY_MINT)
    .accounts({
      storeConfig: storeConfigPda,
      authority: keypair.publicKey,
    })
    .rpc();

  console.log("update_config tx:", tx);

  const after: any = await (program as any).account.storeConfig.fetch(
    storeConfigPda
  );
  console.log("After bay_mint:", after.bayMint.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

