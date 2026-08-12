import { pravax } from "@/lib/genlayer/contracts/pravax";
import type { MarketRecord } from "@/lib/schemas/market";
import type { Resolution } from "@/lib/schemas/resolution";
import { MarketRecordSchema, PositionSchema } from "@/lib/schemas/market";
import { ResolutionSchema } from "@/lib/schemas/resolution";
import { ChallengeSchema } from "@/lib/schemas/challenge";
import type { Challenge } from "@/lib/schemas/challenge";
import type { Position } from "@/lib/schemas/market";

export type MarketView = {
  id: string;
  market: MarketRecord;
  resolution?: Resolution;
  challenges: Challenge[];
  positions: Position[];
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

    const market = MarketRecordSchema.parse(parsed);
    const resolutionValue = resolution ? ResolutionSchema.parse(resolution) : undefined;
    const challengeValues = challenges.map((item) => ChallengeSchema.parse(item));
    const positions = JSON.parse(await pravax.getPositions(id));
    return { id, market, resolution: resolutionValue, challenges: challengeValues, positions: positions.map((item: unknown) => PositionSchema.parse(item)), isDemo: false };
  } catch {
    return null;
  }
}

export async function getMarketView(id: string): Promise<MarketView | null> {
  return tryLiveMarket(id);
}
