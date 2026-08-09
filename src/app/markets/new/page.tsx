import { NewMarketWizard } from "./NewMarketWizard";

export default function NewMarketPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-2xl">Create a market</h1>
      <NewMarketWizard />
    </div>
  );
}
