import { Card, Pill, Section } from "@/components/ui";
import { monthRef } from "./KpiRow";
import { modelProv } from "@/lib/provenance";
import { count, money, money2 } from "@/lib/format";
import type { Dashboard, GateRow } from "@/lib/types";

function Meter({ now, needed }: { now: number | null; needed: number | null }) {
  const rawPct =
    now !== null && needed !== null && needed !== 0 ? Math.max(0, (now / needed) * 100) : null;
  const pct = rawPct === null ? null : Math.min(100, rawPct);
  // Fill carries severity; the track is a lighter step of the same hue.
  // Severity follows today's rate against what the gate needs, not the Sheet's
  // future-tense pass flag — that is what the badge is for.
  const fill =
    rawPct === null
      ? "bg-nodata"
      : rawPct >= 100
        ? "bg-sauce"
        : rawPct >= 60
          ? "bg-warn"
          : "bg-critical";
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-needed/60">
        <div
          className={`h-2 rounded-full ${fill}`}
          style={{ width: `${pct ?? 0}%` }}
          role="meter"
          aria-valuenow={Math.round(rawPct ?? 0)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sales rate against the rate this gate needs"
        />
      </div>
      <p className="mt-1.5 text-xs text-ink2">
        <span className="tnum font-medium text-ink">{count(now)}</span> now of{" "}
        <span className="tnum font-medium text-ink">{count(needed)}</span> needed per month
        {rawPct !== null ? <span className="tnum text-muted"> · {count(rawPct)}%</span> : null}
      </p>
    </div>
  );
}

function GateCard({
  gate,
  d,
  index,
}: {
  gate: GateRow;
  d: Dashboard;
  index: number;
}) {
  const prov = modelProv(d);
  const rateSource =
    d.derived.currentSauceRateSource === "actual"
      ? "Current rate is the average of the last three months of actual sales."
      : d.derived.currentSauceRateSource === "plan"
        ? "No actuals yet, so the current rate is the plan's own 3-month rate."
        : "No sales rate available yet.";

  return (
    <Card
      title={gate.gate || `Gate ${index + 1}`}
      aside={
        gate.passes ? (
          <Pill kind="good" title="The Sheet marks this gate as passing.">
            Passes
          </Pill>
        ) : (
          <Pill kind="warn" title="The Sheet does not mark this gate as passing yet.">
            Not yet
          </Pill>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Run size</dt>
          <dd className="tnum font-medium text-ink">{count(gate.runSize)} bottles</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Cost per bottle</dt>
          <dd className="tnum font-medium text-ink">{money2(gate.costPerBottle)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Cash to buy the run</dt>
          <dd className="tnum font-medium text-ink">{money(gate.cashToBuyRun)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">Month it passes</dt>
          <dd className="font-medium text-ink">{monthRef(gate.monthItPasses, d.forecast)}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-hair pt-3">
        <Meter now={d.derived.currentSauceRate} needed={gate.salesNeededPerMonth} />
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {rateSource}
          <Pill kind={prov.kind} title={prov.title}>
            {prov.label}
          </Pill>
        </p>
      </div>
    </Card>
  );
}

export function GatesSection({ d }: { d: Dashboard }) {
  return (
    <Section
      id="gates"
      eyebrow="2 · Stage gates"
      title="Milestones"
      lead="Each gate buys a bigger run at a lower cost per bottle. A gate passes when the sales rate and the cash to buy the run are both there."
    >
      {d.gates.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {d.gates.map((g, i) => (
            <GateCard key={g.gate || i} gate={g} d={d} index={i} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-ink2">No gate rows found in Milestones.</p>
        </Card>
      )}
    </Section>
  );
}
