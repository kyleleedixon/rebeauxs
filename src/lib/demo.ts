import type { Grid, Grids } from "@/lib/sheets";

/**
 * Synthetic grids for local layout work only. Reached exclusively via DEMO_MODE
 * and rendered behind a loud banner. These numbers are invented — they are not
 * the Sheet's data, and the Sheet is never copied into the repo.
 *
 * They run through the real parser, which is how the block-discovery logic
 * (header/label lookup, growable tables) gets exercised without credentials.
 */

export type DemoMode = "off" | "full" | "empty";

export function demoMode(): DemoMode {
  const v = (process.env.DEMO_MODE ?? "").toLowerCase();
  if (v === "" || v === "0" || v === "false") return "off";
  if (v === "empty" || v === "2") return "empty";
  return "full";
}

const serial = (y: number, m: number, d: number) =>
  Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);

const MONTHS = 24;
const START = { y: 2026, m: 11 };

function monthOf(i: number) {
  const total = START.m - 1 + i;
  return { y: START.y + Math.floor(total / 12), m: (total % 12) + 1 };
}

/** Deterministic jitter so the demo view is stable across reloads. */
const wobble = (i: number, amp: number) =>
  1 + amp * Math.sin(i * 1.7) * Math.cos(i * 0.6);

const blank = (n: number): Grid => Array.from({ length: n }, () => []);

function inputsGrid(): Grid {
  const rows: Grid = [
    ["Rebeaux's BBQ Sauce — Inputs", null, null, null],
    ["Edit values in column B only.", null, null, null],
    [],
    ["Input", "Value", "Real or guess", "Note"],
  ];
  const assumptions: [string, number, "Real" | "Guess", string][] = [
    ["Bottle price in stores", 7.5, "Real", "Signed with two stores at this price"],
    ["Bottle price on the website", 11, "Real", "Shopify listing price"],
    ["Bottle price at events", 10, "Real", "Cash price at the last three markets"],
    ["Rub price in stores", 8, "Guess", "No rub sold in a store yet"],
    ["Rub price on the website", 12, "Guess", "Based on competitor listings"],
    ["Stores selling the sauce now", 6, "Real", "Signed purchase orders"],
    ["New stores added per month", 1.5, "Guess", "Owner's target, not yet observed"],
    ["Bottles per store per month", 18, "Guess", "Early stores average 14-22"],
    ["Website bottles per month", 40, "Guess", "Pre-launch estimate"],
    ["Events per month", 2, "Real", "Market calendar is booked"],
    ["Bottles sold per event", 55, "Real", "Average of last six events"],
    ["Spicy launch month", 7, "Guess", "Depends on the second co-packer run"],
    ["Spicy share of sauce sales", 0.25, "Guess", "Assumed from category data"],
    ["Co-packer minimum run", 1500, "Real", "Quoted by the co-packer"],
    ["Cost per bottle at minimum run", 3.35, "Real", "Current quote"],
    ["Cost per bottle at 5,000 run", 2.42, "Real", "Quoted tier"],
    ["Rub cost per bottle", 2.1, "Guess", "One verbal quote only"],
    ["Months of stock to keep on hand", 2, "Guess", "Owner's comfort level"],
    ["Website hosting per month", 39, "Real", "Shopify plan"],
    ["Other costs per month", 450, "Guess", "Insurance, labels, fuel"],
    ["Lowest cash balance you want to keep", 5000, "Real", "Owner's rule"],
    ["Bank balance today", 18400, "Real", "Checking account, this morning"],
    ["Money already invested", 25000, "Real", "Owner's own cash"],
    ["Sales needed per month for gate 2", 900, "Guess", "Derived from the run size"],
    ["Label cost per bottle", 0.22, "Real", "Printer invoice"],
    ["Freight per case", 4.1, "Guess", "One carrier quote"],
  ];
  assumptions.forEach((a) => rows.push([a[0], a[1], a[2], a[3]]));
  rows.push([]);
  rows.push(["Bottles in run", "Cost per bottle", "Real or guess"]);
  const tiers: [number, number, string][] = [
    [1500, 3.35, "Real"],
    [2500, 2.95, "Real"],
    [5000, 2.42, "Real"],
    [10000, 2.08, "Guess"],
    [20000, 1.86, "Guess"],
  ];
  tiers.forEach((t) => rows.push([t[0], t[1], t[2]]));
  rows.push([]);
  rows.push([
    "Event name",
    "Items",
    "Registration fee",
    "Other cost",
    "First month",
    "Last month",
    "Times per month",
    "Repeats?",
  ]);
  const events = [
    "Rebeaux Saturday Market",
    "Downtown Night Market",
    "County Fair",
    "Spring BBQ Festival",
    "Church Fall Festival",
    "Holiday Craft Fair",
    "Lake Town Farmers Market",
    "Smokehouse Pop-up",
    "University Tailgate",
    "Rib Cook-off",
    "Hot Sauce Expo",
    "Winter Market",
  ];
  events.forEach((name, i) => {
    rows.push([
      name,
      i % 3 === 0 ? "Sauce + Rub" : "Sauce",
      [35, 50, 120, 85][i % 4],
      [20, 40, 65, 30][i % 4],
      1 + (i % 6),
      i % 4 === 0 ? 24 : 6 + (i % 9),
      i % 5 === 0 ? 2 : 1,
      i % 4 === 0 ? "Y" : "N",
    ]);
  });
  return rows;
}

