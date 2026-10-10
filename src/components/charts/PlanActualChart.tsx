"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, ChartTooltip, Frame, gridProps, xAxisProps, yAxisProps } from "./chrome";
import { money, moneyAxis } from "@/lib/format";

export type PlanActualPoint = {
  label: string;
  plan: number | null;
  actual: number | null;
  variance: number | null;
};

/**
 * Plan (dashed, slot 1) against actual (solid, slot 2). The actual line stops
 * where the Log stops — nulls are not bridged, so a gap means "no data yet".
 */
export function PlanActualChart({
  data,
  planLabel,
  actualLabel,
}: {
  data: PlanActualPoint[];
  planLabel: string;
  actualLabel: string;
}) {
  return (
    <Frame>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={moneyAxis} />
          <Tooltip
            cursor={{ stroke: C.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                lines={(row) => [
                  { label: planLabel, value: money(row.plan), color: C.sauce, dashed: true },
                  {
                    label: actualLabel,
                    value: typeof row.actual === "number" ? money(row.actual) : "no data yet",
                    color: C.rub,
                  },
                  {
                    label: "Difference",
                    value: typeof row.variance === "number" ? money(row.variance) : "—",
                  },
                ]}
              />
            }
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="plan"
            name={planLabel}
            stroke={C.sauce}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, stroke: C.surface, strokeWidth: 2 }}
            connectNulls
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="actual"
            name={actualLabel}
            stroke={C.rub}
            strokeWidth={2}
            dot={{ r: 3, fill: C.rub, stroke: C.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}
