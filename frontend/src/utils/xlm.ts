export const STROOP_PER_XLM = 10_000_000;

export function stroopsToXlm(stroops: number | bigint | string): number {
  const n = typeof stroops === "bigint" ? Number(stroops) : Number(stroops);
  return n / STROOP_PER_XLM;
}

export function formatXlm(amount: number): string {
  return amount.toFixed(2);
}
