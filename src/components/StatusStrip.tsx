import type { PlanActualRow, TrackStatus } from "@/lib/types";
import { money } from "@/lib/format";

const TONE: Record<TrackStatus, { cell: string; dot: string; text: string }> = {
  "On track": { cell: "bg-good/85 text-white", dot: "bg-good", text: "On track" },
  Watch: { cell: "bg-warn/90 text-ink", dot: "bg-warn", text: "Watch" },
  Behind: { cell: "bg-critical/90 text-white", dot: "bg-critical", text: "Behind" },
  "No data": { cell: "bg-nodata/50 text-ink2", dot: "bg-nodata", text: "No data yet" },
};

/**
 * 24 month cells. Color carries the status, but each cell also shows its month
 * number and names its status on hover, so nothing is color-only.
 */
export function StatusStrip({ rows }: { rows: PlanActualRow[] }) {
  return (
    <div>
      <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {rows.map((r) => {
          const tone = TONE[r.status];
          return (
            <li key={r.monthNumber ?? r.label} className="group relative">
              <div
                className={`flex h-9 items-center justify-center rounded-md text-[11px] font-semibold ${tone.cell}`}
              >
                <span className="tnum">{r.monthNumber ?? "—"}</span>
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-44 -translate-x-1/2 rounded-lg border border-hair bg-raise px-3 py-2 text-left text-xs shadow-lg group-hover:block group-focus-within:block">
                <p className="font-semibold text-ink">
                  Month {r.monthNumber ?? "—"} · {r.label}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-ink2">
                  <span className={`inline-block size-2 rounded-full ${tone.dot}`} aria-hidden="true" />
                  {tone.text}
                </p>
                <p className="mt-1 text-ink2">
                  Revenue plan {money(r.planRevenue)}
                  <br />
                  Actual{" "}
                  {r.actualRevenue === null ? (
                    <span className="text-muted">none yet</span>
                  ) : (
                    money(r.actualRevenue)
                  )}
                </p>
              </div>
              <span className="sr-only">
                Month {r.monthNumber}: {tone.text}
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {(["On track", "Watch", "Behind", "No data"] as TrackStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5 text-xs text-ink2">
            <span className={`inline-block size-2.5 rounded-[2px] ${TONE[s].dot}`} aria-hidden="true" />
            {TONE[s].text}
          </li>
        ))}
      </ul>
    </div>
  );
}
