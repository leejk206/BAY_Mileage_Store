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
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// 1 point = RAW_PER_POINT raw BAY units (1 BAY = 1_000_000 raw)
const RAW_PER_POINT = 1000000n;
// Default RPC endpoint (falls back to devnet)
const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
function loadEnvFromFile(envPath) {
    const result = {};
    try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex === -1)
                continue;
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key) {
                result[key] = value;
            }
        }
    }
    catch (_a) {
        // ignore missing .env
    }
    return result;
}
function loadKeypair(filePath) {
    const resolved = filePath.startsWith("~")
        ? filePath.replace("~", process.env.HOME || process.env.USERPROFILE || "")
        : filePath;
    const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    return web3_js_1.Keypair.fromSecretKey(new Uint8Array(raw));
}
function parseCsv(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    const recipients = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.toLowerCase().startsWith("wallet")) {
            // header
            continue;
        }
        const [walletStr, pointsStr] = line.split(",").map((v) => v.trim());
        if (!walletStr || !pointsStr)
            continue;
        const wallet = new web3_js_1.PublicKey(walletStr);
        const points = BigInt(pointsStr);
        recipients.push({ wallet, points });
    }
    return recipients;
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        const fileArgIndex = args.findIndex((a) => a === "--file" || a === "-f");
        const csvPath = fileArgIndex !== -1 && args[fileArgIndex + 1]
            ? path.resolve(args[fileArgIndex + 1])
            : path.resolve("recipients.csv");
        const envPath = path.join(__dirname, "..", ".env");
        const fileEnv = loadEnvFromFile(envPath);
        const rpcUrl = process.env.RPC_URL ||
            process.env.NEXT_PUBLIC_RPC_URL ||
            fileEnv["NEXT_PUBLIC_RPC_URL"] ||
            DEFAULT_RPC_URL;
        const bayMintStr = process.env.BAY_MINT ||
            fileEnv["BAY_MINT"] ||
            fileEnv["NEXT_PUBLIC_BAY_MINT"];
        if (!bayMintStr) {
            throw new Error("BAY_MINT not found in environment (.env or process.env).");
        }
        const bayMint = new web3_js_1.PublicKey(bayMintStr);
        const anchorWalletPath = process.env.ANCHOR_WALLET ||
            (process.platform === "win32"
                ? "C:/solana/id.json"
                : "~/.config/solana/id.json");
        console.log("RPC URL:", rpcUrl);
        console.log("BAY MINT:", bayMint.toBase58());
        console.log("Operator keypair path:", anchorWalletPath);
        console.log("CSV path:", csvPath);
        const connection = new web3_js_1.Connection(rpcUrl, "confirmed");
        const operator = loadKeypair(anchorWalletPath);
        const recipients = parseCsv(csvPath);
        if (recipients.length === 0) {
            console.log("No recipients found in CSV.");
            return;
        }
        const operatorAta = (0, spl_token_1.getAssociatedTokenAddressSync)(bayMint, operator.publicKey, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        console.log("Operator ATA:", operatorAta.toBase58());
        const txSignatures = [];
        let totalRaw = 0n;
        for (const { wallet, points } of recipients) {
            const amountRaw = points * RAW_PER_POINT;
            if (amountRaw === 0n) {
                console.log(`Skip ${wallet.toBase58()} (0 points)`);
                continue;
            }
            const recipientAta = (0, spl_token_1.getAssociatedTokenAddressSync)(bayMint, wallet, false, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
            const instructions = [];
            try {
                yield (0, spl_token_1.getAccount)(connection, recipientAta);
            }
            catch (_a) {
                instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(operator.publicKey, recipientAta, wallet, bayMint, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
            }
            instructions.push((0, spl_token_1.createTransferInstruction)(operatorAta, recipientAta, operator.publicKey, amountRaw, [], spl_token_1.TOKEN_PROGRAM_ID));
            const tx = new (yield Promise.resolve().then(() => __importStar(require("@solana/web3.js")))).Transaction().add(...instructions);
            const sig = yield connection.sendTransaction(tx, [operator]);
            yield connection.confirmTransaction(sig, "confirmed");
            console.log(`Airdropped ${amountRaw.toString()} raw BAY to ${wallet.toBase58()} — tx: ${sig}`);
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
    });
}
main().catch((err) => {
    console.error("Airdrop script failed:", err);
    process.exit(1);
});
