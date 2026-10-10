import { JWT } from "google-auth-library";
import type { TabHealth } from "@/lib/types";

export type Cell = string | number | boolean | null;
export type Grid = Cell[][];

/**
 * One batchGet covering every tab. Ranges are deliberately taller/wider than the
 * current data so tables can grow in the Sheet without a code change — the API
 * trims trailing empty rows, and the parser locates blocks by header/label text
 * and stops at the first blank key cell.
 */
export const RANGES = {
  inputs: "Inputs!A1:H400",
  forecast: "Forecast!A1:AK40",
  milestones: "Milestones!A1:L80",
  planActual: "'Plan vs Actual'!A1:Q40",
  log: "Log!A1:I5000",
  stores: "Stores!A1:G60",
} as const;

export type GridKey = keyof typeof RANGES;
export type Grids = Record<GridKey, Grid>;

export const EMPTY_GRIDS: Grids = {
  inputs: [],
  forecast: [],
  milestones: [],
  planActual: [],
  log: [],
  stores: [],
};

export class ConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`Missing environment variable(s): ${missing.join(", ")}`);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

export function sheetId(): string {
  return process.env.SHEET_ID ?? "1ZWSCLyoDXbT8eXqLzgngf-mhnD4bVczerdWhRYkMuf8";
}

export function sheetUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId()}/edit`;
}

export function isDemo(): boolean {
  return process.env.DEMO_MODE === "1";
}

function credentials(): { email: string; key: string } {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const missing: string[] = [];
  if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!rawKey) missing.push("GOOGLE_PRIVATE_KEY");
  if (!process.env.SHEET_ID) missing.push("SHEET_ID");
  if (missing.length) throw new ConfigError(missing);
  // Vercel stores the key with literal \n; some shells also wrap it in quotes.
  const key = rawKey!
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
  return { email: email!, key };
}

let client: JWT | null = null;

function authClient(): JWT {
  if (client) return client;
  const { email, key } = credentials();
  client = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return client;
}

function describeError(status: number, statusText: string, body: string): string {
  const hint =
    status === 403
      ? `share the Sheet with ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL} as Viewer and enable the Sheets API`
      : status === 404
        ? "check SHEET_ID"
        : status === 400
          ? "a tab may have been renamed"
          : "";
  return `Sheets API ${status} ${statusText}${hint ? ` — ${hint}` : ""}${
    body ? `: ${body.slice(0, 240)}` : ""
  }`;
}

const QUERY = "valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER&majorDimension=ROWS";

async function get(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // Keep in step with `export const revalidate` in src/app/page.tsx.
    next: { revalidate: 60, tags: ["sheet"] },
  });
}

/** One range at a time — used only when the batch call fails, so one renamed tab
 *  cannot take the whole dashboard down. */
async function fetchIndividually(token: string): Promise<{ grids: Grids; health: TabHealth[] }> {
  const keys = Object.keys(RANGES) as GridKey[];
  const grids: Grids = { ...EMPTY_GRIDS };
  const health: TabHealth[] = [];

  await Promise.all(
    keys.map(async (key) => {
      const range = RANGES[key];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        sheetId(),
      )}/values/${encodeURIComponent(range)}?${QUERY}`;
      try {
        const res = await get(url, token);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          grids[key] = [];
          health.push({
            tab: range,
            ok: false,
            rows: 0,
            problem: describeError(res.status, res.statusText, body),
          });
          return;
        }
        const json = (await res.json()) as { values?: Grid };
        grids[key] = json.values ?? [];
        health.push({
          tab: range,
          ok: grids[key].length > 0,
          rows: grids[key].length,
          problem: grids[key].length ? null : "range came back empty",
        });
      } catch (err) {
        grids[key] = [];
        health.push({
          tab: range,
          ok: false,
          rows: 0,
          problem: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  if (health.every((h) => !h.ok)) {
    throw new Error(
      `Every range failed. First problem: ${health[0]?.problem ?? "unknown"}`,
    );
  }
  return { grids, health };
}

/** Server-only. Credentials never leave this module. */
export async function fetchGrids(): Promise<{ grids: Grids; health: TabHealth[] }> {
  const auth = authClient();
  const token = await auth.getAccessToken();
  if (!token?.token) throw new Error("Could not mint a Google access token");

  const params = new URLSearchParams(QUERY);
  for (const range of Object.values(RANGES)) params.append("ranges", range);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheetId(),
  )}/values:batchGet?${params.toString()}`;

  const res = await get(url, token.token);

  // A single bad range fails the whole batch; retry range-by-range and keep what works.
  if (!res.ok) {
    if (res.status === 400) return fetchIndividually(token.token);
    const body = await res.text().catch(() => "");
    throw new Error(describeError(res.status, res.statusText, body));
  }

  const json = (await res.json()) as {
    valueRanges?: { range?: string; values?: Grid }[];
  };
  const keys = Object.keys(RANGES) as GridKey[];
  const grids = { ...EMPTY_GRIDS };
  const health: TabHealth[] = [];
  keys.forEach((key, i) => {
    grids[key] = json.valueRanges?.[i]?.values ?? [];
    health.push({
      tab: RANGES[key],
      ok: grids[key].length > 0,
      rows: grids[key].length,
      problem: grids[key].length ? null : "range came back empty",
    });
  });

  const core: GridKey[] = ["inputs", "forecast", "milestones", "planActual"];
  if (core.every((k) => grids[k].length === 0)) {
    throw new Error("Sheets API returned no rows for any core tab — check the tab names");
  }
  return { grids, health };
}
