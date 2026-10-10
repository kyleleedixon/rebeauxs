/** Formatting rules: $ with no decimals, except per-bottle costs which show $0.00. */

const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function money(v: unknown): string {
  const x = n(v);
  if (x === null) return "—";
  const sign = x < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
}

/** Per-bottle costs and other cents-level money. */
export function money2(v: unknown): string {
  const x = n(v);
  if (x === null) return "—";
  const sign = x < 0 ? "-" : "";
  return `${sign}$${Math.abs(x).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function count(v: unknown, decimals = 0): string {
  const x = n(v);
  if (x === null) return "—";
  return x.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** The Sheet may store percents as 0.42 or as 42. Treat |v| <= 1.5 as a fraction. */
export function percent(v: unknown, decimals = 0): string {
  const x = n(v);
  if (x === null) return "—";
  const asPct = Math.abs(x) <= 1.5 ? x * 100 : x;
  return `${asPct.toFixed(decimals)}%`;
}

export function percentValue(v: unknown): number | null {
  const x = n(v);
  if (x === null) return null;
  return Math.abs(x) <= 1.5 ? x * 100 : x;
}

/** Compact money for axis ticks: $12K, $1.2M. */
export function moneyAxis(v: unknown): string {
  const x = n(v);
  if (x === null) return "";
  const a = Math.abs(x);
  const sign = x < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`;
  return `${sign}$${Math.round(a)}`;
}

export function countAxis(v: unknown): string {
  const x = n(v);
  if (x === null) return "";
  const a = Math.abs(x);
  const sign = x < 0 ? "-" : "";
  if (a >= 1_000) return `${sign}${(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`;
  return `${sign}${Math.round(a)}`;
}

/** A value whose unit we don't know (Inputs column B, Milestones key numbers). */
export function smart(label: string, v: number | string | null): string {
  if (v === null || v === "") return "—";
  if (typeof v === "string") return v;
  const l = label.toLowerCase();
  // "Month the first money is needed" holds a date serial; "First month new
  // stores are added" holds a plain month number. Decide by size, and do it
  // before the money test — several month labels also mention cash.
  if (/^month\b/.test(l) || l.includes("first month") || l.includes("month it") || l.includes("month number")) {
    return v >= 20000 && v <= 80000 ? longMonth(serialToISO(v), count(v)) : count(v);
  }
  // Per-unit money shows cents; monthly totals and lump sums do not.
  const perUnit =
    l.includes("per bottle") ||
    l.includes("per-bottle") ||
    l.includes("per case") ||
    l.includes("per unit") ||
    l.includes("cost per") ||
    l.includes("price");
  const isPercent =
    l.includes("%") ||
    l.includes("percent") ||
    l.includes("margin") ||
    l.includes("share") ||
    l.includes("growth");
  const isMoney =
    l.includes("$") ||
    l.includes("cost") ||
    l.includes("cash") ||
    l.includes("price") ||
    l.includes("revenue") ||
    l.includes("profit") ||
    l.includes("fee") ||
    l.includes("raise") ||
    l.includes("capital") ||
    l.includes("money") ||
    l.includes("balance");
  if (isPercent) return percent(v, 1);
  if (perUnit) return money2(v);
  if (l.includes("cost") && Math.abs(v) < 100) return money2(v);
  if (isMoney) return money(v);
  if (l.includes("month")) return count(v, Number.isInteger(v) ? 0 : 1);
  return count(v, Number.isInteger(v) ? 0 : 2);
}

/** Google serial date -> "Nov '26". Serial 0 is 1899-12-30. */
export function serialToISO(serial: unknown): string | null {
  const x = n(serial);
  if (x === null) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.round(x) * 86_400_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function monthLabel(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const [y, m] = iso.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const mi = Number(m) - 1;
  if (mi < 0 || mi > 11) return fallback;
  return `${names[mi]} '${y.slice(2)}`;
}

export function longMonth(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const [y, m] = iso.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const mi = Number(m) - 1;
  if (mi < 0 || mi > 11) return fallback;
  return `${names[mi]} ${y}`;
}
