import type { Cell, Grid, Grids } from "@/lib/sheets";
import { sheetUrl } from "@/lib/sheets";
import { monthLabel, serialToISO } from "@/lib/format";
import type {
  ActualRow,
  Dashboard,
  EventRow,
  ForecastMonth,
  GateRow,
  InputRow,
  KeyNumber,
  LackingRow,
  LogAggregates,
  PlanActualRow,
  StagedAskRow,
  Status,
  StoreRow,
  StoreStatus,
  TabHealth,
  TierRow,
  TrackStatus,
} from "@/lib/types";

/* ------------------------------- cell helpers ------------------------------ */

const at = (g: Grid, r: number, c: number): Cell => g[r]?.[c] ?? null;
const row = (g: Grid, r: number): Cell[] => g[r] ?? [];

function str(v: Cell): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function num(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,%\s]/g, "").replace(/^\((.*)\)$/, "-$1");
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function numOrStr(v: Cell): number | string | null {
  const n = num(v);
  if (n !== null) return n;
  if (isSheetError(v)) return null;
  const s = str(v);
  return s === "" ? null : s;
}

function status(v: Cell): Status {
  const s = str(v).toLowerCase();
  if (s.startsWith("real")) return "Real";
  if (s.startsWith("guess")) return "Guess";
  return "Unknown";
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normRow = (g: Grid, r: number): string[] => row(g, r).map((c) => normalize(str(c)));
const headerRow = (g: Grid, r: number): string[] => (r < 0 ? [] : row(g, r).map(str));

/** First row in [from, to) whose normalized cells satisfy the predicate. */
function findRowIndex(
  g: Grid,
  predicate: (cells: string[], r: number) => boolean,
  from = 0,
  to = g.length,
): number {
  for (let r = from; r < Math.min(to, g.length); r++) {
    if (predicate(normRow(g, r), r)) return r;
  }
  return -1;
}

const has = (cells: string[], needle: string, cols?: number[]): boolean =>
  (cols ? cols.map((c) => cells[c] ?? "") : cells).some((c) => c.includes(needle));

const isBlank = (v: Cell) => str(v) === "";

/**
 * How many cells in a row carry anything. Header rows are wide; the prose
 * sentences the Sheet puts above each table occupy a single cell. Requiring a
 * width is what stops "...only after the next gate covers the bigger run..."
 * from being mistaken for the gate table's header.
 */
const filled = (cells: string[]) => cells.filter((c) => c !== "").length;

/** #REF!, #N/A, #VALUE! ... — a broken formula is no data, not a label. */
const SHEET_ERROR = /^#(ref|value|div\/0|name|null|num|n\/a|error)[!?]?/i;
const isSheetError = (v: Cell): boolean =>
  typeof v === "string" && SHEET_ERROR.test(v.trim());

/* --------------------------------- Inputs ---------------------------------- */
/* Every Inputs block is located by its header/label text — row numbers move. */

function inputsLayout(g: Grid) {
  // The events table header is the clearest landmark on the tab.
  const eventsHeader = findRowIndex(
    g,
    (cells) =>
      filled(cells) >= 4 &&
      (has(cells, "registration") ||
        (has(cells, "items") && (has(cells, "repeat") || has(cells, "times per month")))),
  );

  // The tier table is the run of rows whose column A is a bottle count (a number)
  // rather than a label. Take the last such run above the events header.
  const limit = eventsHeader > 0 ? eventsHeader : g.length;
  let tierStart = -1;
  let tierEnd = -1;
  let runStart = -1;
  for (let r = 0; r < limit; r++) {
    const a = at(g, r, 0);
    const b = at(g, r, 1);
    const isTierish = num(a) !== null && num(a)! >= 1 && num(b) !== null;
    if (isTierish) {
      if (runStart === -1) runStart = r;
      if (r - runStart >= 0) {
        tierStart = runStart;
        tierEnd = r;
      }
    } else {
      runStart = -1;
    }
  }
  return { eventsHeader, tierStart, tierEnd };
}

function looksLikeTableHeader(g: Grid, r: number): boolean {
  const cells = normRow(g, r);
  const b = cells[1] ?? "";
  const c = cells[2] ?? "";
  const headerish = ["value", "amount", "number", "figure", "input"];
  return (
    headerish.includes(b) ||
    c === "status" ||
    c.includes("real or guess") ||
    c.includes("real guess") ||
    (b.includes("value") && c.includes("guess"))
  );
}

function parseInputs(g: Grid, tierStart: number, eventsHeader: number): InputRow[] {
  const stop = tierStart > 0 ? tierStart : eventsHeader > 0 ? eventsHeader : g.length;
  const out: InputRow[] = [];
  for (let r = 0; r < stop; r++) {
    const label = str(at(g, r, 0));
    if (!label) continue;
    if (num(at(g, r, 0)) !== null) continue; // a numeric "label" is table data
    const value = numOrStr(at(g, r, 1));
    const st = status(at(g, r, 2));
    // A real assumption row has either a number in column B or a Real/Guess status.
    // That drops section headings, spacers, and the tier/events table headers.
    if (typeof value !== "number" && st === "Unknown") continue;
    if (looksLikeTableHeader(g, r)) continue;
    out.push({ label, value, status: st, note: str(at(g, r, 3)) });
  }
  return out;
}

function parseTiers(g: Grid, tierStart: number, tierEnd: number): TierRow[] {
  if (tierStart < 0) return [];
  const out: TierRow[] = [];
  for (let r = tierStart; r <= tierEnd; r++) {
    const bottles = num(at(g, r, 0));
    const cost = num(at(g, r, 1));
    if (bottles === null && cost === null) continue;
    out.push({ bottles, costPerBottle: cost, status: status(at(g, r, 2)) });
  }
  return out;
}

/** Events: data starts under the header and runs until the first blank name. */
function parseEvents(g: Grid, eventsHeader: number): EventRow[] {
  if (eventsHeader < 0) return [];
  const out: EventRow[] = [];
  for (let r = eventsHeader + 1; r < g.length; r++) {
    const name = str(at(g, r, 0));
    if (!name) break;
    // A sentence under the table ("All event figures are guesses...") fills only
    // column A. A real event carries numbers beside its name.
    const hasDetail = [1, 2, 3, 4, 5, 6, 7].some((c) => !isBlank(at(g, r, c)));
    if (!hasDetail) break;
    out.push({
      name,
      items: numOrStr(at(g, r, 1)),
      registrationFee: num(at(g, r, 2)),
      otherCost: num(at(g, r, 3)),
      firstMonth: num(at(g, r, 4)),
      lastMonth: num(at(g, r, 5)),
      timesPerMonth: num(at(g, r, 6)),
      repeats: str(at(g, r, 7)),
    });
  }
  return out;
}

/** Find an Inputs row by label text. Patterns are tried most-specific first. */
function findInput(inputs: InputRow[], patterns: string[]): InputRow | null {
  for (const pattern of patterns) {
    const p = normalize(pattern);
    const hit = inputs.find((i) => normalize(i.label).includes(p));
    if (hit) return hit;
  }
  return null;
}

/* -------------------------------- Forecast --------------------------------- */

function forecastRow(g: Grid, r: number, fallbackLabel: string): ForecastMonth {
  const c = (col: number) => num(at(g, r, col));
  const iso = serialToISO(at(g, r, 1));
  const monthNumber = c(0);
  return {
    monthNumber,
    date: iso,
    label: monthLabel(iso, monthNumber !== null ? `M${monthNumber}` : fallbackLabel),
    sauceStoresOriginal: c(2),
    sauceStoresOriginal2: c(3),
    sauceSpicy: c(4),
    sauceWebsite: c(5),
    eventItems: c(6),
    sauceEvents: c(7),
    sauceTotal: c(8),
    rubChannel1: c(9),
    rubChannel2: c(10),
    rubChannel3: c(11),
    rubTotal: c(12),
    revenue: c(13),
    sauceOrdered: c(14),
    costPerBottleOrdered: c(15),
    cashForSauceOrder: c(16),
    sauceLeft: c(17),
    avgSauceCostInStock: c(18),
    costOfSauceSold: c(19),
    rubOrdered: c(20),
    cashForRubOrder: c(21),
    rubLeft: c(22),
    costOfRubSold: c(23),
    grossMarginPct: c(24),
    websiteHosting: c(25),
    eventRegistrationFees: c(26),
    otherEventCosts: c(27),
    otherCosts: c(28),
    operatingProfit: c(29),
    cashAtMonthEnd: c(30),
    raisedToDate: c(31),
    sauceRate3Month: c(32),
    profit3Month: c(33),
    gate1Passed: c(34),
    gate2Passed: c(35),
    gate3Passed: c(36),
  };
}

/** Header row located by text; months run until the totals row or a blank month. */
function parseForecast(g: Grid): {
  months: ForecastMonth[];
  totals: ForecastMonth | null;
  headerIndex: number;
} {
  const headerIndex = Math.max(
    findRowIndex(
      g,
      (cells) => filled(cells) >= 8 && has(cells, "month") && has(cells, "revenue"),
    ),
    -1,
  );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;
  const months: ForecastMonth[] = [];
  let totals: ForecastMonth | null = null;

  for (let r = start; r < g.length; r++) {
    const line = row(g, r);
    if (line.length === 0) continue;
    const firstCell = str(at(g, r, 0));
    const looksTotal = normalize(firstCell).includes("total");
    const m = forecastRow(g, r, `M${r - start + 1}`);
    const hasAny =
      m.revenue !== null ||
      m.cashAtMonthEnd !== null ||
      m.sauceTotal !== null ||
      m.operatingProfit !== null;
    if (looksTotal || (m.monthNumber === null && m.date === null && hasAny && months.length >= 12)) {
      if (hasAny) {
        totals = m;
        totals.label = "24-month total";
      }
      break;
    }
    if (!hasAny && m.monthNumber === null && m.date === null) continue;
    if (m.monthNumber === null) m.monthNumber = months.length + 1;
    months.push(m);
    if (months.length >= 36) break;
  }
  return { months, totals, headerIndex };
}

/* -------------------------------- Milestones ------------------------------- */

/** Gate table: header found by text, rows read until the first blank gate name. */
function parseGates(g: Grid): { gates: GateRow[]; headerIndex: number } {
  const strict = findRowIndex(
    g,
    (cells) => (cells[0] ?? "") === "gate" && filled(cells) >= 4,
    0,
    20,
  );
  const headerIndex =
    strict >= 0
      ? strict
      : findRowIndex(
          g,
          (cells) =>
            (cells[0] ?? "").startsWith("gate") &&
            filled(cells) >= 4 &&
            (has(cells, "run") || has(cells, "cost per bottle")),
          0,
          20,
        );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;
  const gates: GateRow[] = [];
  for (let r = start; r < Math.min(start + 8, g.length); r++) {
    const gate = str(at(g, r, 0));
    if (!gate) break;
    const s = str(at(g, r, 6));
    gates.push({
      gate,
      runSize: num(at(g, r, 1)),
      costPerBottle: num(at(g, r, 2)),
      cashToBuyRun: num(at(g, r, 3)),
      salesNeededPerMonth: num(at(g, r, 4)),
      monthItPasses: numOrStr(at(g, r, 5)),
      status: s || "Not yet",
      passes: normalize(s).startsWith("pass"),
    });
  }
  return { gates, headerIndex: headerIndex >= 0 ? headerIndex : 3 };
}

/** Runs of contiguous rows with a non-empty column A, below `from`. */
function columnABlocks(g: Grid, from: number): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = [];
  let start = -1;
  for (let r = from; r < g.length; r++) {
    const filled = !isBlank(at(g, r, 0));
    if (filled && start === -1) start = r;
    if (!filled && start !== -1) {
      blocks.push({ start, end: r - 1 });
      start = -1;
    }
  }
  if (start !== -1) blocks.push({ start, end: g.length - 1 });
  return blocks;
}

