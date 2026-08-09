export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display mb-4 text-3xl">About Pravax</h1>
      <p className="mb-4 text-ink-muted">
        Pravax is a GenLayer-native prediction resolution protocol for creating precisely specified
        future-event markets and resolving them from live public evidence through decentralized
        AI-validator consensus.
      </p>
      <p className="mb-4 text-ink-muted">
        The frontend never calculates the authoritative result. Every market carries a locked resolution
        constitution — its exact proposition, definitions, source policy, and ambiguity handling — and
        GenLayer validators interpret live web evidence against that constitution using the Equivalence
        Principle to reach consensus.
      </p>
      <p className="mb-4 text-ink-muted">
        <strong>UNRESOLVED</strong> and <strong>INVALID</strong> are genuine outcomes, not errors — Pravax
        does not force every market to a binary answer when evidence is insufficient or conflicting.
      </p>
      <p className="text-ink-muted">
        This is an MVP resolution protocol using test credits, not a licensed real-money wagering venue.
        See the repository README for architecture, deployment status, and known limitations.
      </p>
    </div>
  );
}
