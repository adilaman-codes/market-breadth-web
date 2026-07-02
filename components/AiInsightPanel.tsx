"use client";

import { AiInsight } from "@/lib/types";

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtGenerated(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (isNaN(t.getTime())) return null;
  return t.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AiInsightPanel({
  insight,
  date,
}: {
  insight: AiInsight | undefined;
  date: string;
}) {
  const generated = fmtGenerated(insight?.generated_at ?? null);

  return (
    <section className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold tracking-wide">
            AI EXPERT INSIGHT
          </span>
          <span className="text-sm text-slate-500">{fmtDate(date)}</span>
        </div>
        {generated && (
          <span className="text-xs text-slate-400">Generated {generated}</span>
        )}
      </div>

      <div className="p-5">
        {insight?.insight ? (
          <div className="max-w-3xl space-y-3 text-slate-700 leading-relaxed">
            {insight.insight
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            No AI insight has been generated for this day yet. Insights are written
            automatically after market close and kept for the last 8 trading days.
          </p>
        )}
      </div>

      <div className="px-5 pb-4 text-xs text-slate-400">
        AI-generated interpretation of the pre-computed breadth statistics. Not financial
        advice.
      </div>
    </section>
  );
}
