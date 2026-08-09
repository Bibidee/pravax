import type { SourceRole } from "@/lib/schemas/resolution";

export function SourceBadge({ role }: { role: SourceRole }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        role === "PRIMARY"
          ? "border-accent/40 bg-accent-soft text-accent"
          : "border-hue-blue/40 bg-hue-blue/10 text-hue-blue"
      }`}
    >
      {role}
    </span>
  );
}
