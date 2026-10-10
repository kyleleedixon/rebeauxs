import { Card, Legend, Notice, Pill, Section, Table } from "@/components/ui";
import { CashChart, type CashPoint } from "@/components/charts/CashChart";
import { StagedAskChart, type AskPoint } from "@/components/charts/StagedAskChart";
import { modelProv } from "@/lib/provenance";
import { count, money } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export function CapitalSection({ d }: { d: Dashboard }) {
  const prov = modelProv(d);
  const pill = (
    <Pill kind={prov.kind} title={prov.title}>
      {prov.label}
    </Pill>
  );

  const cash: CashPoint[] = d.forecast.map((m) => ({
    label: m.label,
    monthNumber: m.monthNumber,
    cash: m.cashAtMonthEnd,
    raised: m.raisedToDate,
  }));

  const lowestPoint =
    d.derived.lowestCash !== null && d.derived.lowestCashMonth
      ? { label: d.derived.lowestCashMonth, value: d.derived.lowestCash }
      : null;

  const ask: AskPoint[] = d.stagedAsk.map((s) => ({
    label: s.monthNumber === null ? "—" : `M${count(s.monthNumber)}`,
    total: s.totalRaisedByThen,
    added: s.addedInStep,
  }));

  const breaches = d.derived.floorBreachMonths;

  return (
    <Section
      id="capital"
      eyebrow="1 · How much and when"
      title="Capital"
      lead="Cash at month end across the 24-month plan, against the lowest balance the owner wants to keep, and the raise broken into steps."
    >
      {breaches > 0 && d.minCashFloor !== null ? (
        <div className="mb-3">
          <Notice
            kind="critical"
            title={`Cash drops under the ${money(d.minCashFloor)} floor in ${count(breaches)} ${
              breaches === 1 ? "month" : "months"
            }`}
          >
            the plan needs money in the bank before then
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Cash at month end"
          subtitle={
            d.minCashFloor === null
              ? "No cash floor found in Inputs."
              : `Dashed line is the ${money(d.minCashFloor)} floor from Inputs${
                  d.minCashFloorStatus !== "Unknown" ? ` (${d.minCashFloorStatus})` : ""
                }.`
          }
          aside={pill}
        >
          <CashChart data={cash} floor={d.minCashFloor} lowest={lowestPoint} />
          <div className="mt-3">
            <Legend
              items={[
                { color: "var(--series-sauce)", label: "Cash at month end", shape: "line" },
                {
                  color: "var(--status-critical)",
                  label: "Lowest balance to keep",
                  shape: "line",
                  dashed: true,
                },
              ]}
            />
          </div>
        </Card>

        <Card
          title="Staged capital ask"
          subtitle="Each step is only unlocked by the step before it."
          aside={pill}
        >
          {ask.length ? (
            <>
              <StagedAskChart data={ask} />
              <div className="mt-2">
                <Table
                  dense
                  headers={
                    d.headers.stagedAsk?.length
                      ? d.headers.stagedAsk
                      : ["Month", "Raised by then", "Added"]
                  }
                  align={["left", "right", "right"]}
                  rows={d.stagedAsk.map((s) => [
                    s.monthNumber === null ? "—" : `Month ${count(s.monthNumber)}`,
                    money(s.totalRaisedByThen),
                    money(s.addedInStep),
                  ])}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-ink2">No staged ask rows found in Milestones.</p>
          )}
        </Card>
      </div>
    </Section>
  );
}
