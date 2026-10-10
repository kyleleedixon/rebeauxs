import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigError, fetchGrids } from "@/lib/sheets";
import { parseDashboard } from "@/lib/parse";
import { demoGrids, demoMode } from "@/lib/demo";
import type { Dashboard } from "@/lib/types";

export type LoadResult =
  | { ok: true; data: Dashboard }
  | { ok: false; kind: "config"; missing: string[] }
  | { ok: false; kind: "error"; message: string };

/**
 * Last-good data, so a failed read degrades to a stale view instead of a blank
 * page. Two levels: module memory (same warm instance) and a JSON snapshot in
 * the instance's temp dir (survives a new render, not a new machine). Nothing is
 * written into the repo, and the snapshot is ephemeral.
 */
let memory: Dashboard | null = null;
const SNAPSHOT = path.join(os.tmpdir(), "rbx-dashboard-last-good.json");

async function writeSnapshot(data: Dashboard): Promise<void> {
  try {
    await fs.writeFile(SNAPSHOT, JSON.stringify(data), { mode: 0o600 });
  } catch {
    // A read-only tmp dir is not a reason to fail the page.
  }
}

async function readSnapshot(): Promise<Dashboard | null> {
  try {
    const raw = await fs.readFile(SNAPSHOT, "utf8");
    const parsed = JSON.parse(raw) as Dashboard;
    return parsed?.meta && Array.isArray(parsed.forecast) ? parsed : null;
  } catch {
    return null;
  }
}

function asStale(data: Dashboard, reason: string): Dashboard {
  return { ...data, meta: { ...data.meta, stale: true, staleReason: reason } };
}

export async function loadDashboard(): Promise<LoadResult> {
  const mode = demoMode();
  if (mode !== "off") {
    return {
      ok: true,
      data: parseDashboard(demoGrids(mode), {
        fetchedAt: new Date().toISOString(),
        stale: false,
        staleReason: null,
        demo: true,
        tabHealth: [],
      }),
    };
  }

  try {
    const { grids, health } = await fetchGrids();
    const data = parseDashboard(grids, {
      fetchedAt: new Date().toISOString(),
      stale: false,
      staleReason: null,
      demo: false,
      tabHealth: health,
    });
    memory = data;
    void writeSnapshot(data);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ConfigError) {
      return { ok: false, kind: "config", missing: err.missing };
    }
    const message = err instanceof Error ? err.message : String(err);
    const last = memory ?? (await readSnapshot());
    if (last) {
      return {
        ok: true,
        data: asStale(last, `Could not reach the Sheet: ${message}`),
      };
    }
    return { ok: false, kind: "error", message };
  }
}
