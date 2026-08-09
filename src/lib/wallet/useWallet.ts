"use client";

import { useCallback, useEffect, useState } from "react";

export type WalletState = {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

/**
 * Minimal injected-wallet hook. GenLayer's SDK (genlayer-js) already owns
 * chain switching via `client.connect()` and transaction signing via
 * `writeContract({ provider: window.ethereum })`, so this hook only tracks
 * the connected address rather than re-implementing a wagmi config against
 * a non-standard chain registry.
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>({ address: null, connecting: false, error: null });

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({ ...s, address: (accounts[0] as `0x${string}`) ?? null }));
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    return () => window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((s) => ({ ...s, error: "No injected wallet found. Install MetaMask or a compatible wallet." }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      setState({ address: (accounts[0] as `0x${string}`) ?? null, connecting: false, error: null });
    } catch (err) {
      setState({ address: null, connecting: false, error: err instanceof Error ? err.message : "Failed to connect wallet" });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, connecting: false, error: null });
  }, []);

  return { ...state, connect, disconnect, hasProvider: typeof window !== "undefined" && Boolean(window.ethereum) };
}