interface LabelledBlock {
  title: string;
  header: string[];
  rows: KeyNumber[];
}

/**
 * A label/value/meaning block. In the real Sheet each one is preceded by a
 * title in column A alone ("Key numbers", "Profit per bottle sold to a store")
 * and then a header row ("Measure | Value | What it means"). Both are kept so
 * the UI can echo the Sheet's wording, and neither is mistaken for data.
 */
function parseLabelledBlock(g: Grid, start: number, end: number): LabelledBlock {
  let title = "";
  let header: string[] = [];
  let first = start;

  // A title row fills column A and nothing beside it.
  if (!isBlank(at(g, first, 0)) && isBlank(at(g, first, 1)) && isBlank(at(g, first, 2))) {
    title = str(at(g, first, 0));
    first += 1;
  }

  // A header row is text in B and C with a number directly underneath it.
  const bIsText = num(at(g, first, 1)) === null && !isBlank(at(g, first, 1));
  const cIsText = !isBlank(at(g, first, 2));
  if (bIsText && cIsText && num(at(g, first + 1, 1)) !== null) {
    header = headerRow(g, first).slice(0, 3);
    first += 1;
  }

  const rows: KeyNumber[] = [];
  for (let r = first; r <= end; r++) {
    const measure = str(at(g, r, 0));
    if (!measure) continue;
    const value = numOrStr(at(g, r, 1));
    const meaning = str(at(g, r, 2));
    if (value === null && meaning === "") continue;
    rows.push({ measure, value, meaning });
  }
  return { title, header, rows };
}

