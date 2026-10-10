"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, ChartTooltip, Frame, gridProps, xAxisProps, yAxisProps } from "./chrome";
import { count, countAxis } from "@/lib/format";

export type VolumePoint = {
  label: string;
  sauce: number | null;
  rub: number | null;
  total: number | null;
};

/** Monthly bottles, sauce then rub — the categorical order is fixed everywhere. */
export function VolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <Frame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis {...yAxisProps} width={46} tickFormatter={countAxis} />
          <Tooltip
            cursor={{ fill: C.wash }}
            content={
              <ChartTooltip
                lines={(row) => [
                  { label: "Sauce bottles", value: count(row.sauce), color: C.sauce },
                  { label: "Rub bottles", value: count(row.rub), color: C.rub },
                  { label: "Total", value: count(row.total) },
                ]}
              />
            }
          />
          {/* The 2px surface-colored edge is the gap between stacked segments. */}
          <Bar
            isAnimationActive={false}
            dataKey="sauce"
            name="Sauce"
            stackId="bottles"
            fill={C.sauce}
            stroke={C.surface}
            strokeWidth={2}
            maxBarSize={24}
          />
          <Bar
            isAnimationActive={false}
            dataKey="rub"
            name="Rub"
            stackId="bottles"
            fill={C.rub}
            stroke={C.surface}
            strokeWidth={2}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
