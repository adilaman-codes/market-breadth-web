"use client";

import { BreadthRow } from "@/lib/types";
import { Regime } from "@/lib/regime";
import { fmtValue } from "@/lib/columns";

const toneBg: Record<Regime["tone"], string> = {
  pos: "bg-pos/10 text-pos border-pos/30",
  neg: "bg-neg/10 text-neg border-neg/30",
  neutral: "bg-amber-50 text-amber-700 border-amber-300",
};

function Kpi({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean | null;
}) {
  const color =
    good === true ? "text-pos" : good === false ? "text-neg" : "text-slate-800";
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function SummaryCard({
  regime,
  latest,
  summaryText,
}: {
  regime: Regime;
  latest: BreadthRow;
  summaryText: string;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${toneBg[regime.tone]}`}
            >
              {regime.label}
            </span>
            <span className="text-sm text-slate-500">
              {regime.score}/7 bullish signals
            </span>
          </div>
          <p className="mt-3 text-slate-700 leading-relaxed">{summaryText}</p>
        </div>

        {/* Scorecard dots */}
        <div className="grid grid-cols-1 gap-1 text-xs min-w-[220px]">
          {regime.checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  c.bull ? "bg-pos" : "bg-neg"
                }`}
              />
              <span className="text-slate-600 flex-1">{c.label}</span>
              <span className="text-slate-400">{c.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi
          label="Net Breadth"
          value={fmtValue(latest.net_breadth, "score")}
          good={(latest.net_breadth ?? 0) > 0}
        />
        <Kpi
          label="Above 50MA"
          value={fmtValue(latest.above50ma, "pct")}
          good={(latest.above50ma ?? 0) > 0.5}
        />
        <Kpi
          label="Above 200MA"
          value={fmtValue(latest.above200ma, "pct")}
          good={(latest.above200ma ?? 0) > 0.5}
        />
        <Kpi
          label="Net NH-NL"
          value={fmtValue(latest.net_nhnl, "score")}
          good={(latest.net_nhnl ?? 0) > 0}
        />
        <Kpi
          label="5D A/D Ratio"
          value={fmtValue(latest.five_day_ratio, "ratio")}
          good={(latest.five_day_ratio ?? 0) > 1}
        />
        <Kpi
          label="Nifty 50"
          value={fmtValue(latest.nifty50, "index")}
          good={null}
        />
      </div>
    </section>
  );
}
