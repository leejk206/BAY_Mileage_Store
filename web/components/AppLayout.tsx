"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="header">
        <div className="header-left">
          <Link href="/" className="logo">
            BAY Mileage Store
          </Link>
          <nav className="nav">
            <Link href="/">Catalog</Link>
            <Link href="/my-purchases">My Purchases</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
        <div className="header-right">
          <WalletMultiButton />
        </div>
      </header>
      <div className="content">{children}</div>
    </div>
  );
}

