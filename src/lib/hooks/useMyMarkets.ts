"use client";

import { useEffect, useState } from "react";
import { pravax } from "@/lib/genlayer/contracts/pravax";
import type { MarketView } from "@/lib/data/market";

/**
 * The contract has no enumerable "list all markets" view — it's keyed by id,
 * not indexed. `get_user_markets` tracks every market a given address has
 * created or taken a position in, so once a wallet is connected we can
 * surface that address's real on-chain markets. Anonymous visitors cannot
 * discover arbitrary real market ids without a connected address or an
 * off-chain indexer.
 */
export function useMyMarkets(address: string | null): { markets: MarketView[]; loading: boolean } {
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !pravax.isConfigured()) return;

    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const idsRaw = await pravax.getUserMarkets(address);
        const ids: string[] = JSON.parse(idsRaw);

        const views = await Promise.all(
          ids.map(async (id): Promise<MarketView | null> => {
            try {
              const marketRaw = await pravax.getMarket(id);
              const market = JSON.parse(marketRaw);
              if (market.error) return null;

              let resolution;
              try {
                const resRaw = await pravax.getResolution(id);
                const resParsed = JSON.parse(resRaw);
                if (!resParsed.error) resolution = resParsed;
              } catch {
                resolution = undefined;
              }

              let challenges = [];
              try {
                challenges = JSON.parse(await pravax.getChallenges(id));
              } catch {
                challenges = [];
              }

              let positions = [];
              try {
                positions = JSON.parse(await pravax.getPositions(id));
              } catch {
                positions = [];
              }

              return { id, market, resolution, challenges, positions, isDemo: false };
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setMarkets(views.filter((v): v is MarketView => v !== null));
        }
      } catch {
        if (!cancelled) setMarkets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const active = Boolean(address && pravax.isConfigured());
  return { markets: active ? markets : [], loading: active && loading };
}