function forecastGrid(): Grid {
  const header = [
    "#", "Month", "Original (stores)", "Original (new stores)", "Spicy", "Website",
    "Event items", "Sauce at events", "Total sauce bottles", "Rub (stores)",
    "Rub (website)", "Rub (events)", "Total rub bottles", "Revenue", "Sauce ordered",
    "Cost per bottle ordered", "Cash for sauce order", "Sauce left",
    "Avg sauce cost in stock", "Cost of sauce sold", "Rub ordered", "Cash for rub order",
    "Rub left", "Cost of rub sold", "Gross margin %", "Website hosting",
    "Event registration fees", "Other event costs", "Other costs", "Operating profit",
    "Cash at month end", "Money to raise to date", "3-month sauce rate",
    "3-month profit", "Gate 1 passed", "Gate 2 passed", "Gate 3 passed",
  ];
  const rows: Grid = [
    ["Rebeaux's BBQ Sauce — 24-month forecast"],
    [],
    [],
    header,
  ];

  let cash = 18400;
  let raised = 25000;
  let sauceStock = 1500;
  let rubStock = 400;
  const sauceSeries: number[] = [];
  const profitSeries: number[] = [];
  const stage = [0, 20000, 45000, 70000];

  for (let i = 0; i < MONTHS; i++) {
    const { y, m } = monthOf(i);
    const stores = 6 + 1.5 * i;
    const storeBottles = Math.round(stores * 18 * wobble(i, 0.08));
    const newStore = Math.round(storeBottles * 0.12);
    const spicy = i >= 6 ? Math.round(storeBottles * 0.25) : 0;
    const website = Math.round(40 * (1 + i * 0.06) * wobble(i, 0.1));
    const eventItems = i % 5 === 0 ? 2 : 1;
    const eventSauce = Math.round(110 * eventItems * wobble(i, 0.12));
    const sauceTotal = storeBottles + newStore + spicy + website + eventSauce;
    const rubStores = Math.round(stores * 5 * wobble(i, 0.1));
    const rubWeb = Math.round(14 * (1 + i * 0.05));
    const rubEvents = Math.round(28 * eventItems);
    const rubTotal = rubStores + rubWeb + rubEvents;

    const revenue = sauceTotal * 8.1 + rubTotal * 8.9;

    const needSauceOrder = sauceStock < sauceTotal * 2;
    const runSize = i < 6 ? 1500 : i < 14 ? 2500 : 5000;
    const costPerBottle = runSize >= 5000 ? 2.42 : runSize >= 2500 ? 2.95 : 3.35;
    const sauceOrdered = needSauceOrder ? runSize : 0;
    const cashForSauce = sauceOrdered * costPerBottle;
    const avgCost = costPerBottle + 0.26;
    sauceStock = sauceStock + sauceOrdered - sauceTotal;
    const costOfSauceSold = sauceTotal * avgCost;

    const rubOrdered = rubStock < rubTotal * 2 ? 600 : 0;
    const cashForRub = rubOrdered * 2.1;
    rubStock = rubStock + rubOrdered - rubTotal;
    const costOfRubSold = rubTotal * 2.1;

    const hosting = 39;
    const regFees = eventItems * 55;
    const otherEvent = eventItems * 38;
    const other = 450 + i * 6;
    const gross = revenue - costOfSauceSold - costOfRubSold;
    const profit = gross - hosting - regFees - otherEvent - other;

    const stepIndex = i >= 13 ? 3 : i >= 7 ? 2 : i >= 2 ? 1 : 0;
    raised = 25000 + stage[stepIndex];
    cash = cash + profit - cashForSauce - cashForRub + (i === 2 ? 20000 : i === 7 ? 25000 : i === 13 ? 25000 : 0);

    sauceSeries.push(sauceTotal);
    profitSeries.push(profit);
    const rate3 =
      sauceSeries.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, sauceSeries.length);
    const profit3 =
      profitSeries.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, profitSeries.length);

    rows.push([
      i + 1,
      serial(y, m, 1),
      storeBottles,
      newStore,
      spicy,
      website,
      eventItems,
      eventSauce,
      sauceTotal,
      rubStores,
      rubWeb,
      rubEvents,
      rubTotal,
      Math.round(revenue),
      sauceOrdered,
      costPerBottle,
      Math.round(cashForSauce),
      Math.round(sauceStock),
      Number(avgCost.toFixed(2)),
      Math.round(costOfSauceSold),
      rubOrdered,
      Math.round(cashForRub),
      Math.round(rubStock),
      Math.round(costOfRubSold),
      Number((gross / revenue).toFixed(3)),
      hosting,
      regFees,
      otherEvent,
      other,
      Math.round(profit),
      Math.round(cash),
      raised,
      Math.round(rate3),
      Math.round(profit3),
      rate3 >= 450 ? 1 : 0,
      rate3 >= 900 ? 1 : 0,
      rate3 >= 1800 ? 1 : 0,
    ]);
  }
  rows.push(["Total"]);
  return rows;
}