/** A labelled block in the right-hand columns, read until the first blank label. */
function rightBlock(
  g: Grid,
  headerIndex: number,
  labelCol: number,
  width: number,
  maxRows = 24,
): { header: string[]; rows: Cell[][] } {
  if (headerIndex < 0) return { header: [], rows: [] };
  const header = headerRow(g, headerIndex).slice(labelCol, labelCol + width);
  const rows: Cell[][] = [];
  for (let r = headerIndex + 1; r < Math.min(headerIndex + 1 + maxRows, g.length); r++) {
    if (isBlank(at(g, r, labelCol))) break;
    rows.push(Array.from({ length: width }, (_, i) => at(g, r, labelCol + i)));
  }
  return { header, rows };
}

function parseLacking(g: Grid): { rows: LackingRow[]; header: string[] } {
  const headerIndex = findRowIndex(g, (cells) => {
    const right = cells.slice(8, 12);
    return (
      filled(right) >= 3 &&
      right.some((c) => c.includes("needed")) &&
      right.some((c) => c.includes("gap") || c.includes("now"))
    );
  });
  const { header, rows } = rightBlock(g, headerIndex, 8, 4, 16);
  const out: LackingRow[] = rows.map((r) => {
    const item = str(r[0]);
    const now = num(r[1]);
    const needed = num(r[2]);
    const gap = num(r[3]) ?? (needed !== null && now !== null ? needed - now : null);
    const shortfallShare =
      gap !== null && needed !== null && needed !== 0
        ? Math.max(0, gap) / Math.abs(needed)
        : null;
    return { item, now, needed, gap, shortfallShare };
  });
  return { rows: out.filter((r) => r.item), header };
}

