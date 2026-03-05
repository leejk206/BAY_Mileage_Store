"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}
exports.env = {
    NEXT_PUBLIC_SOLANA_CLUSTER: (_a = process.env.NEXT_PUBLIC_SOLANA_CLUSTER) !== null && _a !== void 0 ? _a : "devnet",
    NEXT_PUBLIC_RPC_URL: (_b = process.env.NEXT_PUBLIC_RPC_URL) !== null && _b !== void 0 ? _b : "https://api.devnet.solana.com",
    NEXT_PUBLIC_PROGRAM_ID: requireEnv("NEXT_PUBLIC_PROGRAM_ID"),
    NEXT_PUBLIC_BAY_MINT: requireEnv("NEXT_PUBLIC_BAY_MINT"),
    NEXT_PUBLIC_STORE_CONFIG_PDA: requireEnv("NEXT_PUBLIC_STORE_CONFIG_PDA"),
};
