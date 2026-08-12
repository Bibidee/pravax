"use client";

import { useEffect, useState } from "react";
import { pravax } from "@/lib/genlayer/contracts/pravax";
import type { MarketView } from "@/lib/data/market";
import { MarketRecordSchema, PositionSchema } from "@/lib/schemas/market";
import { ResolutionSchema } from "@/lib/schemas/resolution";
import { ChallengeSchema } from "@/lib/schemas/challenge";

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
              const market = MarketRecordSchema.parse(JSON.parse(marketRaw));

              let resolution;
              try {
                const resRaw = await pravax.getResolution(id);
                const resParsed = JSON.parse(resRaw);
                if (!resParsed.error) resolution = ResolutionSchema.parse(resParsed);
              } catch {
                resolution = undefined;
              }

              let challenges = [];
              try {
                challenges = JSON.parse(await pravax.getChallenges(id)).map((item: unknown) => ChallengeSchema.parse(item));
              } catch {
                challenges = [];
              }

              let positions = [];
              try {
                positions = JSON.parse(await pravax.getPositions(id)).map((item: unknown) => PositionSchema.parse(item));
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

export function useAllMarkets(): { markets: MarketView[]; loading: boolean } {
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!pravax.isConfigured()) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const ids = JSON.parse(await pravax.getMarketIds(0, 100)) as string[];
        const views = await Promise.all(ids.map(async (id) => {
          try {
            const market = MarketRecordSchema.parse(JSON.parse(await pravax.getMarket(id)));
            const resolutionRaw = JSON.parse(await pravax.getResolution(id));
            const challenges = JSON.parse(await pravax.getChallenges(id)).map((item: unknown) => ChallengeSchema.parse(item));
            const positions = JSON.parse(await pravax.getPositions(id)).map((item: unknown) => PositionSchema.parse(item));
            return { id, market, resolution: resolutionRaw.error ? undefined : ResolutionSchema.parse(resolutionRaw), challenges, positions, isDemo: false };
          } catch { return null; }
        }));
        if (!cancelled) setMarkets(views.filter(Boolean) as MarketView[]);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  return { markets, loading };
}
