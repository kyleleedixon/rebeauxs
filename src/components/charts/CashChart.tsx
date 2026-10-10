"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  C,
  ChartTooltip,
  Frame,
  gridProps,
  xAxisProps,
  yAxisProps,
  type TipLine,
} from "./chrome";
import { money, moneyAxis } from "@/lib/format";

export type CashPoint = {
  label: string;
  monthNumber: number | null;
  cash: number | null;
  raised: number | null;
};

/** Cash at month end against the floor the owner wants to keep. One series. */
export function CashChart({
  data,
  floor,
  lowest,
}: {
  data: CashPoint[];
  floor: number | null;
  lowest: { label: string; value: number } | null;
}) {
  return (
    <Frame height="h-[260px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} />
          <YAxis {...yAxisProps} tickFormatter={moneyAxis} />
          <Tooltip
            cursor={{ stroke: C.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                lines={(row) => {
                  const out: TipLine[] = [
                    {
                      label: "Cash at month end",
                      value: money(row.cash),
                      color: C.sauce,
                    },
                  ];
                  if (typeof row.raised === "number") {
                    out.push({ label: "Raised to date", value: money(row.raised), color: C.muted });
                  }
                  if (floor !== null && typeof row.cash === "number") {
                    out.push({
                      label: "Against the floor",
                      value: money(row.cash - floor),
                      color: C.critical,
                    });
                  }
                  return out;
                }}
              />
            }
          />
          {floor !== null ? (
            <ReferenceLine
              y={floor}
              stroke={C.critical}
              strokeWidth={2}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
              label={{
                value: `Cash floor ${money(floor)}`,
                position: "insideTopRight",
                fill: "var(--c-ink)",
                fontSize: 11,
              }}
            />
          ) : null}
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="cash"
            name="Cash at month end"
            stroke={C.sauce}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, stroke: C.surface, strokeWidth: 2 }}
            connectNulls
          />
          {lowest ? (
            <ReferenceDot
              x={lowest.label}
              y={lowest.value}
              r={4}
              fill={C.sauce}
              stroke={C.surface}
              strokeWidth={2}
              label={{
                value: `Lowest ${money(lowest.value)}`,
                position: "top",
                fill: "var(--c-ink)",
                fontSize: 11,
              }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}
