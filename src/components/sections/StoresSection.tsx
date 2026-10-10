import { Card, EmptyState, Pill, Section, Table, Tile } from "@/components/ui";
import { StoresChart, type StorePoint } from "@/components/charts/StoresChart";
import { observedProv } from "@/lib/provenance";
import { count } from "@/lib/format";
import type { Dashboard, StoreStatus } from "@/lib/types";
import type { PillKind } from "@/components/ui";

const STORE_PILL: Record<StoreStatus, PillKind> = {
  Active: "good",
  Slowing: "warn",
  "At risk": "critical",
  Unknown: "nodata",
};

export function StoresSection({ d }: { d: Dashboard }) {
  const stores = [...d.stores].sort(
    (a, b) => (b.bottlesPerMonth ?? -1) - (a.bottlesPerMonth ?? -1),
  );
  const points: StorePoint[] = stores.map((s) => ({
    store: s.store,
    perMonth: s.bottlesPerMonth,
    last90: s.bottles90,
    days: s.daysSinceLastOrder,
    status: s.status,
  }));

  const actual = d.derived.bottlesPerStoreActual;
  const plan = d.derived.bottlesPerStorePlan;
  const diff = actual !== null && plan !== null ? actual - plan : null;

  const headers =
    d.headers.stores?.length === 7
      ? d.headers.stores
      : [
          "Store",
          "Bottles last 90 days",
          "Bottles per month",
          "Last order",
          "Days since last order",
          "Total bottles ever",
          "Status",
        ];

  return (
    <Section
      id="stores"
      eyebrow="6 · Stores"
      title="Who is actually re-ordering"
      lead="Store performance against the plan's per-store assumption. A store that stops ordering is the first sign the sales rate is slipping."
    >
      {stores.length ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Tile
              label="Bottles per store per month"
              value={count(actual, actual !== null && !Number.isInteger(actual) ? 1 : 0)}
              sub={
                plan === null ? (
                  "No plan assumption found in Milestones."
                ) : (
                  <>
                    Plan assumes {count(plan)}
                    {diff !== null ? (
                      <>
                        {" · "}
                        <span className={diff >= 0 ? "text-successtext" : "text-critical"}>
                          {diff >= 0 ? "+" : ""}
                          {count(diff, Number.isInteger(diff) ? 0 : 1)}
                        </span>
                      </>
                    ) : null}
                  </>
                )
              }
              pill={
                <Pill kind={observedProv.kind} title={observedProv.title}>
                  {observedProv.label}
                </Pill>
              }
              tone={diff === null ? "plain" : diff >= 0 ? "good" : "warn"}
            />
            <Tile
              label="Stores at risk"
              value={count(d.derived.storesAtRisk)}
              sub={`${count(d.derived.storesSlowing)} more are slowing · ${count(
                d.derived.storesTotal,
              )} stores in total.`}
              pill={
                <Pill kind={observedProv.kind} title={observedProv.title}>
                  {observedProv.label}
                </Pill>
              }
              tone={d.derived.storesAtRisk > 0 ? "critical" : "good"}
            />
            <Tile
              label="Stores ordering"
              value={`${count(d.derived.storesActive)} / ${count(d.derived.storesTotal)}`}
              sub="Marked Active in the Stores tab."
              pill={
                <Pill kind={observedProv.kind} title={observedProv.title}>
                  {observedProv.label}
                </Pill>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Bottles per store per month"
              subtitle="Dashed line is the plan assumption."
            >
              <StoresChart data={points} plan={plan} />
            </Card>
            <Card className="lg:col-span-2" title="Every store">
              <Table
                dense
                headers={headers}
                align={["left", "right", "right", "left", "right", "right", "left"]}
                rows={stores.map((s) => [
                  s.store,
                  count(s.bottles90),
                  count(s.bottlesPerMonth),
                  s.lastOrder ?? "—",
                  count(s.daysSinceLastOrder),
                  count(s.totalBottlesEver),
                  <Pill key="s" kind={STORE_PILL[s.status]} title={`Status: ${s.status}`}>
                    {s.status}
                  </Pill>,
                ])}
              />
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState>
            <span>
              No stores yet. Add rows in the <span className="font-semibold text-ink">Stores</span>{" "}
              tab.
            </span>
          </EmptyState>
        </Card>
      )}
    </Section>
  );
}
