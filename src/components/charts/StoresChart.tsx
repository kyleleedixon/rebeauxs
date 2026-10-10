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

export type StorePoint = {
  store: string;
  perMonth: number | null;
  last90: number | null;
  days: number | null;
  status: string;
};

/** Bottles per store per month against the plan assumption. */
export function StoresChart({
  data,
  plan,
}: {
  data: StorePoint[];
  plan: number | null;
}) {
  const height = data.length > 6 ? "h-[300px] sm:h-[330px]" : "h-[230px] sm:h-[260px]";
  return (
    <Frame height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 14, right: 40, bottom: 0, left: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={{ stroke: C.axis }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="store"
            width={112}
            tick={{ fill: "var(--c-ink-2)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: C.wash }}
            content={
              <ChartTooltip
                title={(row) => String(row.store ?? "")}
                lines={(row) => [
                  { label: "Bottles per month", value: count(row.perMonth), color: C.sauce },
                  { label: "Last 90 days", value: count(row.last90) },
                  {
                    label: "Days since last order",
                    value: count(row.days),
                  },
                ]}
                footer={(row) => `Status: ${String(row.status ?? "Unknown")}`}
              />
            }
          />
          {plan !== null ? (
            <ReferenceLine
              x={plan}
              stroke={C.axis}
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{
                value: `Plan ${count(plan)}`,
                position: "top",
                fill: "var(--c-ink-2)",
                fontSize: 11,
              }}
            />
          ) : null}
          <Bar
            isAnimationActive={false}
            dataKey="perMonth"
            name="Bottles per month"
            fill={C.sauce}
            maxBarSize={18}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="perMonth"
              position="right"
              offset={8}
              formatter={(v: unknown) => (typeof v === "number" ? count(v) : "")}
              style={{ fill: "var(--c-ink)", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
