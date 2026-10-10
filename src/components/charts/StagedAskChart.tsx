"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, ChartTooltip, Frame, gridProps, xAxisProps, yAxisProps } from "./chrome";
import { money, moneyAxis } from "@/lib/format";

export type AskPoint = {
  label: string;
  total: number | null;
  added: number | null;
};

/** The ask as a staircase: what is raised by each step, not a smooth curve. */
export function StagedAskChart({ data }: { data: AskPoint[] }) {
  return (
    <Frame height="h-[200px] sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={moneyAxis} />
          <Tooltip
            cursor={{ stroke: C.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                lines={(row) => [
                  { label: "Raised by then", value: money(row.total), color: C.sauce },
                  { label: "Added in this step", value: money(row.added), color: C.muted },
                ]}
              />
            }
          />
          <Area
            isAnimationActive={false}
            type="stepAfter"
            dataKey="total"
            stroke="none"
            fill={C.sauce}
            fillOpacity={0.1}
          />
          <Line
            isAnimationActive={false}
            type="stepAfter"
            dataKey="total"
            name="Raised by then"
            stroke={C.sauce}
            strokeWidth={2}
            dot={{ r: 4, fill: C.sauce, stroke: C.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Frame>
  );
}
