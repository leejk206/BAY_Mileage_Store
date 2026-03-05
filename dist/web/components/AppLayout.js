"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLayout = AppLayout;
const link_1 = __importDefault(require("next/link"));
const wallet_adapter_react_ui_1 = require("@solana/wallet-adapter-react-ui");
function AppLayout({ children }) {
    return (<div>
      <header className="header">
        <div className="header-left">
          <link_1.default href="/" className="logo">
            BAY Mileage Store
          </link_1.default>
          <nav className="nav">
            <link_1.default href="/">Catalog</link_1.default>
            <link_1.default href="/my-purchases">My Purchases</link_1.default>
            <link_1.default href="/admin">Admin</link_1.default>
          </nav>
        </div>
        <div className="header-right">
          <wallet_adapter_react_ui_1.WalletMultiButton />
        </div>
      </header>
      <div className="content">{children}</div>
    </div>);
}
