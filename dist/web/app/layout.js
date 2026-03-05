"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
require("./globals.css");
const WalletConnectionProvider_1 = require("../components/WalletConnectionProvider");
const AppLayout_1 = require("../components/AppLayout");
function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        <WalletConnectionProvider_1.WalletConnectionProvider>
          <AppLayout_1.AppLayout>{children}</AppLayout_1.AppLayout>
        </WalletConnectionProvider_1.WalletConnectionProvider>
      </body>
    </html>);
}
