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
import { C, ChartTooltip, Frame, gridProps, xAxisProps, yAxisProps } from "./chrome";
import { money, moneyAxis, percent } from "@/lib/format";

export type MoneyPoint = {
  label: string;
  revenue: number | null;
  profit: number | null;
  margin: number | null;
};

type LabelProps = { x?: number | string; y?: number | string; value?: unknown; index?: number };

/**
 * Both series are dollars, so they share one axis — paired columns per month,
 * with operating profit dipping below the zero line in any month it is negative.
 */
export function MoneyChart({ data }: { data: MoneyPoint[] }) {
  const last = data.length - 1;
  return (
    <Frame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 46, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={moneyAxis} />
          <Tooltip
            cursor={{ fill: C.wash }}
            content={
              <ChartTooltip
                lines={(row) => [
                  { label: "Revenue", value: money(row.revenue), color: C.sauce },
                  { label: "Operating profit", value: money(row.profit), color: C.profit },
                  { label: "Gross margin", value: percent(row.margin, 1) },
                ]}
              />
            }
          />
          <ReferenceLine y={0} stroke={C.axis} strokeWidth={1} />
          <Bar
            isAnimationActive={false}
            dataKey="revenue"
            name="Revenue"
            fill={C.sauce}
            maxBarSize={14}
            radius={[4, 4, 0, 0]}
          />
          {/* Aqua sits under 3:1 on the light surface, so the last column is
              directly labelled — the value is never carried by colour alone. */}
          <Bar
            isAnimationActive={false}
            dataKey="profit"
            name="Operating profit"
            fill={C.profit}
            maxBarSize={14}
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="profit"
              content={(props) => {
                const p = props as LabelProps;
                if (p.index !== last || typeof p.value !== "number") return null;
                const x = Number(p.x ?? 0);
                const y = Number(p.y ?? 0);
                return (
                  <text
                    x={x + 7}
                    y={p.value >= 0 ? y - 6 : y + 14}
                    fill="var(--c-ink)"
                    fontSize={11}
                    textAnchor="start"
                  >
                    {money(p.value)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
