import { getBreadth, getSectoral } from "@/lib/data";
import Client from "@/components/Client";
import { BreadthRow, SectoralRow } from "@/lib/types";

// Always render at request time so freshly-pushed data (and the first deploy)
// show immediately. Turso's free tier easily handles per-visit reads.
export const dynamic = "force-dynamic";

export default async function Page() {
  let breadth: BreadthRow[] = [];
  let sectoral: SectoralRow[] = [];
  let error: string | null = null;

  try {
    [breadth, sectoral] = await Promise.all([getBreadth(), getSectoral()]);
  } catch (e: any) {
    error = e?.message || "Could not load data.";
  }

  if (error || breadth.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-navy">Market Breadth Monitor</h1>
          <p className="mt-3 text-slate-600">
            {error
              ? "The database isn't reachable yet."
              : "No data found in the database yet."}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Make sure <code className="bg-slate-100 px-1 rounded">TURSO_DATABASE_URL</code> and{" "}
            <code className="bg-slate-100 px-1 rounded">TURSO_AUTH_TOKEN</code> are set, and that
            you have run the initial data push. See DEPLOY.md.
          </p>
        </div>
      </main>
    );
  }

  return <Client breadth={breadth} sectoral={sectoral} />;
}
