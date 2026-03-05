"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GlassCard } from "./ui/GlassCard";

const NAV_ITEMS = [
  { href: "/", label: "Catalog" },
  { href: "/my-purchases", label: "My Purchases" },
  { href: "/admin", label: "Admin" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div>
      <header className="header">
        <div className="header-left">
          <Link href="/" className="logo">
            <span className="logo-mark neon-glow" />
            <span className="logo-text neon-text">BAY Mileage</span>
          </Link>
          <nav className="nav nav-desktop">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <div className="header-network">
            <span className="network-pill">Devnet</span>
          </div>
          <WalletMultiButton />
          <button
            className="mobile-menu-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-nav glass glass-hover">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="content">
        <GlassCard>{children}</GlassCard>
      </div>
    </div>
  );
}