/** Write cells into an existing row without disturbing the other columns. */
function put(g: Grid, r: number, col: number, values: (string | number | null)[]) {
  const line = g[r] ?? [];
  while (line.length < col) line.push(null);
  values.forEach((v, i) => {
    line[col + i] = v;
  });
  g[r] = line;
}

function milestonesGrid(): Grid {
  const g: Grid = blank(80);
  put(g, 0, 0, ["Rebeaux's BBQ Sauce — Milestones"]);

  // Gate table (columns A-G) and "Where we're lacking" (columns I-L) share rows.
  put(g, 3, 0, [
    "Gate", "Run size", "Cost per bottle", "Cash to buy run",
    "Sales needed per month", "Month it passes", "Status",
  ]);
  put(g, 4, 0, ["Gate 1 — first 1,500 run", 1500, 3.35, 5025, 450, 1, "Passes"]);
  put(g, 5, 0, ["Gate 2 — 2,500 run", 2500, 2.95, 7375, 900, 8, "Passes"]);
  put(g, 6, 0, ["Gate 3 — 5,000 run", 5000, 2.42, 12100, 1800, 17, "Not yet"]);

  put(g, 3, 8, ["Item", "Now", "Needed", "Gap"]);
  const lacking: [string, number, number, number][] = [
    ["Bottles sold per month", 620, 900, 280],
    ["Stores ordering", 6, 14, 8],
    ["Cash in the bank", 18400, 45000, 26600],
    ["Bottles per store per month", 14, 18, 4],
    ["Months of stock on hand", 1.2, 2, 0.8],
    ["Website bottles per month", 22, 40, 18],
  ];
  lacking.forEach((l, i) => put(g, 4 + i, 8, [l[0], l[1], l[2], l[3]]));

  // Key numbers (columns A-C).
  put(g, 9, 0, ["Measure", "Value", "What it means"]);
  const key: [string, number, string][] = [
    ["Total capital needed", 70000, "Everything the plan needs across 24 months"],
    ["First month money is needed", 3, "The month cash would drop under the floor"],
    ["Lowest cash balance in the plan", 4120, "Happens before the second raise lands"],
    ["Money already invested", 25000, "Owner's own cash"],
    ["Still to raise", 45000, "Total needed minus money already in"],
    ["Break-even month", 11, "First month operating profit stays positive"],
    ["Year 1 revenue", 196000, "Months 1-12 of the forecast"],
    ["Year 1 operating profit", 21400, "After cost of goods and running costs"],
    ["Year 2 revenue", 318000, "Months 13-24"],
    ["Sauce bottles sold in 24 months", 41800, "Original and spicy together"],
    ["Rub bottles sold in 24 months", 9900, "All channels"],
    ["Average gross margin", 0.58, "Across the 24 months"],
    ["Sauce cost per bottle in stock", 3.61, "What the sauce on the shelf actually cost"],
    ["Target sauce cost per bottle", 2.42, "The 5,000-bottle tier price"],
    ["Months out of sauce", 0, "Any month the plan runs the shelf negative"],
    ["Months out of rub", 0, "Any month the plan runs the shelf negative"],
  ];
  key.forEach((k, i) => put(g, 10 + i, 0, [k[0], k[1], k[2]]));

  // Staged capital ask (columns I-K).
  put(g, 12, 8, ["Month", "Total raised by then", "Added in this step"]);
  const staged: number[][] = [
    [1, 25000, 25000],
    [3, 45000, 20000],
    [8, 70000, 25000],
    [14, 95000, 25000],
  ];
  staged.forEach((r, i) => put(g, 13 + i, 8, [r[0], r[1], r[2]]));

  // Unit economics (columns A-C), a blank row below the key numbers.
  put(g, 27, 0, ["Unit economics", "Value", "What it means"]);
  const unit: [string, number, string][] = [
    ["Price per bottle in stores", 7.5, "What a store pays"],
    ["Cost per bottle at the current run", 3.35, "Co-packer quote"],
    ["Gross profit per bottle in stores", 4.15, "Price minus cost"],
    ["Gross profit per bottle at events", 6.65, "Best channel per bottle"],
    ["Bottles to cover one month of costs", 118, "At the store margin"],
  ];
  unit.forEach((u, i) => put(g, 28 + i, 0, [u[0], u[1], u[2]]));

  return g;
}