function parseStagedAsk(g: Grid): { rows: StagedAskRow[]; header: string[] } {
  const headerIndex = findRowIndex(g, (cells) => {
    const right = cells.slice(8, 11);
    return (
      filled(right) >= 3 &&
      (right.some((c) => c.includes("raised")) || right.some((c) => c.includes("added")))
    );
  });
  const { header, rows } = rightBlock(g, headerIndex, 8, 3, 16);
  const out = rows
    .map((r) => ({
      monthNumber: num(r[0]),
      totalRaisedByThen: num(r[1]),
      addedInStep: num(r[2]),
    }))
    .filter(
      (r) => r.monthNumber !== null || r.totalRaisedByThen !== null || r.addedInStep !== null,
    );
  return { rows: out, header };
}

/** "Actuals to date": label, actual, plan. A blank actual means no Log data yet. */
function parseActuals(g: Grid): { rows: ActualRow[]; header: string[] } {
  const headerIndex = findRowIndex(g, (cells) => {
    const right = cells.slice(8, 11);
    return (
      filled(right) >= 3 &&
      right.some((c) => c.includes("actual")) &&
      right.some((c) => c.includes("plan"))
    );
  });
  const { header, rows } = rightBlock(g, headerIndex, 8, 3, 20);
  const out: ActualRow[] = rows
    .map((r) => {
      const actual = numOrStr(r[1]);
      return {
        label: str(r[0]),
        actual,
        plan: numOrStr(r[2]),
        empty: actual === null || actual === "",
      };
    })
    .filter((r) => r.label);
  return { rows: out, header };
}

/* ------------------------------ Plan vs Actual ----------------------------- */

function trackStatus(v: Cell): TrackStatus {
  const s = normalize(str(v));
  if (s.startsWith("on track")) return "On track";
  if (s.startsWith("watch")) return "Watch";
  if (s.startsWith("behind")) return "Behind";
  return "No data";
}

