import { Card, Delta, EmptyState, Legend, Pill, Section } from "@/components/ui";
import { StatusStrip } from "@/components/StatusStrip";
import {
  PlanActualChart,
  type PlanActualPoint,
} from "@/components/charts/PlanActualChart";
import { modelProv, observedProv } from "@/lib/provenance";
import { count, money, smart } from "@/lib/format";
import type { ActualRow, Dashboard } from "@/lib/types";

/** Lower is better for cost rows; everything else wants to be at or above plan. */
const lowerIsBetter = (label: string) => /cost|spend|days/i.test(label);

function ActualTile({ row }: { row: ActualRow }) {
  const actual = typeof row.actual === "number" ? row.actual : null;
  const plan = typeof row.plan === "number" ? row.plan : null;
  const diff = actual !== null && plan !== null ? actual - plan : null;
  const good = lowerIsBetter(row.label) ? "down" : "up";

  return (
    <div className="min-w-0 rounded-xl border border-hair bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-muted">
          {row.label}
        </span>
        {row.empty ? (
          <Pill kind="nodata" title="No Log rows feed this yet.">
            No data
          </Pill>
        ) : (
          <Pill kind={observedProv.kind} title={observedProv.title}>
            {observedProv.label}
          </Pill>
        )}
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
        {row.empty ? <span className="text-base text-muted">—</span> : smart(row.label, row.actual)}
      </p>
      <p className="mt-0.5 text-xs text-ink2">
        Plan {smart(row.label, row.plan)}
        {diff !== null ? (
          <>
            {" · "}
            <Delta value={diff} format={(v) => smart(row.label, v)} goodWhen={good} />
          </>
        ) : null}
      </p>
    </div>
  );
}

export function TrackingSection({ d }: { d: Dashboard }) {
  const prov = modelProv(d);
  const hasActuals = d.derived.hasActuals;

  const revenue: PlanActualPoint[] = d.planActual.map((r) => ({
    label: r.label,
    plan: r.planRevenue,
    actual: r.actualRevenue,
    variance: r.revenueVsPlan,
  }));

  const cash: PlanActualPoint[] = d.planActual.map((r) => ({
    label: r.label,
    plan: r.planCashBefore,
    actual: r.actualCashBefore,
    variance: r.cashVsPlan,
  }));

  const legend = (actualLabel: string) => (
    <Legend
      items={[
        { color: "var(--series-sauce)", label: "Plan", shape: "line", dashed: true },
        { color: "var(--series-rub)", label: actualLabel, shape: "line" },
      ]}
    />
  );

  return (
    <Section
      id="tracking"
      eyebrow="5 · Are we on track"
      title="Plan vs actual"
      lead="Actuals are fed by the Log tab. Where a line stops or a cell is grey, there is no data yet — not a zero."
    >
      <div className="mb-4">
        <Card
          title="Actuals to date"
          subtitle={
            hasActuals
              ? `${count(d.derived.monthsWithActuals)} ${
                  d.derived.monthsWithActuals === 1 ? "month" : "months"
                } with data${
                  d.log.latestDate ? ` · latest Log entry ${d.log.latestDate}` : ""
                }.`
              : "Nothing logged yet."
          }
          aside={
            <Pill kind={hasActuals ? observedProv.kind : "nodata"} title={observedProv.title}>
              {hasActuals ? "Real" : "No data"}
            </Pill>
          }
        >
          {d.actuals.length && hasActuals ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {d.actuals.map((row) => (
                <ActualTile key={row.label} row={row} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      {d.log.hasRows ? (
        <div className="mb-4">
          <Card
            title="Straight from the Log"
            subtitle={`${count(d.log.rowCount)} rows${
              d.log.firstDate ? ` since ${d.log.firstDate}` : ""
            }. Totalled on the server — the Log itself never leaves it.`}
            aside={
              <Pill kind={observedProv.kind} title={observedProv.title}>
                {observedProv.label}
              </Pill>
            }
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { k: "Bottles sold", v: count(d.log.salesBottles) },
                { k: "Sales revenue", v: money(d.log.salesRevenue) },
                { k: "Spent on production", v: money(d.log.productionSpend) },
                { k: "Other expenses", v: money(d.log.expenseSpend) },
                { k: "Investment received", v: money(d.log.investmentReceived) },
              ].map((row) => (
                <div key={row.k} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {row.k}
                  </dt>
                  <dd className="tnum mt-0.5 text-lg font-semibold text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
            {d.log.bottlesByProduct.length || d.log.bottlesByChannel.length ? (
              <p className="mt-3 border-t border-hair pt-3 text-xs text-ink2">
                {d.log.bottlesByProduct.length ? (
                  <>
                    By product:{" "}
                    {d.log.bottlesByProduct
                      .map((b) => `${b.key} ${count(b.bottles)}`)
                      .join(" · ")}
                    .{" "}
                  </>
                ) : null}
                {d.log.bottlesByChannel.length ? (
                  <>
                    By channel:{" "}
                    {d.log.bottlesByChannel
                      .map((b) => `${b.key} ${count(b.bottles)}`)
                      .join(" · ")}
                    .
                  </>
                ) : null}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Revenue — plan vs actual"
          subtitle="Dashed is the plan; solid is what the Log recorded."
          aside={
            <Pill kind={prov.kind} title={`Plan: ${prov.title} Actuals are measured.`}>
              Plan {prov.label} · actual Real
            </Pill>
          }
        >
          {hasActuals ? (
            <>
              <PlanActualChart data={revenue} planLabel="Plan revenue" actualLabel="Actual revenue" />
              <div className="mt-3">{legend("Actual revenue")}</div>
            </>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card
          title="Cash before new investment — plan vs actual"
          subtitle="Cash the business made on its own, before any money raised."
          aside={
            <Pill kind={prov.kind} title={`Plan: ${prov.title} Actuals are measured.`}>
              Plan {prov.label} · actual Real
            </Pill>
          }
        >
          {hasActuals ? (
            <>
              <PlanActualChart
                data={cash}
                planLabel="Plan cash before new investment"
                actualLabel="Actual cash before new investment"
              />
              <div className="mt-3">{legend("Actual cash")}</div>
            </>
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="Month by month status"
          subtitle="One cell per month of the plan. Grey means no actuals have been logged for that month."
        >
          {d.planActual.length ? (
            <StatusStrip rows={d.planActual} />
          ) : (
            <EmptyState>
              <span>No months found on the Plan vs Actual tab.</span>
            </EmptyState>
          )}
        </Card>
      </div>
    </Section>
  );
}
