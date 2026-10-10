import { Pill, Tile } from "@/components/ui";
import { modelProv, observedProv } from "@/lib/provenance";
import { count, money, money2, serialToISO, longMonth } from "@/lib/format";
import type { Dashboard, ForecastMonth, KeyNumber } from "@/lib/types";

/** A month reference may be a month number or a real date. Handle both. */
export function monthRef(
  value: number | string | null | undefined,
  forecast: ForecastMonth[],
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (value > 20000) return longMonth(serialToISO(value), String(value));
  if (value >= 1 && value <= forecast.length) {
    const m = forecast[Math.round(value) - 1];
    return `Month ${Math.round(value)}${m ? ` · ${m.label}` : ""}`;
  }
  return `Month ${count(value)}`;
}

const valueOf = (k: KeyNumber | null): number | null =>
  typeof k?.value === "number" ? k.value : null;

export function KpiRow({ d }: { d: Dashboard }) {
  const prov = modelProv(d);
  const modelPill = (
    <Pill kind={prov.kind} title={prov.title}>
      {prov.label}
    </Pill>
  );

  const capital = d.cells.totalCapitalNeeded;
  const firstMonth = d.cells.firstMonthMoneyNeeded;
  const inStock = valueOf(d.cells.sauceCostInStock);
  const target = valueOf(d.cells.sauceCostTarget);
  const overTarget = inStock !== null && target !== null ? inStock - target : null;

  const bank = d.derived.cashInBank;
  const bankPlan = d.derived.cashInBankPlan;
  const beforeActual = d.derived.cashBeforeInvestmentActual;
  const beforePlan = d.derived.cashBeforeInvestmentPlan;

  const outOfStock = d.derived.monthsOutOfSauce + d.derived.monthsOutOfRub;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <Tile
          hero
          label={capital?.measure ?? "Total capital needed"}
          value={money(capital?.value)}
          sub={
            capital?.meaning ||
            "Everything the plan needs across the 24 months, including stock."
          }
          pill={modelPill}
        />
      </div>

      <Tile
        label={firstMonth?.measure ?? "First month money is needed"}
        value={monthRef(firstMonth?.value ?? null, d.forecast)}
        sub={firstMonth?.meaning || "When the plan first needs money in the bank."}
        pill={modelPill}
        tone="warn"
      />

      <Tile
        label="Cash in the bank"
        value={bank === null ? "No actuals yet" : money(bank)}
        sub={
          bank === null ? (
            <>
              Add rows in the <span className="font-semibold text-ink">Log</span> tab.
            </>
          ) : (
            <>
              {d.derived.cashInBankLabel ? `As of ${d.derived.cashInBankLabel}. ` : ""}
              {beforeActual !== null && beforePlan !== null ? (
                <>
                  Before new investment {money(beforeActual)} vs plan {money(beforePlan)} (
                  <span
                    className={
                      beforeActual - beforePlan >= 0 ? "text-successtext" : "text-critical"
                    }
                  >
                    {beforeActual - beforePlan >= 0 ? "+" : ""}
                    {money(beforeActual - beforePlan)}
                  </span>
                  ).
                </>
              ) : bankPlan !== null ? (
                <>Plan for that month was {money(bankPlan)}.</>
              ) : null}
            </>
          )
        }
        pill={
          bank === null ? (
            <Pill kind="nodata" title="No Log rows yet.">
              No data
            </Pill>
          ) : (
            <Pill kind={observedProv.kind} title={observedProv.title}>
              {observedProv.label}
            </Pill>
          )
        }
        tone={
          bank === null
            ? "plain"
            : beforeActual !== null && beforePlan !== null && beforeActual < beforePlan
              ? "warn"
              : "good"
        }
      />

      <Tile
        label="Sauce cost per bottle in stock"
        value={money2(inStock)}
        sub={
          target === null ? (
            d.cells.sauceCostInStock?.meaning || "What the sauce on the shelf cost."
          ) : (
            <>
              Target {money2(target)}
              {overTarget !== null ? (
                <>
                  {" · "}
                  <span className={overTarget > 0 ? "text-critical" : "text-successtext"}>
                    {overTarget > 0
                      ? `${money2(overTarget)} over`
                      : `${money2(Math.abs(overTarget))} under`}
                  </span>
                </>
              ) : null}
            </>
          )
        }
        pill={modelPill}
        tone={overTarget !== null && overTarget > 0 ? "warn" : "good"}
      />

      <Tile
        label="Year 1 revenue"
        value={money(d.derived.year1Revenue)}
        sub="Months 1–12 of the forecast."
        pill={modelPill}
      />

      <Tile
        label="Year 1 operating profit"
        value={money(d.derived.year1Profit)}
        sub="After cost of goods and running costs."
        pill={modelPill}
        tone={
          d.derived.year1Profit === null
            ? "plain"
            : d.derived.year1Profit >= 0
              ? "good"
              : "critical"
        }
      />

      <Tile
        label="Months out of stock"
        value={`${count(d.derived.monthsOutOfSauce)} / ${count(d.derived.monthsOutOfRub)}`}
        sub="Sauce / rub. Both should be 0 — anything else means the plan sells stock it does not have."
        pill={modelPill}
        tone={outOfStock === 0 ? "good" : "critical"}
      />
    </div>
  );
}
