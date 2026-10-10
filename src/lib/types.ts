/** Shapes the Sheet is read into. Nothing here is persisted in the repo. */

export type Status = "Real" | "Guess" | "Unknown";

/** Inputs assumption table — located by label text, never by row number. */
export interface InputRow {
  label: string;
  value: number | string | null;
  status: Status;
  note: string;
}

/** Inputs tier price table. */
export interface TierRow {
  bottles: number | null;
  costPerBottle: number | null;
  status: Status;
}

/** Inputs events table (grows; read until the first blank name). */
export interface EventRow {
  name: string;
  items: number | string | null;
  registrationFee: number | null;
  otherCost: number | null;
  firstMonth: number | null;
  lastMonth: number | null;
  timesPerMonth: number | null;
  repeats: string;
}

/** Forecast, one per month, plus the totals row. */
export interface ForecastMonth {
  monthNumber: number | null;
  date: string | null;
  label: string;
  sauceStoresOriginal: number | null;
  sauceStoresOriginal2: number | null;
  sauceSpicy: number | null;
  sauceWebsite: number | null;
  eventItems: number | null;
  sauceEvents: number | null;
  sauceTotal: number | null;
  rubChannel1: number | null;
  rubChannel2: number | null;
  rubChannel3: number | null;
  rubTotal: number | null;
  revenue: number | null;
  sauceOrdered: number | null;
  costPerBottleOrdered: number | null;
  cashForSauceOrder: number | null;
  sauceLeft: number | null;
  avgSauceCostInStock: number | null;
  costOfSauceSold: number | null;
  rubOrdered: number | null;
  cashForRubOrder: number | null;
  rubLeft: number | null;
  costOfRubSold: number | null;
  grossMarginPct: number | null;
  websiteHosting: number | null;
  eventRegistrationFees: number | null;
  otherEventCosts: number | null;
  otherCosts: number | null;
  operatingProfit: number | null;
  cashAtMonthEnd: number | null;
  raisedToDate: number | null;
  sauceRate3Month: number | null;
  profit3Month: number | null;
  gate1Passed: number | null;
  gate2Passed: number | null;
  gate3Passed: number | null;
}

/** Milestones gate table — one row per stage gate. */
export interface GateRow {
  gate: string;
  runSize: number | null;
  costPerBottle: number | null;
  cashToBuyRun: number | null;
  salesNeededPerMonth: number | null;
  monthItPasses: number | string | null;
  status: string;
  passes: boolean;
}

/** Milestones key numbers / unit economics — measure, value, meaning. */
export interface KeyNumber {
  measure: string;
  value: number | string | null;
  meaning: string;
}

/** Milestones "Where we're lacking" — item, now, needed, gap. */
export interface LackingRow {
  item: string;
  now: number | null;
  needed: number | null;
  gap: number | null;
  /** gap / needed, used to rank the worst shortfall */
  shortfallShare: number | null;
}

/** Milestones staged capital ask. */
export interface StagedAskRow {
  monthNumber: number | null;
  totalRaisedByThen: number | null;
  addedInStep: number | null;
}

/** Milestones "Actuals to date" — label, actual, plan. */
export interface ActualRow {
  label: string;
  actual: number | string | null;
  plan: number | string | null;
  /** True when the actual side is blank, i.e. the Log has nothing for it yet. */
  empty: boolean;
}

export type TrackStatus = "On track" | "Watch" | "Behind" | "No data";

/** Plan vs Actual, columns A-Q. Blank actuals mean "no data yet". */
export interface PlanActualRow {
  monthNumber: number | null;
  date: string | null;
  label: string;
  planSauce: number | null;
  actualSauce: number | null;
  sauceVsPlan: number | null;
  planRub: number | null;
  actualRub: number | null;
  rubVsPlan: number | null;
  planRevenue: number | null;
  actualRevenue: number | null;
  revenueVsPlan: number | null;
  /** L / M: cash BEFORE new investment. */
  planCashBefore: number | null;
  actualCashBefore: number | null;
  cashVsPlan: number | null;
  status: TrackStatus;
  /** P: investment received to date. */
  investmentToDate: number | null;
  /** Q: cash in the bank. */
  cashInBank: number | null;
  /** True when every formula-fed column is blank. */
  noData: boolean;
}

