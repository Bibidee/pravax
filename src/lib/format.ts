import { formatDistanceToNowStrict, isPast } from "date-fns";

export function formatUtc(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    );
  } catch {
    return iso;
  }
}

export function closesInLabel(iso: string): string {
  try {
    const d = new Date(iso);
    if (isPast(d)) return "Closed";
    return `Closes in ${formatDistanceToNowStrict(d)}`;
  } catch {
    return "";
  }
}

export function countdownLabel(iso: string): string {
  try {
    const d = new Date(iso);
    if (isPast(d)) return "Window closed";
    return formatDistanceToNowStrict(d);
  } catch {
    return "";
  }
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
