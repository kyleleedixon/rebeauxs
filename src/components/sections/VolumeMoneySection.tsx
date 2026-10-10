import { Card, Legend, Pill, Section } from "@/components/ui";
import { VolumeChart, type VolumePoint } from "@/components/charts/VolumeChart";
import { MoneyChart, type MoneyPoint } from "@/components/charts/MoneyChart";
import { modelProv } from "@/lib/provenance";
import { count, money, percent } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export function VolumeMoneySection({ d }: { d: Dashboard }) {
  const prov = modelProv(d);
  const pill = (
    <Pill kind={prov.kind} title={prov.title}>
      {prov.label}
    </Pill>
  );

  const volume: VolumePoint[] = d.forecast.map((m) => ({
    label: m.label,
    sauce: m.sauceTotal,
    rub: m.rubTotal,
    total: (m.sauceTotal ?? 0) + (m.rubTotal ?? 0),
  }));

  const moneyData: MoneyPoint[] = d.forecast.map((m) => ({
    label: m.label,
    revenue: m.revenue,
    profit: m.operatingProfit,
    margin: m.grossMarginPct,
  }));

  const totalSauce = d.forecast.reduce((a, m) => a + (m.sauceTotal ?? 0), 0);
  const totalRub = d.forecast.reduce((a, m) => a + (m.rubTotal ?? 0), 0);
  const totalRevenue = d.forecast.reduce((a, m) => a + (m.revenue ?? 0), 0);
  const totalProfit = d.forecast.reduce((a, m) => a + (m.operatingProfit ?? 0), 0);
  const margins = d.forecast
    .map((m) => m.grossMarginPct)
    .filter((x): x is number => x !== null);
  const avgMargin = margins.length
    ? margins.reduce((a, b) => a + b, 0) / margins.length
    : null;

  return (
    <Section
      id="volume"
      eyebrow="4 · Volume and money"
      title="What the plan sells and earns"
      lead="Bottles per month, then the money those bottles make. Sauce is always the first colour, rub the second."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Bottles per month"
          subtitle={`${count(totalSauce)} sauce and ${count(totalRub)} rub bottles over the plan.`}
          aside={pill}
        >
          <VolumeChart data={volume} />
          <div className="mt-3">
            <Legend
              items={[
                { color: "var(--series-sauce)", label: "Sauce" },
                { color: "var(--series-rub)", label: "Rub" },
              ]}
            />
          </div>
        </Card>

        <Card
          title="Revenue and operating profit"
          subtitle={`${money(totalRevenue)} revenue and ${money(totalProfit)} operating profit over the plan${
            avgMargin !== null ? ` · ${percent(avgMargin, 0)} average gross margin` : ""
          }.`}
          aside={pill}
        >
          <MoneyChart data={moneyData} />
          <div className="mt-3">
            <Legend
              items={[
                { color: "var(--series-sauce)", label: "Revenue" },
                { color: "var(--series-profit)", label: "Operating profit" },
              ]}
            />
          </div>
        </Card>
      </div>
    </Section>
  );
}
