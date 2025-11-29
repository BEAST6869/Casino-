// src/utils/format.ts

/** Formats a number with commas (e.g. 1,000) */
export function fmtAmount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Formats a number with the guild's currency emoji (e.g. 🪙 1,000) */
export function fmtCurrency(n: number, emoji: string): string {
  return `${emoji} ${fmtAmount(n)}`;
}