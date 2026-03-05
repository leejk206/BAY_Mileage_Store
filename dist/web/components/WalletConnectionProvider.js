"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletConnectionProvider = WalletConnectionProvider;
const react_1 = require("react");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const wallet_adapter_react_ui_1 = require("@solana/wallet-adapter-react-ui");
const wallet_adapter_wallets_1 = require("@solana/wallet-adapter-wallets");
const env_1 = require("../lib/env");
require("@solana/wallet-adapter-react-ui/styles.css");
function WalletConnectionProvider({ children }) {
    const endpoint = env_1.env.NEXT_PUBLIC_RPC_URL;
    const wallets = (0, react_1.useMemo)(() => [new wallet_adapter_wallets_1.PhantomWalletAdapter(), new wallet_adapter_wallets_1.SolflareWalletAdapter()], []);
    return (<wallet_adapter_react_1.ConnectionProvider endpoint={endpoint}>
      <wallet_adapter_react_1.WalletProvider wallets={wallets} autoConnect>
        <wallet_adapter_react_ui_1.WalletModalProvider>{children}</wallet_adapter_react_ui_1.WalletModalProvider>
      </wallet_adapter_react_1.WalletProvider>
    </wallet_adapter_react_1.ConnectionProvider>);
}
