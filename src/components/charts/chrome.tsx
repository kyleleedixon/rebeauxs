"use client";

import type { ReactNode } from "react";

/**
 * Shared chart chrome. Colors are CSS custom properties, so every mark follows
 * the viewer's theme without a toggle or a JS theme listener.
 */
export const C = {
  sauce: "var(--series-sauce)",
  rub: "var(--series-rub)",
  profit: "var(--series-profit)",
  needed: "var(--series-needed)",
  good: "var(--status-good)",
  warn: "var(--status-warning)",
  critical: "var(--status-critical)",
  nodata: "var(--status-none)",
  grid: "var(--c-grid)",
  axis: "var(--c-axis)",
  muted: "var(--c-muted)",
  ink: "var(--c-ink)",
  surface: "var(--c-surface)",
  wash: "var(--c-wash)",
} as const;

export const axisTick = { fill: C.muted, fontSize: 11 } as const;
export const axisLine = { stroke: C.axis } as const;

export const xAxisProps = {
  tick: axisTick,
  axisLine,
  tickLine: false,
  interval: "preserveStartEnd" as const,
  minTickGap: 18,
  dy: 4,
};

export const yAxisProps = {
  tick: axisTick,
  axisLine: false,
  tickLine: false,
  width: 54,
};

export const gridProps = {
  stroke: C.grid,
  strokeWidth: 1,
  vertical: false,
} as const;

/** Fixed chart height; wrapper is full-width so phone widths just get shorter. */
export function Frame({
  children,
  height = "h-[230px] sm:h-[270px]",
}: {
  children: ReactNode;
  height?: string;
}) {
  return <div className={`w-full ${height}`}>{children}</div>;
}

type Entry = {
  name?: unknown;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: Record<string, unknown>;
};

export type TipLine = { label: string; value: string; color?: string; dashed?: boolean };

export function TooltipBox({
  title,
  lines,
  footer,
}: {
  title: string;
  lines: TipLine[];
  footer?: string;
}) {
  return (
    <div className="pointer-events-none rounded-lg border border-hair bg-raise px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      <ul className="space-y-0.5">
        {lines.map((l) => (
          <li key={l.label} className="flex items-center gap-2 whitespace-nowrap">
            {l.color ? (
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-[2px]"
                style={{ backgroundColor: l.color }}
              />
            ) : (
              <span aria-hidden="true" className="inline-block size-2" />
            )}
            <span className="text-ink2">{l.label}</span>
            <span className="tnum ml-auto font-medium text-ink">{l.value}</span>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-1 border-t border-hair pt-1 text-[11px] text-muted">{footer}</p> : null}
    </div>
  );
}

/**
 * Hover tooltip used by every chart. `lines` turns the hovered row into labelled
 * values; `footer` adds context (e.g. gate status) under a hairline.
 */
export function ChartTooltip({
  active,
  label,
  payload,
  lines,
  footer,
  title,
}: {
  active?: boolean;
  label?: unknown;
  payload?: Entry[];
  lines: (row: Record<string, unknown>, payload: Entry[]) => TipLine[];
  footer?: (row: Record<string, unknown>) => string | undefined;
  title?: (row: Record<string, unknown>, label: unknown) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = (payload[0]?.payload ?? {}) as Record<string, unknown>;
  const head = title ? title(row, label) : String(label ?? "");
  return <TooltipBox title={head} lines={lines(row, payload)} footer={footer?.(row)} />;
}

export const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
