import { notFound } from "next/navigation";
import { getMarketView } from "@/lib/data/market";
import { ChallengeClient } from "./ChallengeClient";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getMarketView(id);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-2xl">{view.market.question}</h1>
      <ChallengeClient view={view} />
    </div>
  );
}
