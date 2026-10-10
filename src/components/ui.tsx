import type { ReactNode } from "react";

/* ---------------------------------- shell ---------------------------------- */

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-10 first:mt-0 scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {eyebrow ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>
      </div>
      {lead ? <p className="mb-4 max-w-3xl text-sm text-ink2">{lead}</p> : null}
      {children}
    </section>
  );
}

export function Card({
  title,
  subtitle,
  aside,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-hair bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-5 ${className}`}
    >
      {title || aside ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title ? (
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
            ) : null}
            {subtitle ? <p className="mt-0.5 text-xs text-ink2">{subtitle}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/* ---------------------------------- pills ---------------------------------- */

export type PillKind =
  | "real"
  | "guess"
  | "good"
  | "warn"
  | "critical"
  | "nodata"
  | "info";

const PILL: Record<PillKind, { cls: string; icon: string }> = {
  real: { cls: "border-good/45 bg-good/10 text-successtext", icon: "✓" },
  guess: { cls: "border-warn/60 bg-warn/20 text-ink", icon: "?" },
  good: { cls: "border-good/45 bg-good/10 text-successtext", icon: "✓" },
  warn: { cls: "border-warn/60 bg-warn/20 text-ink", icon: "!" },
  critical: { cls: "border-critical/50 bg-critical/12 text-critical", icon: "✕" },
  nodata: { cls: "border-hair bg-wash text-muted", icon: "–" },
  info: { cls: "border-sauce/40 bg-sauce/10 text-ink", icon: "·" },
};

export function Pill({
  kind,
  children,
  title,
  showIcon = true,
}: {
  kind: PillKind;
  children: ReactNode;
  title?: string;
  showIcon?: boolean;
}) {
  const p = PILL[kind];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium leading-4 ${p.cls}`}
    >
      {showIcon ? <span aria-hidden="true">{p.icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

/* ---------------------------------- tiles ---------------------------------- */

export function Tile({
  label,
  value,
  sub,
  pill,
  tone = "plain",
  hero = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  pill?: ReactNode;
  tone?: "plain" | "good" | "warn" | "critical";
  hero?: boolean;
}) {
  const ring =
    tone === "critical"
      ? "border-critical/40"
      : tone === "warn"
        ? "border-warn/50"
        : tone === "good"
          ? "border-good/40"
          : "border-hair";
  return (
    <div className={`flex min-w-0 flex-col rounded-xl border bg-surface p-4 ${ring}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {pill}
      </div>
      <span
        className={`mt-2 font-semibold tracking-tight text-ink ${
          hero ? "text-3xl sm:text-4xl" : "text-2xl"
        }`}
      >
        {value}
      </span>
      {sub ? <span className="mt-1 text-xs leading-5 text-ink2">{sub}</span> : null}
    </div>
  );
}

/* --------------------------------- notices --------------------------------- */

export function Notice({
  kind,
  title,
  children,
}: {
  kind: "warn" | "critical" | "info";
  title: string;
  children?: ReactNode;
}) {
  const cls =
    kind === "critical"
      ? "border-critical/50 bg-critical/10"
      : kind === "warn"
        ? "border-warn/60 bg-warn/15"
        : "border-sauce/40 bg-sauce/10";
  const icon = kind === "critical" ? "✕" : kind === "warn" ? "!" : "·";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm text-ink ${cls}`}>
      <span className="mr-2 font-semibold" aria-hidden="true">
        {icon}
      </span>
      <span className="font-semibold">{title}</span>
      {children ? <span className="text-ink2"> — {children}</span> : null}
    </div>
  );
}

export function EmptyState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-hair bg-wash px-4 py-6 text-center text-sm text-ink2">
      {children ?? (
        <span>
          No actuals yet. Add rows in the <span className="font-semibold text-ink">Log</span>{" "}
          tab.
        </span>
      )}
    </div>
  );
}

/* ---------------------------------- legend --------------------------------- */

export function Legend({
  items,
}: {
  items: { color: string; label: string; dashed?: boolean; shape?: "line" | "box" }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-ink2">
          {it.shape === "line" ? (
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-5 rounded-full"
              style={
                it.dashed
                  ? {
                      backgroundImage: `repeating-linear-gradient(to right, ${it.color} 0 4px, transparent 4px 7px)`,
                    }
                  : { backgroundColor: it.color }
              }
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-[2px]"
              style={{ backgroundColor: it.color }}
            />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- table ---------------------------------- */

export function Table({
  headers,
  rows,
  align = [],
  caption,
  dense = false,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  align?: ("left" | "right")[];
  caption?: string;
  dense?: boolean;
}) {
  const pad = dense ? "px-2 py-1.5" : "px-3 py-2";
  return (
    <div className="-mx-1 max-w-full overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse text-sm">
        {caption ? (
          <caption className="caption-top pb-2 text-left text-xs text-muted">
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr className="border-b border-hair">
            {headers.map((h, i) => (
              <th
                key={i}
                scope="col"
                className={`${pad} text-[11px] font-semibold uppercase tracking-[0.08em] text-muted ${
                  align[i] === "right" ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-hair/60 last:border-0">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={`${pad} text-ink ${
                    align[ci] === "right" ? "tnum text-right" : "text-left"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Signed difference against plan, colored by direction with the sign spelled out. */
export function Delta({
  value,
  format,
  goodWhen = "up",
}: {
  value: number | null;
  format: (v: number) => string;
  goodWhen?: "up" | "down";
}) {
  if (value === null) return <span className="text-muted">—</span>;
  const good = goodWhen === "up" ? value >= 0 : value <= 0;
  const cls = value === 0 ? "text-ink2" : good ? "text-successtext" : "text-critical";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`tnum ${cls}`}>
      {sign}
      {format(value)}
    </span>
  );
}