function parsePlanActual(g: Grid): { rows: PlanActualRow[]; headerIndex: number } {
  const headerIndex = findRowIndex(
    g,
    (cells) =>
      filled(cells) >= 8 && has(cells, "plan") && has(cells, "actual") && has(cells, "month"),
    0,
    12,
  );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;
  const rows: PlanActualRow[] = [];
  for (let r = start; r < g.length; r++) {
    const line = row(g, r);
    if (line.length === 0) continue;
    if (normalize(str(at(g, r, 0))).includes("total")) break;
    const c = (col: number) => num(at(g, r, col));
    const iso = serialToISO(at(g, r, 1));
    const monthNumber = c(0) ?? rows.length + 1;
    const actualSauce = c(3);
    const actualRub = c(6);
    const actualRevenue = c(9);
    const actualCashBefore = c(12);
    const investmentToDate = c(15);
    const cashInBank = c(16);
    if (
      iso === null &&
      c(0) === null &&
      c(2) === null &&
      c(8) === null &&
      actualRevenue === null
    ) {
      continue;
    }
    rows.push({
      monthNumber,
      date: iso,
      label: monthLabel(iso, `M${monthNumber}`),
      planSauce: c(2),
      actualSauce,
      sauceVsPlan: c(4),
      planRub: c(5),
      actualRub,
      rubVsPlan: c(7),
      planRevenue: c(8),
      actualRevenue,
      revenueVsPlan: c(10),
      planCashBefore: c(11),
      actualCashBefore,
      cashVsPlan: c(13),
      status: trackStatus(at(g, r, 14)),
      investmentToDate,
      cashInBank,
      noData:
        actualSauce === null &&
        actualRub === null &&
        actualRevenue === null &&
        actualCashBefore === null &&
        cashInBank === null,
    });
    if (rows.length >= 36) break;
  }
  return { rows, headerIndex: headerIndex >= 0 ? headerIndex : 3 };
}

/* ---------------------------------- Stores --------------------------------- */

function storeStatus(v: Cell): StoreStatus {
  const s = normalize(str(v));
  if (s.startsWith("active")) return "Active";
  if (s.startsWith("slow")) return "Slowing";
  if (s.startsWith("at risk") || s.startsWith("risk")) return "At risk";
  return "Unknown";
}

function parseStores(g: Grid): { rows: StoreRow[]; header: string[] } {
  const headerIndex = findRowIndex(
    g,
    (cells) => (cells[0] ?? "") === "store" && filled(cells) >= 4,
    0,
    12,
  );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;
  const rows: StoreRow[] = [];
  for (let r = start; r < g.length; r++) {
    const store = str(at(g, r, 0));
    if (!store) continue; // blank rows inside the block are just empty slots
    rows.push({
      store,
      bottles90: num(at(g, r, 1)),
      bottlesPerMonth: num(at(g, r, 2)),
      lastOrder: serialToISO(at(g, r, 3)),
      daysSinceLastOrder: num(at(g, r, 4)),
      totalBottlesEver: num(at(g, r, 5)),
      status: storeStatus(at(g, r, 6)),
    });
  }
  return { rows, header: headerRow(g, headerIndex >= 0 ? headerIndex : 3).slice(0, 7) };
}

/* ----------------------------------- Log ----------------------------------- */
/**
 * The Log holds store names and dollar amounts. It is reduced to roll-ups here,
 * on the server; raw rows are never returned and never reach a component.
 */
