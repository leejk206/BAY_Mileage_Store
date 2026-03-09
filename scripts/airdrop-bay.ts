import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// 1 point = RAW_PER_POINT raw BAY units (1 BAY = 1_000_000_000 raw, decimals = 9)
const RAW_PER_POINT = 1_000_000_000n;

// Default RPC endpoint (falls back to devnet)
const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EnvMap = Record<string, string>;

function loadEnvFromFile(envPath: string): EnvMap {
  const result: EnvMap = {};
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) {
        result[key] = value;
      }
    }
  } catch {
    // ignore missing .env
  }
  return result;
}

function loadKeypair(filePath: string): Keypair {
  const resolved = filePath.startsWith("~")
    ? filePath.replace("~", process.env.HOME || process.env.USERPROFILE || "")
    : filePath;
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(raw));
}

type CsvRecipient = {
  wallet: PublicKey;
  points: bigint;
};

function parseCsv(filePath: string): CsvRecipient[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const recipients: CsvRecipient[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.toLowerCase().startsWith("wallet")) {
      // header
      continue;
    }
    const [walletStr, pointsStr] = line.split(",").map((v) => v.trim());
    if (!walletStr || !pointsStr) continue;
    const wallet = new PublicKey(walletStr);
    const points = BigInt(pointsStr);
    recipients.push({ wallet, points });
  }
  return recipients;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex((a) => a === "--file" || a === "-f");
  const csvPath =
    fileArgIndex !== -1 && args[fileArgIndex + 1]
      ? path.resolve(args[fileArgIndex + 1])
      : path.resolve("recipients.csv");

  const envPath = path.join(__dirname, "..", ".env");
  const fileEnv = loadEnvFromFile(envPath);

  const rpcUrl =
    process.env.RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    fileEnv["NEXT_PUBLIC_RPC_URL"] ||
    DEFAULT_RPC_URL;

  const bayMintStr =
    process.env.BAY_MINT ||
    fileEnv["BAY_MINT"] ||
    fileEnv["NEXT_PUBLIC_BAY_MINT"];

  if (!bayMintStr) {
    throw new Error("BAY_MINT not found in environment (.env or process.env).");
  }

  const bayMint = new PublicKey(bayMintStr);

  const anchorWalletPath =
    process.env.ANCHOR_WALLET ||
    (process.platform === "win32"
      ? "C:/solana/id.json"
      : "~/.config/solana/id.json");

  console.log("RPC URL:", rpcUrl);
  console.log("BAY MINT:", bayMint.toBase58());
  console.log("Operator keypair path:", anchorWalletPath);
  console.log("CSV path:", csvPath);

  const connection = new Connection(rpcUrl, "confirmed");
  const operator = loadKeypair(anchorWalletPath);

  const recipients = parseCsv(csvPath);
  if (recipients.length === 0) {
    console.log("No recipients found in CSV.");
    return;
  }

  const operatorAta = getAssociatedTokenAddressSync(
    bayMint,
    operator.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("Operator ATA:", operatorAta.toBase58());

  const txSignatures: { wallet: string; signature: string }[] = [];
  let totalRaw = 0n;

  for (const { wallet, points } of recipients) {
    const amountRaw = points * RAW_PER_POINT;
    if (amountRaw === 0n) {
      console.log(`Skip ${wallet.toBase58()} (0 points)`);
      continue;
    }

    const recipientAta = getAssociatedTokenAddressSync(
      bayMint,
      wallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const instructions = [];

    try {
      await getAccount(connection, recipientAta);
    } catch {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          operator.publicKey,
          recipientAta,
          wallet,
          bayMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    instructions.push(
      createTransferInstruction(
        operatorAta,
        recipientAta,
        operator.publicKey,
        amountRaw,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const tx = new (await import("@solana/web3.js")).Transaction().add(
      ...instructions
    );

    const sig = await connection.sendTransaction(tx, [operator]);
    await connection.confirmTransaction(sig, "confirmed");

    console.log(
      `Airdropped ${amountRaw.toString()} raw BAY to ${wallet.toBase58()} — tx: ${sig}`
    );

    totalRaw += amountRaw;
    txSignatures.push({ wallet: wallet.toBase58(), signature: sig });
  }

  const totalRecipients = txSignatures.length;
  const totalBay = Number(totalRaw / RAW_PER_POINT);

  console.log("----------------------------------------------------");
  console.log("Airdrop complete.");
  console.log("Total recipients:", totalRecipients);
  console.log("Total BAY (approx):", totalBay);
  console.log("Total raw units:", totalRaw.toString());
  console.log("Signatures:");
  for (const { wallet, signature } of txSignatures) {
    console.log(`  ${wallet}: ${signature}`);
  }
}

main().catch((err) => {
  console.error("Airdrop script failed:", err);
  process.exit(1);
});

