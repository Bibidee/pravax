import type { EvidenceItem } from "@/lib/schemas/resolution";
import { SourceBadge } from "./SourceBadge";
import { formatUtc } from "@/lib/format";

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  let hostname = item.url;
  try {
    hostname = new URL(item.url).hostname;
  } catch {
    // leave raw url
  }

  return (
    <div className="rounded-lg border border-border bg-canvas-raised p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <SourceBadge role={item.source_role} />
        <a href={item.url} target="_blank" rel="noreferrer" className="truncate text-xs text-accent underline underline-offset-2">
          {hostname}
        </a>
      </div>
      <p className="text-sm leading-relaxed italic">&ldquo;{item.claim}&rdquo;</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
        <div>
          <span className="block font-semibold uppercase tracking-wide text-ink-faint">Event time</span>
          {item.event_time ? formatUtc(item.event_time) : "Unknown"}
        </div>
        <div>
          <span className="block font-semibold uppercase tracking-wide text-ink-faint">Published</span>
          {item.published_at ? formatUtc(item.published_at) : "Unknown"}
        </div>
      </div>
    </div>
  );
}
