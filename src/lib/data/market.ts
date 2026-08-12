import { pravax } from "@/lib/genlayer/contracts/pravax";
import { getDemoMarket } from "@/lib/demo/seedMarkets";
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
  const demo = getDemoMarket(id);
  if (demo) return { id: demo.id, market: demo.market, resolution: demo.resolution, challenges: demo.challenges ?? [], isDemo: true };
  return tryLiveMarket(id);
}
