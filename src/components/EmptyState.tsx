export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hue-violet/30 bg-hue-violet/5 px-6 py-14 text-center">
      <p className="font-display bg-gradient-to-r from-hue-violet to-hue-blue bg-clip-text text-lg text-transparent">
        {title}
      </p>
      <p className="max-w-md text-sm text-ink-muted">{description}</p>
      {action}
    </div>
  );
}
