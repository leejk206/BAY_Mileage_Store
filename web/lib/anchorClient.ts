"use client";

/*
 * NOTE (Anchor 0.32 Program constructor):
 * - Signature is `new Program(idl, provider, coder?, resolver?)`.
 * - It does NOT accept `(idl, programId, provider)`; instead, the program id is
 *   read from `idl.address` and translated internally.
 * - Therefore we must ensure `idl.address` is set (to PROGRAM_ID.toBase58()) and
 *   pass the provider as the second argument.
 */

import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { env } from "./env";
import idlJson from "../../target/idl/bay_mileage_store.json";

const PROGRAM_ID = new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID);

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const idlWithAddress = useMemo(
    () =>
      ({
        ...(idlJson as any),
        // Force address to match the configured PROGRAM_ID for this environment.
        address: PROGRAM_ID.toBase58(),
      }) as anchor.Idl,
    []
  );

  const provider = useMemo(
    () =>
      new anchor.AnchorProvider(
        connection,
        wallet as unknown as anchor.Wallet,
        { commitment: "confirmed" }
      ),
    [connection, wallet]
  );

  const program = useMemo(() => {
    if (!provider) return null;
    return new anchor.Program(idlWithAddress, provider);
  }, [provider, idlWithAddress]);

  return { program, provider, wallet, connection };
}