function actualsBlock(g: Grid, withActuals: boolean): Grid {
  put(g, 19, 8, ["Actuals to date", "Actual", "Plan"]);
  const rows: [string, number | null, number][] = [
    ["Months with data", withActuals ? 3 : null, 3],
    ["Sauce + spicy bottles sold", withActuals ? 1840 : null, 2100],
    ["Rub bottles sold", withActuals ? 410 : null, 560],
    ["Revenue", withActuals ? 18650 : null, 21400],
    ["Cash in the bank", withActuals ? 21300 : null, 24800],
    ["Cash before new investment", withActuals ? 1300 : null, 4800],
    ["Actual sauce cost per bottle", withActuals ? 3.61 : null, 3.35],
    ["Sauce + spicy bottles on hand", withActuals ? 760 : null, 1100],
    ["Rub bottles on hand", withActuals ? 180 : null, 320],
    ["Stores ordering in last 90 days", withActuals ? 6 : null, 9],
    ["Bottles per store per month", withActuals ? 14 : null, 18],
  ];
  rows.forEach((r, i) => put(g, 20 + i, 8, [r[0], r[1], r[2]]));
  return g;
}

function planActualGrid(withActuals: boolean): Grid {
  const rows: Grid = [
    ["Rebeaux's BBQ Sauce — Plan vs Actual"],
    ["Actuals are fed by the Log tab."],
    [],
    [
      "#", "Month", "Plan sauce", "Actual sauce", "Sauce vs plan", "Plan rub",
      "Actual rub", "Rub vs plan", "Plan revenue", "Actual revenue",
      "Revenue vs plan", "Plan cash before new investment",
      "Actual cash before new investment", "Cash vs plan", "Status",
      "Investment received to date", "Cash in the bank",
    ],
  ];
  const actualMonths = withActuals ? 3 : 0;
  let planCash = 18400;
  for (let i = 0; i < MONTHS; i++) {
    const { y, m } = monthOf(i);
    const planSauce = Math.round((640 + i * 46) * wobble(i, 0.06));
    const planRub = Math.round((170 + i * 11) * wobble(i, 0.07));
    const planRevenue = Math.round(planSauce * 8.1 + planRub * 8.9);
    planCash += Math.round(planRevenue * 0.14) - (i === 0 ? 5025 : i % 4 === 0 ? 7375 : 0);
    const row: Grid[number] = [
      i + 1,
      serial(y, m, 1),
      planSauce,
      null,
      null,
      planRub,
      null,
      null,
      planRevenue,
      null,
      null,
      planCash,
      null,
      null,
      "",
      null,
      null,
    ];
    if (i < actualMonths) {
      const factor = [0.94, 0.86, 0.72][i] ?? 0.9;
      const actualSauce = Math.round(planSauce * factor);
      const actualRub = Math.round(planRub * (factor - 0.05));
      const actualRevenue = Math.round(actualSauce * 8.1 + actualRub * 8.9);
      const actualCash = Math.round(planCash * (0.9 - i * 0.08));
      row[3] = actualSauce;
      row[4] = actualSauce - planSauce;
      row[6] = actualRub;
      row[7] = actualRub - planRub;
      row[9] = actualRevenue;
      row[10] = actualRevenue - planRevenue;
      row[12] = actualCash;
      row[13] = actualCash - planCash;
      row[14] = factor > 0.9 ? "On track" : factor > 0.8 ? "Watch" : "Behind";
      row[15] = 25000 + (i >= 2 ? 20000 : 0);
      row[16] = actualCash + 25000 + (i >= 2 ? 20000 : 0) - 24000;
    }
    rows.push(row);
  }
  return rows;
}

