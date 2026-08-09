import { pravax } from "@/lib/genlayer/contracts/pravax";
import { DEMO_MARKETS, getDemoMarket } from "@/lib/demo/seedMarkets";
import type { MarketRecord } from "@/lib/schemas/market";
import type { Resolution } from "@/lib/schemas/resolution";
import type { Challenge } from "@/lib/schemas/challenge";

export type MarketView = {
  id: string;
  market: MarketRecord;
  resolution?: Resolution;
  challenges: Challenge[];
  isDemo: boolean;
};

async function tryLiveMarket(id: string): Promise<MarketView | null> {
  if (!pravax.isConfigured()) return null;
  try {
    const raw = await pravax.getMarket(id);
    const parsed = JSON.parse(raw);
    if (parsed.error) return null;

    let resolution: Resolution | undefined;
    try {
      const resRaw = await pravax.getResolution(id);
      const resParsed = JSON.parse(resRaw);
      if (!resParsed.error) resolution = resParsed;
    } catch {
      resolution = undefined;
    }

    let challenges: Challenge[] = [];
    try {
      challenges = JSON.parse(await pravax.getChallenges(id));
    } catch {
      challenges = [];
    }

    return { id, market: parsed as MarketRecord, resolution, challenges, isDemo: false };
  } catch {
    return null;
  }
}

export async function getMarketView(id: string): Promise<MarketView | null> {
  const live = await tryLiveMarket(id);
  if (live) return live;

  const demo = getDemoMarket(id);
  if (!demo) return null;
  return { id: demo.id, market: demo.market, resolution: demo.resolution, challenges: demo.challenges ?? [], isDemo: true };
}

export async function listMarketViews(): Promise<MarketView[]> {
  // No enumerable "list all markets" view exists on-chain yet (the contract
  // is keyed by id, not indexed); once deployed, real markets should be
  // surfaced via get_user_markets per-connected-address or an off-chain
  // indexer. Until then this always shows the labeled demo templates.
  return DEMO_MARKETS.map((d) => ({
    id: d.id,
    market: d.market,
    resolution: d.resolution,
    challenges: d.challenges ?? [],
    isDemo: true,
  }));
}