function parseLog(g: Grid): { log: LogAggregates; header: string[] } {
  const headerIndex = findRowIndex(
    g,
    (cells) => (cells[0] ?? "") === "date" && filled(cells) >= 5,
    0,
    12,
  );
  const start = headerIndex >= 0 ? headerIndex + 1 : 4;

  const bottlesByProduct = new Map<string, number>();
  const bottlesByChannel = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();
  const months = new Map<
    string,
    { revenue: number; bottles: number; spend: number; investment: number }
  >();

  let rowCount = 0;
  let salesRevenue = 0;
  let salesBottles = 0;
  let productionSpend = 0;
  let expenseSpend = 0;
  let investmentReceived = 0;
  let firstDate: string | null = null;
  let latestDate: string | null = null;

  const bump = (map: Map<string, number>, key: string, by: number) => {
    if (!key || !Number.isFinite(by)) return;
    map.set(key, (map.get(key) ?? 0) + by);
  };

  for (let r = start; r < g.length; r++) {
    const dateCell = at(g, r, 0);
    if (isBlank(dateCell)) break; // read until the first blank Date
    const iso = serialToISO(dateCell) ?? (/^\d{4}-\d{2}-\d{2}/.test(str(dateCell)) ? str(dateCell).slice(0, 10) : null);
    const type = normalize(str(at(g, r, 1)));
    const product = str(at(g, r, 2));
    const channel = str(at(g, r, 3));
    const bottles = num(at(g, r, 5)) ?? 0;
    const amount = Math.abs(num(at(g, r, 6)) ?? 0);
    const category = str(at(g, r, 7));
    rowCount++;

    if (iso) {
      if (!firstDate || iso < firstDate) firstDate = iso;
      if (!latestDate || iso > latestDate) latestDate = iso;
    }
    const key = iso ? iso.slice(0, 7) : "unknown";
    const bucket =
      months.get(key) ?? { revenue: 0, bottles: 0, spend: 0, investment: 0 };

    if (type.startsWith("sale")) {
      salesRevenue += amount;
      salesBottles += bottles;
      bump(bottlesByProduct, product || "Unspecified", bottles);
      bump(bottlesByChannel, channel || "Unspecified", bottles);
      bucket.revenue += amount;
      bucket.bottles += bottles;
    } else if (type.startsWith("production")) {
      productionSpend += amount;
      bucket.spend += amount;
    } else if (type.startsWith("expense")) {
      expenseSpend += amount;
      bump(expenseByCategory, category || "Uncategorized", amount);
      bucket.spend += amount;
    } else if (type.startsWith("investment")) {
      investmentReceived += amount;
      bucket.investment += amount;
    }
    months.set(key, bucket);
  }

  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);

  const byMonth = [...months.entries()]
    .filter(([k]) => k !== "unknown")
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, v]) => ({
      month,
      label: monthLabel(`${month}-01`, month),
      revenue: v.revenue,
      bottles: v.bottles,
      spend: v.spend,
      investment: v.investment,
    }));

  return {
    log: {
      hasRows: rowCount > 0,
      rowCount,
      firstDate,
      latestDate,
      monthsWithData: byMonth.length,
      salesRevenue,
      salesBottles,
      productionSpend,
      expenseSpend,
      investmentReceived,
      bottlesByProduct: toSorted(bottlesByProduct).map((x) => ({
        key: x.key,
        bottles: x.value,
      })),
      bottlesByChannel: toSorted(bottlesByChannel).map((x) => ({
        key: x.key,
        bottles: x.value,
      })),
      expenseByCategory: toSorted(expenseByCategory).map((x) => ({
        key: x.key,
        amount: x.value,
      })),
      byMonth,
    },
    header: headerRow(g, headerIndex >= 0 ? headerIndex : 3).slice(0, 9),
  };
}

/* --------------------------------- assemble -------------------------------- */