function logGrid(withActuals: boolean): Grid {
  const rows: Grid = [
    ["Rebeaux's BBQ Sauce — Log"],
    ["Every sale, order, expense and investment goes here."],
    [],
    [
      "Date", "Type", "Product", "Channel", "Name", "Bottles", "Amount",
      "Expense category", "Note",
    ],
  ];
  if (!withActuals) return rows;
  const stores = ["Pecan Street Market", "Hill Country Grocer", "Riverbend Foods"];
  for (let i = 0; i < 48; i++) {
    const month = 11 + Math.floor(i / 16);
    const y = month > 12 ? 2027 : 2026;
    const m = month > 12 ? month - 12 : month;
    const d = 2 + (i % 14) * 2;
    const kind = i % 8;
    if (kind <= 4) {
      const product = i % 3 === 0 ? "Rub" : i % 5 === 0 ? "Spicy" : "Sauce";
      const channel = i % 4 === 0 ? "Event" : i % 3 === 0 ? "Website" : "Store";
      const bottles = 24 + ((i * 7) % 90);
      rows.push([
        serial(y, m, d), "Sale", product, channel,
        channel === "Store" ? stores[i % stores.length] : channel === "Event" ? "Saturday Market" : "Shopify",
        bottles, Math.round(bottles * (channel === "Website" ? 11 : channel === "Event" ? 10 : 7.5)),
        "", "",
      ]);
    } else if (kind === 5) {
      rows.push([serial(y, m, d), "Production order", "Sauce", "", "Co-packer", 1500, 5025, "", "Minimum run"]);
    } else if (kind === 6) {
      const cats = ["Labels", "Freight", "Insurance", "Event fees", "Hosting"];
      rows.push([serial(y, m, d), "Expense", "", "", cats[i % cats.length], "", 120 + (i % 5) * 65, cats[i % cats.length], ""]);
    } else {
      rows.push([serial(y, m, d), "Investment", "", "", "Owner", "", 20000, "", "Second step"]);
    }
  }
  return rows;
}

function storesGrid(withActuals: boolean): Grid {
  const rows: Grid = [
    ["Rebeaux's BBQ Sauce — Stores"],
    [],
    [],
    [
      "Store", "Bottles last 90 days", "Bottles per month", "Last order",
      "Days since last order", "Total bottles ever", "Status",
    ],
  ];
  if (!withActuals) return rows;
  const data: [string, number, number, number, number, number, string][] = [
    ["Pecan Street Market", 96, 32, 12, 312, "Active"] as never,
    ["Hill Country Grocer", 72, 24, 19, 244, "Active"] as never,
    ["Riverbend Foods", 54, 18, 28, 186, "Active"] as never,
    ["Smokey's Corner Store", 36, 12, 47, 150, "Slowing"] as never,
    ["Lakeside Provisions", 24, 8, 66, 96, "Slowing"] as never,
    ["Old Mill General", 9, 3, 104, 61, "At risk"] as never,
    ["Bluff Creek Market", 6, 2, 128, 38, "At risk"] as never,
  ].map(
    (r) =>
      [r[0], r[1], r[2], 0, r[3], r[4], r[5]] as unknown as [
        string, number, number, number, number, number, string,
      ],
  );
  data.forEach((d, i) => {
    const days = Number(d[4]);
    const ms = Date.UTC(2027, 0, 15) - days * 86_400_000;
    const dt = new Date(ms);
    rows.push([
      d[0], d[1], d[2],
      serial(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()),
      days, d[5], d[6],
    ]);
    if (i === 3) rows.push([]); // a blank slot in the middle of the block
  });
  return rows;
}

export function demoGrids(mode: DemoMode): Grids {
  const withActuals = mode === "full";
  return {
    inputs: inputsGrid(),
    forecast: forecastGrid(),
    milestones: actualsBlock(milestonesGrid(), withActuals),
    planActual: planActualGrid(withActuals),
    log: logGrid(withActuals),
    stores: storesGrid(withActuals),
  };
}
