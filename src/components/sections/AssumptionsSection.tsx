import { Card, Pill, Section, Table, Tile } from "@/components/ui";
import { statusProv } from "@/lib/provenance";
import { count, money, money2, percent, smart } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export function AssumptionsSection({ d }: { d: Dashboard }) {
  const guessShare = d.derived.guessShare;
  const total = d.derived.guessCount + d.derived.realCount;

  const inputRows = d.inputs.map((i) => {
    const prov = statusProv(i.status);
    return [
      i.label,
      smart(i.label, i.value),
      <Pill key="p" kind={prov.kind} title={prov.title}>
        {prov.label}
      </Pill>,
      <span key="n" className="text-ink2">
        {i.note || "—"}
      </span>,
    ];
  });

  const eventHeaders =
    d.headers.events?.length === 8
      ? d.headers.events
      : [
          "Event",
          "Items",
          "Registration fee",
          "Other cost",
          "First month",
          "Last month",
          "Times per month",
          "Repeats",
        ];

  const tierHeaders =
    d.headers.tiers?.filter(Boolean).length === 3
      ? d.headers.tiers
      : ["Bottles in run", "Cost per bottle", "Real or guess"];

  return (
    <Section
      id="assumptions"
      eyebrow="7 · What this rests on"
      title="Assumptions"
      lead="Every input the forecast uses, exactly as the Sheet has it. Amber means the number is still a guess — that is where the plan is most likely to be wrong."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tile
          label="Inputs that are still guesses"
          value={guessShare === null ? "—" : percent(guessShare, 0)}
          sub={`${count(d.derived.guessCount)} of ${count(total)} marked inputs. Every number built on them is a guess too.`}
          pill={
            <Pill
              kind={guessShare !== null && guessShare > 0 ? "guess" : "real"}
              title="Counted from the Real/Guess column on the Inputs tab."
            >
              {guessShare !== null && guessShare > 0 ? "Guesses present" : "All real"}
            </Pill>
          }
          tone={
            guessShare === null
              ? "plain"
              : guessShare > 0.5
                ? "critical"
                : guessShare > 0
                  ? "warn"
                  : "good"
          }
        />
        <Tile
          label="Marked Real"
          value={count(d.derived.realCount)}
          sub="Measured, quoted or signed."
          pill={<Pill kind="real">Real</Pill>}
        />
        <Tile
          label="Events in the plan"
          value={count(d.events.length)}
          sub="Read from the events table, which grows as markets are booked."
          pill={<Pill kind="info" title="Row count, read live from the Sheet.">Live count</Pill>}
        />
      </div>

      <div className="grid gap-4">
        <Card
          title="Inputs"
          subtitle={`${count(d.inputs.length)} rows, found by label — row moves in the Sheet do not break this.`}
        >
          {d.inputs.length ? (
            <Table
              headers={["Input", "Value", "Real or guess", "Note"]}
              align={["left", "right", "left", "left"]}
              rows={inputRows}
            />
          ) : (
            <p className="text-sm text-ink2">No input rows found on the Inputs tab.</p>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card
            className="lg:col-span-2"
            title="Run size and cost per bottle"
            subtitle="The tier table the gates are built on."
          >
            {d.tiers.length ? (
              <Table
                dense
                headers={tierHeaders}
                align={["right", "right", "left"]}
                rows={d.tiers.map((t) => {
                  const prov = statusProv(t.status);
                  return [
                    count(t.bottles),
                    money2(t.costPerBottle),
                    <Pill key="p" kind={prov.kind} title={prov.title}>
                      {prov.label}
                    </Pill>,
                  ];
                })}
              />
            ) : (
              <p className="text-sm text-ink2">No tier rows found.</p>
            )}
          </Card>

          <Card
            className="lg:col-span-3"
            title="Events"
            subtitle={`${count(d.events.length)} rows, read until the first blank name.`}
          >
            {d.events.length ? (
              <Table
                dense
                headers={eventHeaders}
                align={["left", "left", "right", "right", "right", "right", "right", "left"]}
                rows={d.events.map((e) => [
                  e.name,
                  typeof e.items === "number" ? count(e.items) : e.items || "—",
                  money(e.registrationFee),
                  money(e.otherCost),
                  count(e.firstMonth),
                  count(e.lastMonth),
                  count(e.timesPerMonth),
                  e.repeats || "—",
                ])}
              />
            ) : (
              <p className="text-sm text-ink2">No events found.</p>
            )}
          </Card>
        </div>

        {d.keyNumbers.length || d.unitEconomics.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {d.keyNumbers.length ? (
              <Card title="Key numbers" subtitle="Straight from the Milestones tab.">
                <Table
                  dense
                  headers={
                    d.headers.keyNumbers?.filter(Boolean).length === 3
                      ? d.headers.keyNumbers
                      : ["Measure", "Value", "What it means"]
                  }
                  align={["left", "right", "left"]}
                  rows={d.keyNumbers.map((k) => [
                    k.measure,
                    smart(k.measure, k.value),
                    <span key="m" className="text-ink2">
                      {k.meaning || "—"}
                    </span>,
                  ])}
                />
              </Card>
            ) : null}
            {d.unitEconomics.length ? (
              <Card title="Unit economics" subtitle="What one bottle does.">
                <Table
                  dense
                  headers={["Measure", "Value", "What it means"]}
                  align={["left", "right", "left"]}
                  rows={d.unitEconomics.map((k) => [
                    k.measure,
                    smart(k.measure, k.value),
                    <span key="m" className="text-ink2">
                      {k.meaning || "—"}
                    </span>,
                  ])}
                />
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
