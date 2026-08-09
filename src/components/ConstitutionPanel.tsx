import type { MarketRecord } from "@/lib/schemas/market";
import { RuleRow } from "./RuleRow";
import { formatUtc } from "@/lib/format";

export function ConstitutionPanel({ market }: { market: MarketRecord }) {
  return (
    <div className="rounded-lg border border-border bg-canvas-raised p-5 shadow-[inset_3px_0_0_0] shadow-hue-violet/50">
      <p className="mb-4 bg-gradient-to-r from-hue-violet to-hue-blue bg-clip-text text-[11px] font-semibold uppercase tracking-widest text-transparent">
        Resolution constitution
      </p>
      <dl>
        <RuleRow label="What counts?">{market.definition}</RuleRow>
        <RuleRow label="When?">
          Event deadline {formatUtc(market.event_deadline)} · Resolves after {formatUtc(market.resolve_after)}
        </RuleRow>
        <RuleRow label="According to whom?">
          <ul className="space-y-1">
            {market.primary_sources.map((s) => (
              <li key={s} className="truncate">
                <a href={s} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </RuleRow>
        <RuleRow label="If sources conflict?">{market.ambiguity_policy}</RuleRow>
        {market.invalid_if.length > 0 && (
          <RuleRow label="Invalidated if">
            <ul className="list-disc space-y-1 pl-4">
              {market.invalid_if.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </RuleRow>
        )}
        <RuleRow label="Constitution hash">
          <code className="font-mono text-xs text-ink-muted">{market.constitution_hash}</code>
        </RuleRow>
      </dl>
    </div>
  );
}
