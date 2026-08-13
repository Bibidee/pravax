export function canonicalUtcSeconds(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error("Invalid timestamp");
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
