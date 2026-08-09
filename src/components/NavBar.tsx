"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet/useWallet";
import { truncateAddress } from "@/lib/format";
import { DEFAULT_NETWORK } from "@/lib/genlayer/config";
import { NetworkBanner } from "./NetworkBanner";

export function NavBar() {
  const { address, connecting, connect, disconnect, hasProvider } = useWallet();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display bg-gradient-to-r from-accent via-hue-blue to-hue-violet bg-clip-text text-lg tracking-tight text-transparent"
          >
            Pravax
          </Link>
          <nav className="hidden gap-4 text-sm text-ink-muted sm:flex">
            <Link href="/markets" className="hover:text-hue-blue">
              Markets
            </Link>
            <Link href="/activity" className="hover:text-hue-violet">
              Activity
            </Link>
            <Link href="/about" className="hover:text-hue-pink">
              About
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-hue-blue/30 bg-hue-blue/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-hue-blue sm:inline">
            {DEFAULT_NETWORK}
          </span>
          {address ? (
            <div className="flex items-center gap-1.5 rounded border border-border pl-3 pr-1.5 py-1.5 text-sm font-medium">
              <span>{truncateAddress(address)}</span>
              <button
                type="button"
                onClick={disconnect}
                aria-label="Disconnect wallet"
                title="Disconnect wallet"
                className="rounded px-1.5 py-0.5 text-xs text-ink-faint hover:bg-accent-soft hover:text-ink"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="rounded bg-gradient-to-r from-accent via-hue-blue to-hue-violet px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : hasProvider ? "Connect wallet" : "No wallet found"}
            </button>
          )}
        </div>
      </div>
      <NetworkBanner />
    </header>
  );
}
