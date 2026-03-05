"use client";

import "./globals.css";
import { ReactNode } from "react";
import { WalletConnectionProvider } from "../components/WalletConnectionProvider";
import { AppLayout } from "../components/AppLayout";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletConnectionProvider>
          <AppLayout>{children}</AppLayout>
        </WalletConnectionProvider>
      </body>
    </html>
  );
}

