## BAY Token Airdrop Script

This folder contains a simple BAY SPL token airdrop script for devnet.

### Prerequisites

- `.env` in the repository root must define at least:

```env
BAY_MINT=agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB
```

- The operator wallet (airdrop sender) is the keypair pointed to by:
  - `ANCHOR_WALLET` env var, **or**
  - `C:/solana/id.json` on Windows, **or**
  - `~/.config/solana/id.json` on macOS/Linux.

That wallet must:

- Hold BAY tokens in its associated token account for `BAY_MINT`.
- Have enough SOL to pay transaction fees.

### CSV Input Format

Create a CSV file with `wallet,points` columns, for example:

```csv
wallet,points
GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3,10
7otn8Pmbwys4gEAX5SwAFc9p695SJ9vDJyt2Biw9BDXA,25
```

- `wallet`: recipient wallet address (base58 `Pubkey`).
- `points`: integer number of points to convert to BAY.

### Conversion Rule

In `scripts/airdrop-bay.ts`:

- `RAW_PER_POINT = 1_000_000n`
  - 1 point = 1 BAY = 1_000_000 raw units.

Adjust this constant if you want a different mapping.

### Usage

From the repository root:

```bash
yarn airdrop:bay --file scripts/recipients.csv
```

If `--file` is omitted, the script looks for `recipients.csv` in the repo root.

### Script Behavior

For each row in the CSV:

1. Compute raw BAY amount from `points * RAW_PER_POINT`.
2. Derive the recipient's associated token account (ATA) for `BAY_MINT`.
3. Create the ATA if it does not exist.
4. Transfer BAY tokens from the operator's BAY ATA to the recipient ATA.

At the end it prints:

- Total recipients airdropped.
- Total BAY (approx) and total raw units.
- One transaction signature per recipient.

