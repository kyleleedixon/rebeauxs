import { Card, Pill, Section, Table } from "@/components/ui";
import { LackingChart, type LackingPoint } from "@/components/charts/LackingChart";
import { modelProv } from "@/lib/provenance";
import { count, smart } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export function LackingSection({ d }: { d: Dashboard }) {
  const prov = modelProv(d);
  const worstShare = d.lacking.reduce(
    (acc, r) => (r.shortfallShare !== null && r.shortfallShare > acc ? r.shortfallShare : acc),
    -1,
  );

  const points: LackingPoint[] = [...d.lacking]
    .sort((a, b) => (b.shortfallShare ?? -1) - (a.shortfallShare ?? -1))
    .map((r) => ({
      item: r.item,
      now: r.now,
      needed: r.needed,
      gap: r.gap,
      pct:
        r.now !== null && r.needed !== null && r.needed !== 0
          ? Math.max(0, Math.round((r.now / r.needed) * 100))
          : null,
      display: {
        now: smart(r.item, r.now),
        needed: smart(r.item, r.needed),
        gap: smart(r.item, r.gap),
      },
      worst: r.shortfallShare !== null && r.shortfallShare === worstShare,
    }));

  const headers =
    d.headers.lacking?.length === 4
      ? d.headers.lacking
      : ["Item", "Now", "Needed", "Gap"];

  return (
    <Section
      id="gaps"
      eyebrow="3 · Where we're lacking"
      title="Gaps"
      lead="Each row is measured against its own target, so the bars share one honest axis: how much of what's needed is already there. The real numbers are in the table and on hover."
    >
      {points.length ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card
            className="lg:col-span-3"
            title="How much of what's needed is there"
            subtitle="100% is the target. Sorted worst gap first."
            aside={
              <Pill kind={prov.kind} title={prov.title}>
                {prov.label}
              </Pill>
            }
          >
            <LackingChart data={points} />
          </Card>
          <Card className="lg:col-span-2" title="The numbers behind the bars">
            <Table
              dense
              headers={[...headers, ""]}
              align={["left", "right", "right", "right", "left"]}
              rows={points.map((p) => [
                p.item,
                p.display.now,
                p.display.needed,
                <span key="gap" className="text-critical">
                  {p.display.gap}
                </span>,
                p.worst ? (
                  <Pill key="worst" kind="critical" title="The furthest from what the plan needs.">
                    Biggest gap
                  </Pill>
                ) : (
                  ""
                ),
              ])}
            />
            <p className="mt-3 text-xs text-muted">
              {count(points.length)} rows read from the Milestones tab.
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-ink2">
            No &ldquo;Where we&rsquo;re lacking&rdquo; rows found in Milestones.
          </p>
        </Card>
      )}
    </Section>
  );
}
