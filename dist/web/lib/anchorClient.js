"use strict";
"use client";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAnchorProgram = useAnchorProgram;
const react_1 = require("react");
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const env_1 = require("./env");
const bay_mileage_store_json_1 = __importDefault(require("../../target/idl/bay_mileage_store.json"));
const idl = bay_mileage_store_json_1.default;
const PROGRAM_ID = new web3_js_1.PublicKey(env_1.env.NEXT_PUBLIC_PROGRAM_ID);
function useAnchorProgram() {
    const { connection } = (0, wallet_adapter_react_1.useConnection)();
    const wallet = (0, wallet_adapter_react_1.useWallet)();
    const provider = (0, react_1.useMemo)(() => {
        return new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    }, [connection, wallet]);
    const program = (0, react_1.useMemo)(() => {
        if (!provider)
            return null;
        return new anchor.Program(idl, PROGRAM_ID, provider);
    }, [provider]);
    return { program, provider, wallet, connection };
}
