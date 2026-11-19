/** Integer cents. Dollar math in this file never uses binary floats for stored values. */

export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatUSDRange(low: number | null, high: number | null): string {
  if (low == null || high == null) return "No dollar estimate";
  if (low === high) return `${formatUSD(low)} / year`;
  return `${formatUSD(low)}–${formatUSD(high)} / year`;
}

export function parseDollars(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return toCents(n);
}

export function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(iso: string, today: string): number | null {
  const target = Date.parse(`${iso}T00:00:00`);
  const start = Date.parse(`${today}T00:00:00`);
  if (Number.isNaN(target) || Number.isNaN(start)) return null;
  return Math.round((target - start) / 86_400_000);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
