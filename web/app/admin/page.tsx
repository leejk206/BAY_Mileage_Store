"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAnchorProgram } from "../../lib/anchorClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { env } from "../../lib/env";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { GlassCard } from "../../components/ui/GlassCard";
import { NeonButton } from "../../components/ui/NeonButton";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { ADMIN_ADDRESS, checkIsAdmin } from "../../src/constants/auth";
import { BAY_DECIMAL_FACTOR } from "../constants";

type StoreItem = {
  publicKey: string;
  name: string; // internal ID / PDA seed
  displayName: string; // user-facing label
  price: number;
  stock: number;
  imageUrl: string;
  isActive?: boolean;
};

export default function AdminPage() {
  const { program } = useAnchorProgram();
  const { publicKey } = useWallet();

  const [isAdmin, setIsAdmin] = useState(false);
  const [storeAuthority, setStoreAuthority] = useState<string | null>(null);
  const [admins, setAdmins] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<StoreItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Add Item form
  const [addName, setAddName] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addPriceBay, setAddPriceBay] = useState("");
  const [addStock, setAddStock] = useState("");
  const [addImageUrl, setAddImageUrl] = useState("");
  const [adding, setAdding] = useState(false);

  // Update Item form
  const [selectedItemPk, setSelectedItemPk] = useState("");
  const [updateDisplayName, setUpdateDisplayName] = useState("");
  const [updatePriceBay, setUpdatePriceBay] = useState("");
  const [updateStock, setUpdateStock] = useState("");
  const [updateImageUrl, setUpdateImageUrl] = useState("");
  const [updating, setUpdating] = useState(false);

  const [addTxSig, setAddTxSig] = useState<string | null>(null);
  const [updateTxSig, setUpdateTxSig] = useState<string | null>(null);
  const [initTxSig, setInitTxSig] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  // Sales summary
  const [totalBurned, setTotalBurned] = useState<number | null>(null);
  const [totalReceipts, setTotalReceipts] = useState<number | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  // Admin management form
  const [newAdminAddress, setNewAdminAddress] = useState("");

  // v3 StoreConfig PDA derived from seeds; no longer read from env PDA
  const storeConfigPda = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("store_config_v3")],
      new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID)
    );
    return pda;
  }, []);

  useEffect(() => {
    if (!program) return;
    (async () => {
      try {
        setError(null);
        const config: any = await (program as any).account.storeConfig.fetch(
          storeConfigPda
        );
        // v2 StoreConfig 가 온체인에 존재함
        const onChainAdmins: string[] = (config.admins as any[] | undefined)
          ?.map((k: any) => k.toBase58?.() ?? String(k))
          ?? [];
        setAdmins(onChainAdmins);
        const authority = config.authority.toBase58();
        setStoreAuthority(authority);
        const walletAddress = publicKey?.toBase58();
        const isEnvAdmin = checkIsAdmin(walletAddress);
        const isOnChainAdmin =
          walletAddress !== undefined &&
          onChainAdmins.includes(walletAddress);
        // env admin 이면 온체인 admins 와 무관하게 admin 인정,
        // 아니면 admins 목록 기준
        setIsAdmin(isEnvAdmin || isOnChainAdmin);
      } catch (e: any) {
        const msg: string = e?.message ?? "";
        // 아직 v2 StoreConfig PDA 계정이 생성되지 않은 경우: 치명적인 에러로 보지 않고
        // 초기화 버튼을 통해 생성할 수 있도록 조용히 무시한다.
        if (
          msg.includes("Account does not exist") ||
          msg.includes("could not find account")
        ) {
          return;
        }
        if (msg.includes("429") || msg.includes("Too Many Requests")) {
          setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
        } else {
          setError(msg || "Failed to load store config");
        }
      }
    })();
  }, [program, publicKey, storeConfigPda]);

  // Load items for update form
  useEffect(() => {
    if (!program || !isAdmin) return;
    (async () => {
      try {
        setItemsLoading(true);
        const conn = (program as any).provider?.connection;
        const rawAccounts = await conn.getProgramAccounts(program.programId);
        const coder = (program as any).coder;

        const decoded: StoreItem[] = [];
        for (const acc of rawAccounts) {
          try {
            const itemAccount: any = coder.accounts.decode(
              "storeItem",
              acc.account.data
            );
            decoded.push({
              publicKey: acc.pubkey.toBase58(),
              name: itemAccount.name as string,
              displayName: itemAccount.displayName as string,
              price: Number(itemAccount.price),
              stock: Number(itemAccount.stock),
              imageUrl: itemAccount.imageUrl as string,
              isActive:
                (itemAccount as any).isActive === undefined
                  ? true
                  : Boolean((itemAccount as any).isActive),
            });
          } catch {
            // Not a StoreItem or old layout; ignore
          }
        }

        setItems(decoded);
      } catch (e: any) {
        const msg: string = e?.message ?? "";
        if (msg.includes("429") || msg.includes("Too Many Requests")) {
          setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
        } else {
          setError(msg || "Failed to load items");
        }
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [program, isAdmin]);

  // Aggregate total BAY burned across all receipts
  useEffect(() => {
    if (!program || !isAdmin) return;
    (async () => {
      try {
        setSalesLoading(true);
        const receipts = await (program as any).account.purchaseReceipt.all();
        let sum = 0;
        for (const r of receipts) {
          // amountBurned is u64; assume safe to cast to number for devnet scale
          sum += Number(r.account.amountBurned);
        }
        setTotalBurned(sum);
        setTotalReceipts(receipts.length);
      } catch (e: any) {
        const msg: string = e?.message ?? "";
        if (msg.includes("429") || msg.includes("Too Many Requests")) {
          setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
        } else {
          setError(msg || "Failed to load sales summary");
        }
      } finally {
        setSalesLoading(false);
      }
    })();
  }, [program, isAdmin]);

  const selectedItem = useMemo(
    () => items.find((i) => i.publicKey === selectedItemPk),
    [items, selectedItemPk]
  );

  const authorityDisplay = useMemo(() => {
    const envAdmin = ADMIN_ADDRESS || null;
    const onChain = storeAuthority;
    const walletAddress = publicKey?.toBase58().trim();

    if (walletAddress && envAdmin && walletAddress === envAdmin) {
      return { value: walletAddress, source: "(From Environment)" };
    }

    if (walletAddress && onChain && walletAddress === onChain.trim()) {
      return { value: walletAddress, source: "(On-chain)" };
    }

    if (onChain) {
      return { value: onChain, source: "(On-chain)" };
    }

    if (envAdmin) {
      return { value: envAdmin, source: "(From Environment)" };
    }

    return { value: null as string | null, source: "" };
  }, [storeAuthority, publicKey]);

  const formatAddress = (addr: string | null | undefined) => {
    if (!addr) return "Loading...";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  function parseBayToRaw(bay: string): BN {
    const n = Number(bay);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Invalid BAY amount");
    }
    const raw = Math.round(n * BAY_DECIMAL_FACTOR);
    return new BN(raw);
  }

  const MAX_IMAGE_URL_LENGTH = 1024;
  const MAX_NAME_ID_LENGTH = 32;
  const MAX_DISPLAY_NAME_LENGTH = 64;

  function validateNameId(id: string): string | null {
    if (!id) return "Name (ID) is required.";
    if (id.length > MAX_NAME_ID_LENGTH) {
      return `Name (ID) must be ≤ ${MAX_NAME_ID_LENGTH} characters.`;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return "Name (ID) must use only A–Z, a–z, 0–9, -, _ characters.";
    }
    return null;
  }

  function validateImageUrl(url: string): string | null {
    if (!url) return null; // 이미지 없이도 허용
    if (url.length > MAX_IMAGE_URL_LENGTH)
      return `Image URL must be ${MAX_IMAGE_URL_LENGTH} characters or fewer.`;
    // 아주 간단한 형식 체크만 수행 (http/https로 시작)
    if (!/^https?:\/\/.+/i.test(url)) {
      return "Image URL must start with http:// or https://";
    }
    return null;
  }

  async function handleInitializeStore() {
    if (!program || !publicKey) return;

    try {
      setError(null);
      setInitializing(true);

      const tx = await (program as any).methods
        .initializeStore()
        .accounts({
          storeConfig: storeConfigPda,
          bayMint: new PublicKey(env.NEXT_PUBLIC_BAY_MINT),
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setInitTxSig(tx);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to initialize store");
      }
    } finally {
      setInitializing(false);
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    const nameError = validateNameId(addName);
    if (nameError) {
      setError(nameError);
      return;
    }
    if (!addDisplayName || addDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(
        `Display name is required and must be ≤ ${MAX_DISPLAY_NAME_LENGTH} characters.`
      );
      return;
    }
    const imageError = validateImageUrl(addImageUrl);
    if (imageError) {
      setError(imageError);
      return;
    }

    try {
      setError(null);
      setAdding(true);

      const priceRaw = parseBayToRaw(addPriceBay);
      const stockNum = Number(addStock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        throw new Error("Invalid stock value");
      }

      const [itemPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("item_v2"), Buffer.from(addName)],
        new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID)
      );

      await (program as any).methods
        .addItem(
          addName,
          addDisplayName,
          priceRaw,
          new BN(stockNum),
          addImageUrl
        )
        .accounts({
          item: itemPda,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setAddTxSig(sig);
        });

      setAddName("");
      setAddDisplayName("");
      setAddPriceBay("");
      setAddStock("");
      setAddImageUrl("");
      // keep last tx sig visible

      const conn = (program as any).provider?.connection;
      const rawAccounts = await conn.getProgramAccounts(program.programId);
      const coder = (program as any).coder;
      const decoded: StoreItem[] = [];
      for (const acc of rawAccounts) {
        try {
          const itemAccount: any = coder.accounts.decode(
            "storeItem",
            acc.account.data
          );
          decoded.push({
            publicKey: acc.pubkey.toBase58(),
            name: itemAccount.name as string,
            displayName: itemAccount.displayName as string,
            price: Number(itemAccount.price),
            stock: Number(itemAccount.stock),
            imageUrl: itemAccount.imageUrl as string,
            isActive:
              (itemAccount as any).isActive === undefined
                ? true
                : Boolean((itemAccount as any).isActive),
          });
        } catch {
          // ignore non-StoreItem / old layout
        }
      }
      setItems(decoded);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to add item");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateItem(e: FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    if (!selectedItemPk) {
      setError("Select an item to update.");
      return;
    }

    try {
      setError(null);
      setUpdating(true);

      const priceRaw = parseBayToRaw(updatePriceBay);
      const stockNum = Number(updateStock);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        throw new Error("Invalid stock value");
      }
      const imageError = validateImageUrl(updateImageUrl);
      if (imageError) {
        throw new Error(imageError);
      }

      const current = selectedItem;
      const nextDisplay =
        updateDisplayName.trim().length > 0
          ? updateDisplayName.trim()
          : current?.displayName || "";
      if (!nextDisplay || nextDisplay.length > MAX_DISPLAY_NAME_LENGTH) {
        throw new Error(
          `Display name must be non-empty and ≤ ${MAX_DISPLAY_NAME_LENGTH} characters.`
        );
      }

      const itemPubkey = new PublicKey(selectedItemPk);

      await (program as any).methods
        .updateItem(nextDisplay, priceRaw, new BN(stockNum), updateImageUrl)
        .accounts({
          item: itemPubkey,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setUpdateTxSig(sig);
        });

      setUpdateDisplayName("");
      setUpdatePriceBay("");
      setUpdateStock("");
      setUpdateImageUrl("");

      const conn = (program as any).provider?.connection;
      const rawAccounts = await conn.getProgramAccounts(program.programId);
      const coder = (program as any).coder;
      const decoded: StoreItem[] = [];
      for (const acc of rawAccounts) {
        try {
          const itemAccount: any = coder.accounts.decode(
            "storeItem",
            acc.account.data
          );
          decoded.push({
            publicKey: acc.pubkey.toBase58(),
            name: itemAccount.name as string,
            displayName: itemAccount.displayName as string,
            price: Number(itemAccount.price),
            stock: Number(itemAccount.stock),
            imageUrl: itemAccount.imageUrl as string,
            isActive:
              (itemAccount as any).isActive === undefined
                ? true
                : Boolean((itemAccount as any).isActive),
          });
        } catch {
          // ignore non-StoreItem / old layout
        }
      }
      setItems(decoded);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to update item");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkSoldOut() {
    if (!program || !publicKey || !selectedItem) return;
    try {
      setError(null);
      setUpdating(true);

      const itemPubkey = new PublicKey(selectedItem.publicKey);
      const currentDisplay = selectedItem.displayName;
      const currentPrice = new BN(selectedItem.price);
      const currentImage = selectedItem.imageUrl;

      await (program as any).methods
        .updateItem(currentDisplay, currentPrice, new BN(0), currentImage)
        .accounts({
          item: itemPubkey,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setUpdateTxSig(sig);
        });

      const conn = (program as any).provider?.connection;
      const rawAccounts = await conn.getProgramAccounts(program.programId);
      const coder = (program as any).coder;
      const decoded: StoreItem[] = [];
      for (const acc of rawAccounts) {
        try {
          const itemAccount: any = coder.accounts.decode(
            "storeItem",
            acc.account.data
          );
          decoded.push({
            publicKey: acc.pubkey.toBase58(),
            name: itemAccount.name as string,
            displayName: itemAccount.displayName as string,
            price: Number(itemAccount.price),
            stock: Number(itemAccount.stock),
            imageUrl: itemAccount.imageUrl as string,
            isActive:
              (itemAccount as any).isActive === undefined
                ? true
                : Boolean((itemAccount as any).isActive),
          });
        } catch {
          // ignore non-StoreItem / old layout
        }
      }
      setItems(decoded);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to update item");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleItemStatus() {
    if (!program || !publicKey || !selectedItem) return;
    try {
      setError(null);
      setUpdating(true);

      const itemPubkey = new PublicKey(selectedItem.publicKey);

      await (program as any).methods
        .toggleItemStatus()
        .accounts({
          item: itemPubkey,
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc()
        .then((sig: string) => {
          setUpdateTxSig(sig);
        });

      const conn = (program as any).provider?.connection;
      const rawAccounts = await conn.getProgramAccounts(program.programId);
      const coder = (program as any).coder;
      const decoded: StoreItem[] = [];
      for (const acc of rawAccounts) {
        try {
          const itemAccount: any = coder.accounts.decode(
            "storeItem",
            acc.account.data
          );
          decoded.push({
            publicKey: acc.pubkey.toBase58(),
            name: itemAccount.name as string,
            displayName: itemAccount.displayName as string,
            price: Number(itemAccount.price),
            stock: Number(itemAccount.stock),
            imageUrl: itemAccount.imageUrl as string,
            isActive:
              (itemAccount as any).isActive === undefined
                ? true
                : Boolean((itemAccount as any).isActive),
          });
        } catch {
          // ignore non-StoreItem / old layout
        }
      }
      setItems(decoded);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to toggle item status");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddAdmin(e: FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    try {
      setError(null);
      const pk = new PublicKey(newAdminAddress.trim());
      await (program as any).methods
        .addAdmin(pk)
        .accounts({
          storeConfig: storeConfigPda,
          authority: publicKey,
        })
        .rpc();

      // Refresh config to get updated admins
      const config: any = await (program as any).account.storeConfig.fetch(
        storeConfigPda
      );
      const updatedAdmins: string[] = (config.admins as any[] | undefined)
        ?.map((k: any) => k.toBase58?.() ?? String(k))
        ?? [];
      setAdmins(updatedAdmins);
      setNewAdminAddress("");
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        setError("네트워크 요청이 많습니다. 잠시 후 다시 시도해주세요");
      } else {
        setError(msg || "Failed to add admin");
      }
    }
  }

  return (
    <main className="container">
      <SectionHeader
        title="Admin Console"
        subtitle="Operate the BAY Mileage Store catalog on devnet."
        rightSlot={
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-white/15 bg-white/5 px-3 py-1 text-[0.8rem] text-gray-200">
            <span className="uppercase tracking-[0.16em] text-[0.8rem] text-gray-400">
              Authority
            </span>
            <span className="font-mono">
              {formatAddress(authorityDisplay.value)}
            </span>
            {authorityDisplay.source && (
              <span className="ml-1 text-[0.7rem] text-gray-400">
                {authorityDisplay.source}
              </span>
            )}
          </div>
        }
      />

      {error && <p className="error">{error}</p>}

      <GlassCard className="mt-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-gray-400">
              Use this console to add or update catalog items for the event
              store.
            </p>
            {publicKey && (
              <div className="mt-2 flex items-center gap-2 text-[0.8rem] text-gray-400">
                <NeonButton
                  type="button"
                  disabled={initializing}
                  onClick={handleInitializeStore}
                >
                  {initializing
                    ? "Initializing..."
                    : "Initialize StoreConfig with this wallet"}
                </NeonButton>
              </div>
            )}
            {initTxSig && (
              <p className="mt-1 text-[0.75rem] text-emerald-300 break-all">
                Init tx: {initTxSig}
              </p>
            )}
          </div>
          <div className="text-sm text-right sm:text-left">
            {publicKey ? (
              <>
                <div className="text-gray-400 text-[0.8rem] mb-1">
                  Connected wallet
                </div>
                <div className="font-mono text-[0.8rem]">
                  {formatAddress(publicKey.toBase58())}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Connect your wallet to check admin rights.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {!isAdmin && (
        <GlassCard className="mt-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-red-400">!</div>
            <div>
              <p className="text-sm font-medium text-red-300">
                Not authorized for admin actions
              </p>
              <p className="mt-1 text-[0.8rem] text-red-200/80">
                This wallet is not the store authority configured in
                StoreConfig. Only the authority can add or update catalog
                items.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {isAdmin && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <GlassCard className="md:col-span-2 border-yellow-400/40 bg-yellow-500/5 mb-2">
            <p className="text-[0.8rem] text-yellow-100">
              토큰 Decimals 가 9로 변경되었습니다. 기존에 등록된 아이템은 이전 단위(예:
              5&nbsp;→&nbsp;5,000,000)로 저장되어 있을 수 있습니다. 각 아이템을 선택한 뒤{" "}
              <span className="font-semibold">New price (BAY)</span> 에 올바른 가격(예:
              5)을 다시 입력하고 <span className="font-semibold">Update Item</span> 을
              눌러 가격을 재설정해 주세요.
            </p>
          </GlassCard>
          <GlassCard className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-100">
              Admins
            </h2>
            <p className="mt-1 text-[0.8rem] text-gray-400">
              온체인 StoreConfig.admins 에 등록된 관리자 주소 목록입니다.
            </p>
            <ul className="mt-2 space-y-1 text-[0.8rem] font-mono text-gray-200">
              {admins.length === 0 && (
                <li className="text-gray-500">No admins configured.</li>
              )}
              {admins.map((a) => (
                <li key={a} className="break-all">
                  {a}
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddAdmin} className="mt-3 space-y-1.5">
              <label className="block text-[0.8rem] font-medium text-gray-300">
                Add admin address
              </label>
              <input
                type="text"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                placeholder="New admin pubkey"
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
              />
              <NeonButton type="submit" disabled={!newAdminAddress.trim()}>
                Add Admin
              </NeonButton>
            </form>
          </GlassCard>
          <GlassCard className="md:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.8rem] text-gray-300 font-semibold">
                  총 매출 (BAY 기준)
                </p>
                <p className="text-[0.85rem] text-gray-100">
                  {totalBurned !== null
                    ? `${(totalBurned / BAY_DECIMAL_FACTOR).toString()} BAY`
                    : "—"}
                </p>
              </div>
              <div className="text-right text-[0.75rem] text-gray-400">
                {salesLoading
                  ? "매출 데이터 불러오는 중..."
                  : totalReceipts !== null
                  ? `총 영수증 수: ${totalReceipts}`
                  : ""}
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-sm font-semibold text-gray-100">
              Add Item
            </h2>
            <p className="mt-1 text-[0.8rem] text-gray-400">
              Name is the on-chain ID and is immutable once created.
            </p>
            <form onSubmit={handleAddItem} className="mt-4 space-y-1.5">
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Name (ID, ≤ {MAX_NAME_ID_LENGTH})
                </label>
                <input
                  type="text"
                  value={addName}
                  maxLength={MAX_NAME_ID_LENGTH}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. BAY_HOODIE"
                />
                <p className="mt-1 text-[0.8rem] text-gray-500">
                  Used as the PDA seed (A–Z, a–z, 0–9, -, _) and cannot be
                  changed later.
                </p>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Display name (≤ {MAX_DISPLAY_NAME_LENGTH})
                </label>
                <input
                  type="text"
                  value={addDisplayName}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  onChange={(e) => setAddDisplayName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. 스타벅스 아메리카노 Tall"
                />
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Price (BAY)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={addPriceBay}
                  onChange={(e) => setAddPriceBay(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Image URL
                </label>
                <input
                  type="url"
                  value={addImageUrl}
                  onChange={(e) => setAddImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="https://example.com/image.png"
                />
                <p className="mt-1 text-[0.8rem] text-gray-500">
                  Optional. Supports http(s) image URLs (max{" "}
                  {MAX_IMAGE_URL_LENGTH} characters).
                </p>
              </div>
              <div>
                <label className="block text-[0.8rem] font-medium text-gray-300">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. 10"
                />
              </div>
              <NeonButton type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Item"}
              </NeonButton>
              {addTxSig && (
                <div className="mt-2 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[0.8rem] text-emerald-100">
                  <div className="font-medium mb-0.5">
                    Add item transaction sent
                  </div>
                  <div className="font-mono break-all">
                    {addTxSig}
                  </div>
                </div>
              )}
            </form>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold text-gray-100">
              Update Item
            </h2>
            {itemsLoading && (
              <p className="mt-2 text-[0.8rem] text-gray-400">
                Loading items from chain...
              </p>
            )}
            {!itemsLoading && items.length === 0 && (
              <p className="mt-2 text-[0.8rem] text-gray-400">
                No items found. Add an item first.
              </p>
            )}
            {items.length > 0 && (
              <form onSubmit={handleUpdateItem} className="mt-4 space-y-1.5">
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    Select item
                  </label>
                  <select
                    value={selectedItemPk}
                    onChange={(e) => setSelectedItemPk(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.publicKey} value={item.publicKey}>
                        {item.displayName} ({item.name}) (
                        {formatAddress(item.publicKey)}){" "}
                        {item.isActive === false ? "[hidden]" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedItem && (
                    <p className="mt-1 text-[0.8rem] text-gray-500">
                      Current:{" "}
                      <span className="font-mono">
                        {(selectedItem.price / BAY_DECIMAL_FACTOR).toString()} BAY
                      </span>{" "}
                      · Stock{" "}
                      <span className="font-mono">
                        {selectedItem.stock}
                      </span>
                      <br />
                      ID: <span className="font-mono">{selectedItem.name}</span>
                      <br />
                      Display:{" "}
                      <span className="font-mono">
                        {selectedItem.displayName}
                      </span>
                      <br />
                      Status:{" "}
                      <span
                        className={
                          selectedItem.isActive === false
                            ? "text-red-300"
                            : "text-emerald-300"
                        }
                      >
                        {selectedItem.isActive === false ? "Hidden" : "Active"}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New display name (optional, ≤ {MAX_DISPLAY_NAME_LENGTH})
                  </label>
                  <input
                    type="text"
                    value={updateDisplayName}
                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                    onChange={(e) => setUpdateDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="Leave blank to keep current display name"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New price (BAY)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={updatePriceBay}
                    onChange={(e) => setUpdatePriceBay(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="e.g. 6"
                  />
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New image URL
                  </label>
                  <input
                    type="url"
                    value={updateImageUrl}
                    onChange={(e) => setUpdateImageUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="https://example.com/image.png"
                  />
                  {selectedItem && selectedItem.imageUrl && (
                    <p className="mt-1 text-[0.8rem] text-gray-500">
                      Current image:{" "}
                      <span className="underline break-all">
                        {selectedItem.imageUrl}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[0.8rem] font-medium text-gray-300">
                    New stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={updateStock}
                    onChange={(e) => setUpdateStock(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <NeonButton type="submit" disabled={updating}>
                    {updating ? "Updating..." : "Update Item"}
                  </NeonButton>
                  <NeonButton
                    type="button"
                    disabled={updating || !selectedItem}
                    variant="ghost"
                    onClick={handleToggleItemStatus}
                  >
                    {selectedItem?.isActive === false ? "Show Item" : "Hide Item"}
                  </NeonButton>
                </div>
                {updateTxSig && (
                  <div className="mt-2 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[0.8rem] text-emerald-100">
                    <div className="font-medium mb-0.5">
                      Update item transaction sent
                    </div>
                    <div className="font-mono break-all">
                      {updateTxSig}
                    </div>
                  </div>
                )}
              </form>
            )}
          </GlassCard>
          <div className="md:col-span-2 mt-4 text-[0.75rem] text-gray-500">
            <p className="font-mono break-all">
              StoreConfig PDA: {storeConfigPda.toBase58()}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}