export type StoreStatus = "Active" | "Slowing" | "At risk" | "Unknown";

/** Stores tab — one row per store. */
export interface StoreRow {
  store: string;
  bottles90: number | null;
  bottlesPerMonth: number | null;
  lastOrder: string | null;
  daysSinceLastOrder: number | null;
  totalBottlesEver: number | null;
  status: StoreStatus;
}

/**
 * The Log holds store names and dollar amounts, so it is aggregated on the server
 * and only these roll-ups ever reach a component. Raw rows are never serialized.
 */
export interface LogAggregates {
  hasRows: boolean;
  rowCount: number;
  firstDate: string | null;
  latestDate: string | null;
  monthsWithData: number;
  salesRevenue: number;
  salesBottles: number;
  productionSpend: number;
  expenseSpend: number;
  investmentReceived: number;
  bottlesByProduct: { key: string; bottles: number }[];
  bottlesByChannel: { key: string; bottles: number }[];
  expenseByCategory: { key: string; amount: number }[];
  byMonth: {
    month: string;
    label: string;
    revenue: number;
    bottles: number;
    spend: number;
    investment: number;
  }[];
}

export interface TabHealth {
  tab: string;
  ok: boolean;
  rows: number;
  problem: string | null;
}

export interface Dashboard {
  inputs: InputRow[];
  tiers: TierRow[];
  events: EventRow[];
  minCashFloor: number | null;
  minCashFloorStatus: Status;
  forecast: ForecastMonth[];
  forecastTotals: ForecastMonth | null;
  gates: GateRow[];
  keyNumbers: KeyNumber[];
  unitEconomics: KeyNumber[];
  lacking: LackingRow[];
  stagedAsk: StagedAskRow[];
  actuals: ActualRow[];
  planActual: PlanActualRow[];
  stores: StoreRow[];
  log: LogAggregates;
  /** The headline numbers the KPI row calls out, found by label with a positional fallback. */
  cells: {
    totalCapitalNeeded: KeyNumber | null;
    firstMonthMoneyNeeded: KeyNumber | null;
    sauceCostInStock: KeyNumber | null;
    sauceCostTarget: KeyNumber | null;
  };
  /** Column headings read from the Sheet itself, so the UI echoes its wording. */
  headers: Record<string, string[]>;
  derived: {
    year1Revenue: number | null;
    year1Profit: number | null;
    monthsOutOfSauce: number;
    monthsOutOfRub: number;
    guessCount: number;
    realCount: number;
    guessShare: number | null;
    currentSauceRate: number | null;
    currentSauceRateSource: "actual" | "plan" | "none";
    lowestCash: number | null;
    lowestCashMonth: string | null;
    floorBreachMonths: number;
    /** Latest non-blank Plan vs Actual column Q, with its month and plan comparison. */
    cashInBank: number | null;
    cashInBankLabel: string | null;
    cashInBankPlan: number | null;
    cashBeforeInvestmentActual: number | null;
    cashBeforeInvestmentPlan: number | null;
    investmentToDate: number | null;
    hasActuals: boolean;
    monthsWithActuals: number;
    storesTotal: number;
    storesActive: number;
    storesAtRisk: number;
    storesSlowing: number;
    bottlesPerStoreActual: number | null;
    bottlesPerStorePlan: number | null;
  };
  meta: {
    fetchedAt: string;
    stale: boolean;
    staleReason: string | null;
    demo: boolean;
    sheetUrl: string;
    tabHealth: TabHealth[];
  };
}
