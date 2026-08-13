import { formatUnits, parseUnits } from "viem";

const GEN_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;

export function parseGen(value: string): bigint {
  const trimmed = value.trim();
  if (!GEN_DECIMAL.test(trimmed)) throw new Error("Enter a positive GEN amount with up to 18 decimal places.");
  const wei = parseUnits(trimmed, 18);
  if (wei <= BigInt(0)) throw new Error("GEN stake must be greater than zero.");
  return wei;
}

export function formatGen(wei: bigint | string): string {
  return formatUnits(typeof wei === "string" ? BigInt(wei) : wei, 18);
}
