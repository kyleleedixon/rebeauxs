"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, ChartTooltip, Frame, gridProps } from "./chrome";
import { count } from "@/lib/format";

export type LackingPoint = {
  item: string;
  now: number | null;
  needed: number | null;
  gap: number | null;
  /** now as a share of needed, in percent — the one axis every row can share. */
  pct: number | null;
  display: { now: string; needed: string; gap: string };
  worst: boolean;
};

/**
 * The rows measure different things (bottles, stores, dollars), so a shared
 * dollar axis would be meaningless. Each row is plotted against its own target:
 * the axis is "share of what's needed", and the tooltip carries the real numbers.
 */
export function LackingChart({ data }: { data: LackingPoint[] }) {
  const height =
    data.length > 5 ? "h-[300px] sm:h-[320px]" : "h-[220px] sm:h-[250px]";
  // Rows can be past their target — the axis has to show that rather than clip it.
  const peak = data.reduce((acc, d) => (d.pct !== null && d.pct > acc ? d.pct : acc), 0);
  const max = Math.max(110, Math.ceil(peak / 25) * 25);
  const ticks = Array.from({ length: Math.floor(max / 25) + 1 }, (_, i) => i * 25);
  return (
    <Frame height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 52, bottom: 0, left: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis
            type="number"
            domain={[0, max]}
            ticks={ticks}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={{ stroke: C.axis }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="item"
            width={112}
            tick={{ fill: "var(--c-ink-2)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: C.wash }}
            content={
              <ChartTooltip
                title={(row) => String(row.item ?? "")}
                lines={(row) => {
                  const d = row.display as LackingPoint["display"] | undefined;
                  return [
                    { label: "Now", value: d?.now ?? "—", color: C.sauce },
                    { label: "Needed", value: d?.needed ?? "—", color: C.needed },
                    { label: "Gap", value: d?.gap ?? "—", color: C.critical },
                  ];
                }}
                footer={(row) =>
                  row.worst ? "Biggest gap of the six" : undefined
                }
              />
            }
          />
          <ReferenceLine
            x={100}
            stroke={C.axis}
            strokeDasharray="4 3"
            strokeWidth={2}
            label={{
              value: "Needed",
              position: "top",
              fill: "var(--c-ink-2)",
              fontSize: 11,
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="pct"
            name="Share of what's needed"
            fill={C.sauce}
            maxBarSize={18}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="pct"
              position="right"
              offset={8}
              formatter={(v: unknown) =>
                typeof v === "number" ? `${count(v)}%` : ""
              }
              style={{ fill: "var(--c-ink)", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
