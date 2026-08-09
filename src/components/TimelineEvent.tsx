export function TimelineEvent({
  label,
  timestamp,
  description,
  isLast,
}: {
  label: string;
  timestamp: string;
  description?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-accent to-hue-violet" />
        {!isLast && <span className="w-px flex-1 bg-gradient-to-b from-hue-violet/40 to-transparent" />}
      </div>
      <div className="pb-6">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-ink-faint">{timestamp}</p>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}
