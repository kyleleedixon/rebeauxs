import { loadDashboard } from "@/lib/data";
import { KpiRow } from "@/components/sections/KpiRow";
import { CapitalSection } from "@/components/sections/CapitalSection";
import { GatesSection } from "@/components/sections/GatesSection";
import { LackingSection } from "@/components/sections/LackingSection";
import { VolumeMoneySection } from "@/components/sections/VolumeMoneySection";
import { TrackingSection } from "@/components/sections/TrackingSection";
import { StoresSection } from "@/components/sections/StoresSection";
import { AssumptionsSection } from "@/components/sections/AssumptionsSection";
import { LocalTime } from "@/components/LocalTime";
import { Card, Notice, Section } from "@/components/ui";
import { sheetUrl } from "@/lib/sheets";

/** Live read from the Sheet, re-fetched at most once every 5 minutes. */
export const revalidate = 300;

export default async function Page() {
  const result = await loadDashboard();

  if (!result.ok) {
    return <SetupScreen result={result} />;
  }

  const d = result.data;
  const problems = d.meta.tabHealth.filter((h) => !h.ok);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="border-b border-hair pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Rebeaux&rsquo;s BBQ Sauce · RBX
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Capital, milestones and tracking
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink2">
          A read-only view of the Sheet: how much money is needed and when, which stage
          gates pass, whether the plan is on track, and where the business is short. Every
          number is marked <span className="font-semibold text-ink">Real</span> or{" "}
          <span className="font-semibold text-ink">Guess</span>.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {d.meta.demo ? (
            <Notice kind="critical" title="Demo data — not from the Sheet">
              DEMO_MODE is on. Every number on this page is invented for layout work.
            </Notice>
          ) : null}
          {d.meta.stale ? (
            <Notice kind="warn" title="Showing the last good data">
              {d.meta.staleReason ?? "The latest read from the Sheet failed."}
            </Notice>
          ) : null}
          {problems.length ? (
            <Notice
              kind="warn"
              title={`${problems.length} ${problems.length === 1 ? "range" : "ranges"} could not be read`}
            >
              {problems.map((p) => `${p.tab} (${p.problem})`).join("; ")}
            </Notice>
          ) : null}
        </div>
      </header>

      <div className="mt-8">
        <Section eyebrow="At a glance" title="The four answers">
          <KpiRow d={d} />
        </Section>
      </div>

      <CapitalSection d={d} />
      <GatesSection d={d} />
      <LackingSection d={d} />
      <VolumeMoneySection d={d} />
      <TrackingSection d={d} />
      <StoresSection d={d} />
      <AssumptionsSection d={d} />

      <footer className="mt-12 border-t border-hair pt-5 text-sm text-ink2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Last refreshed <LocalTime iso={d.meta.fetchedAt} />
            <span className="text-muted"> · re-reads the Sheet every 5 minutes</span>
          </p>
          <a
            className="font-medium text-ink underline decoration-hair underline-offset-4 hover:decoration-ink"
            href={d.meta.sheetUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open the Sheet →
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">
          This page only reads. Edits are made in the Sheet only — nothing typed here would
          change anything. Private: do not share the link or screenshots.
        </p>
        {d.meta.tabHealth.length ? (
          <p className="mt-2 text-xs text-muted">
            Ranges read:{" "}
            {d.meta.tabHealth
              .map((h) => `${h.tab.split("!")[0].replace(/'/g, "")} (${h.rows} rows)`)
              .join(" · ")}
          </p>
        ) : null}
      </footer>
    </main>
  );
}

function SetupScreen({
  result,
}: {
  result:
    | { ok: false; kind: "config"; missing: string[] }
    | { ok: false; kind: "error"; message: string };
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Rebeaux&rsquo;s BBQ Sauce · RBX
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        The dashboard cannot read the Sheet yet
      </h1>

      <div className="mt-5">
        {result.kind === "config" ? (
          <Notice kind="warn" title="Missing environment variables">
            {result.missing.join(", ")}
          </Notice>
        ) : (
          <Notice kind="critical" title="The read failed">
            {result.message}
          </Notice>
        )}
      </div>

      <Card className="mt-5" title="What to check">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink2">
          <li>
            Set <code className="text-ink">SHEET_ID</code>,{" "}
            <code className="text-ink">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and{" "}
            <code className="text-ink">GOOGLE_PRIVATE_KEY</code> (newlines as{" "}
            <code className="text-ink">\n</code>) in the environment.
          </li>
          <li>
            Share the Sheet with the service-account email as <strong>Viewer</strong>.
          </li>
          <li>Enable the Google Sheets API on the service account&rsquo;s Google Cloud project.</li>
          <li>
            Keep the tab names <code className="text-ink">Inputs</code>,{" "}
            <code className="text-ink">Forecast</code>,{" "}
            <code className="text-ink">Milestones</code>,{" "}
            <code className="text-ink">Plan vs Actual</code>,{" "}
            <code className="text-ink">Log</code> and <code className="text-ink">Stores</code>.
          </li>
          <li>
            Full steps are in <code className="text-ink">README.md</code>.
          </li>
        </ol>
        <p className="mt-4 text-sm">
          <a
            className="font-medium text-ink underline decoration-hair underline-offset-4"
            href={sheetUrl()}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open the Sheet →
          </a>
        </p>
      </Card>
    </main>
  );
}