const sum = (xs: (number | null)[]): number | null => {
  const vals = xs.filter((x): x is number => x !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
};

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

function byLabel<T extends { measure?: string; label?: string }>(
  rows: T[],
  patterns: string[],
): T | null {
  for (const pattern of patterns) {
    const p = normalize(pattern);
    const hit = rows.find((r) => normalize(r.measure ?? r.label ?? "").includes(p));
    if (hit) return hit;
  }
  return null;
}

const numberOf = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function parseDashboard(
  grids: Grids,
  meta: {
    fetchedAt: string;
    stale: boolean;
    staleReason: string | null;
    demo: boolean;
    tabHealth: TabHealth[];
  },
): Dashboard {
  const gi = grids.inputs;
  const gf = grids.forecast;
  const gm = grids.milestones;
  const gp = grids.planActual;

  const layout = inputsLayout(gi);
  const inputs = parseInputs(gi, layout.tierStart, layout.eventsHeader);
  const tiers = parseTiers(gi, layout.tierStart, layout.tierEnd);
  const events = parseEvents(gi, layout.eventsHeader);

  const { months: forecast, totals: forecastTotals, headerIndex: fHeader } = parseForecast(gf);

  const { gates, headerIndex: gateHeader } = parseGates(gm);
  const blocks = columnABlocks(gm, gateHeader + gates.length + 1).map((b) =>
    parseLabelledBlock(gm, b.start, b.end),
  );
  const keyNumbers = blocks[0]?.rows ?? [];
  const keyNumbersHeader = blocks[0]?.header ?? [];
  // Anything below the key numbers is a second table — unit economics in the
  // real Sheet, under its own title ("Profit per bottle sold to a store").
  const unitBlocks = blocks.slice(1).filter((b) => b.rows.length > 0);
  const unitEconomics = unitBlocks.flatMap((b) => b.rows);
  const unitEconomicsHeader = unitBlocks[0]?.header ?? [];
  const unitEconomicsTitle = unitBlocks[0]?.title ?? "";

  const lackingBlock = parseLacking(gm);
  const stagedBlock = parseStagedAsk(gm);
  const actualsBlock = parseActuals(gm);
  const { rows: planActual, headerIndex: pHeader } = parsePlanActual(gp);
  const storesBlock = parseStores(grids.stores);
  const logBlock = parseLog(grids.log);

  const floorInput = findInput(inputs, [
    "lowest cash balance you want to keep",
    "lowest cash balance",
    "lowest cash",
    "minimum cash",
    "cash floor",
    "cash buffer",
  ]);
  const minCashFloor = numberOf(floorInput?.value);

  const cells = {
    totalCapitalNeeded:
      byLabel(keyNumbers, [
        "total money the business needs",
        "total money",
        "total capital needed",
        "total capital",
        "money to raise",
        "capital needed",
        "total to raise",
      ]) ?? keyNumbers[0] ?? null,
    firstMonthMoneyNeeded:
      byLabel(keyNumbers, [
        "month the first money is needed",
        "first money is needed",
        "first month money is needed",
        "month money is needed",
        "first month you need money",
        "when money is needed",
        "first month cash",
      ]) ?? keyNumbers[1] ?? null,
    sauceCostInStock:
      byLabel(keyNumbers, [
        "cost per sauce bottle in stock",
        "sauce cost per bottle in stock",
        "bottle in stock",
        "cost per bottle in stock",
        "average sauce cost",
      ]) ?? null,
    // The target lives on the Inputs tab in the real Sheet, not in the key
    // numbers. Fall back to a "target" key number, then to deriving it from the
    // stated gap, then to the "needed" side of the matching shortfall row.
    sauceCostTarget: (() => {
      const fromInput = findInput(inputs, [
        "target cost per sauce bottle",
        "target cost per bottle",
        "target sauce cost",
        "target cost",
      ]);
      if (fromInput && typeof fromInput.value === "number") {
        return {
          measure: fromInput.label,
          value: fromInput.value,
          meaning: fromInput.note,
        };
      }
      const fromKey = byLabel(keyNumbers, [
        "target sauce cost per bottle",
        "target cost per bottle",
        "sauce cost target",
        "target sauce cost",
      ]);
      if (fromKey && typeof fromKey.value === "number") return fromKey;

      const inStock = byLabel(keyNumbers, [
        "cost per sauce bottle in stock",
        "bottle in stock",
      ]);
      const gap = byLabel(keyNumbers, ["gap to the target", "gap to target"]);
      if (typeof inStock?.value === "number" && typeof gap?.value === "number") {
        return {
          measure: "Target cost per sauce bottle",
          value: inStock.value - gap.value,
          meaning: gap.meaning || "Derived from the stated gap to target.",
        };
      }
      const fromLacking = lackingBlock.rows.find(
        (r) => /cost/i.test(r.item) && /target/i.test(r.item) && r.needed !== null,
      );
      if (fromLacking) {
        return {
          measure: "Target cost per sauce bottle",
          value: fromLacking.needed,
          meaning: "From the shortfall table.",
        };
      }
      return null;
    })(),
  };

  const year1 = forecast.slice(0, 12);
  const statusable = inputs.filter((i) => i.status !== "Unknown");
  const guessCount = statusable.filter((i) => i.status === "Guess").length;
  const realCount = statusable.filter((i) => i.status === "Real").length;

  const actualSauceRows = planActual.filter((p) => p.actualSauce !== null);
  const lastActuals = actualSauceRows.slice(-3).map((p) => p.actualSauce as number);
  const planRate = forecast.find((m) => m.sauceRate3Month !== null)?.sauceRate3Month ?? null;
  const currentSauceRate = lastActuals.length ? mean(lastActuals) : planRate;
  const currentSauceRateSource: "actual" | "plan" | "none" = lastActuals.length
    ? "actual"
    : planRate !== null
      ? "plan"
      : "none";

  const cashMonths = forecast.filter((m) => m.cashAtMonthEnd !== null);
  const lowest = cashMonths.reduce<ForecastMonth | null>(
    (acc, m) =>
      acc === null || (m.cashAtMonthEnd as number) < (acc.cashAtMonthEnd as number) ? m : acc,
    null,
  );

  const lastBankRow = [...planActual].reverse().find((p) => p.cashInBank !== null) ?? null;
  const lastCashBeforeRow =
    [...planActual].reverse().find((p) => p.actualCashBefore !== null) ?? null;
  const lastInvestmentRow =
    [...planActual].reverse().find((p) => p.investmentToDate !== null) ?? null;

  const monthsWithActuals = planActual.filter((p) => !p.noData).length;
  /**
   * Only the Log (and the Plan vs Actual columns it feeds) count as actuals.
   * The Milestones block is formulas: with nothing logged they return 0, which
   * must not be mistaken for "we sold zero".
   */
  const hasActuals = logBlock.log.hasRows || monthsWithActuals > 0;

  const perStore = byLabel(actualsBlock.rows, [
    "bottles per store per month",
    "bottles per store",
    "per store per month",
  ]);

  return {
    inputs,
    tiers,
    events,
    minCashFloor,
    minCashFloorStatus: floorInput?.status ?? "Unknown",
    forecast,
    forecastTotals,
    gates,
    keyNumbers,
    unitEconomics,
    lacking: lackingBlock.rows,
    stagedAsk: stagedBlock.rows,
    actuals: actualsBlock.rows,
    planActual,
    stores: storesBlock.rows,
    log: logBlock.log,
    cells,
    headers: {
      gates: headerRow(gm, gateHeader).slice(0, 7),
      lacking: lackingBlock.header,
      stagedAsk: stagedBlock.header,
      actuals: actualsBlock.header,
      keyNumbers: keyNumbersHeader,
      unitEconomics: unitEconomicsHeader,
      unitEconomicsTitle: unitEconomicsTitle ? [unitEconomicsTitle] : [],
      events: headerRow(gi, layout.eventsHeader).slice(0, 8),
      tiers: layout.tierStart > 0 ? headerRow(gi, layout.tierStart - 1).slice(0, 3) : [],
      forecast: headerRow(gf, fHeader),
      planActual: headerRow(gp, pHeader).slice(0, 17),
      stores: storesBlock.header,
      log: logBlock.header,
    },
    derived: {
      year1Revenue: sum(year1.map((m) => m.revenue)),
      year1Profit: sum(year1.map((m) => m.operatingProfit)),
      // The Sheet counts these itself; fall back to counting negative stock months.
      monthsOutOfSauce:
        numberOf(byLabel(keyNumbers, ["months you run out of sauce", "months out of sauce"])?.value) ??
        forecast.filter((m) => m.sauceLeft !== null && m.sauceLeft < 0).length,
      monthsOutOfRub:
        numberOf(byLabel(keyNumbers, ["months you run out of rub", "months out of rub"])?.value) ??
        forecast.filter((m) => m.rubLeft !== null && m.rubLeft < 0).length,
      guessCount,
      realCount,
      guessShare: statusable.length ? guessCount / statusable.length : null,
      currentSauceRate,
      currentSauceRateSource,
      lowestCash: lowest?.cashAtMonthEnd ?? null,
      lowestCashMonth: lowest?.label ?? null,
      floorBreachMonths:
        minCashFloor === null
          ? 0
          : cashMonths.filter((m) => (m.cashAtMonthEnd as number) < minCashFloor).length,
      cashInBank: lastBankRow?.cashInBank ?? null,
      cashInBankLabel: lastBankRow?.label ?? null,
      cashInBankPlan: lastBankRow?.planCashBefore ?? null,
      cashBeforeInvestmentActual: lastCashBeforeRow?.actualCashBefore ?? null,
      cashBeforeInvestmentPlan: lastCashBeforeRow?.planCashBefore ?? null,
      investmentToDate: lastInvestmentRow?.investmentToDate ?? null,
      hasActuals,
      monthsWithActuals,
      storesTotal: storesBlock.rows.length,
      storesActive: storesBlock.rows.filter((s) => s.status === "Active").length,
      storesAtRisk: storesBlock.rows.filter((s) => s.status === "At risk").length,
      storesSlowing: storesBlock.rows.filter((s) => s.status === "Slowing").length,
      bottlesPerStoreActual:
        numberOf(perStore?.actual) ??
        (storesBlock.rows.length
          ? mean(
              storesBlock.rows
                .map((s) => s.bottlesPerMonth)
                .filter((x): x is number => x !== null),
            )
          : null),
      bottlesPerStorePlan: numberOf(perStore?.plan),
    },
    meta: { ...meta, sheetUrl: sheetUrl() },
  };
}
