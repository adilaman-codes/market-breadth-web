"use client";

import { useMemo, useState } from "react";
import { BreadthRow, SectoralRow } from "@/lib/types";
import { scoreRegime, summarize } from "@/lib/regime";
import Dashboard from "./Dashboard";
import DataTable from "./DataTable";
import SummaryCard from "./SummaryCard";

type Tab = "dashboard" | "table";

const PRESETS: { label: string; days: number | "all" | "ytd" }[] = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "YTD", days: "ytd" },
  { label: "All", days: "all" },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function Client({
  breadth,
  sectoral,
}: {
  breadth: BreadthRow[];
  sectoral: SectoralRow[];
}) {
  const [tab, setTab] = useState<Tab>("dashboard");

  const minDate = breadth[0]?.date ?? "2004-01-01";
  const maxDate = breadth[breadth.length - 1]?.date ?? isoDaysAgo(0);

  const [from, setFrom] = useState<string>(() => {
    const sixMo = isoDaysAgo(182);
    return sixMo < minDate ? minDate : sixMo;
  });
  const [to, setTo] = useState<string>(maxDate);
  const [activePreset, setActivePreset] = useState<string>("6M");

  function applyPreset(p: (typeof PRESETS)[number]) {
    setActivePreset(p.label);
    setTo(maxDate);
    if (p.days === "all") setFrom(minDate);
    else if (p.days === "ytd") setFrom(new Date().getFullYear() + "-01-01");
    else {
      const start = isoDaysAgo(p.days);
      setFrom(start < minDate ? minDate : start);
    }
  }

  const filtered = useMemo(
    () => breadth.filter((r) => r.date >= from && r.date <= to),
    [breadth, from, to]
  );

  const latest = breadth[breadth.length - 1];
  const prev = breadth[breadth.length - 2];
  const regime = scoreRegime(latest);
  const summaryText = summarize(latest, prev);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Market Breadth Monitor
            </h1>
            <p className="text-white/70 text-xs sm:text-sm">
              NSE India · {breadth.length.toLocaleString()} sessions ·{" "}
              {new Date(minDate).getFullYear()}–{new Date(maxDate).getFullYear()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white/60 text-xs uppercase tracking-wide">Latest</div>
            <div className="font-semibold">
              {new Date(latest.date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary */}
        <SummaryCard regime={regime} latest={latest} summaryText={summaryText} />

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
          {/* Tabs */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(["dashboard", "table"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  tab === t
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "dashboard" ? "Dashboard" : "Data Table"}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Presets */}
          <div className="inline-flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                  activePreset === p.label
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              min={minDate}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset("");
              }}
              className="border border-slate-200 rounded-md px-2 py-1 text-slate-700"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={to}
              min={from}
              max={maxDate}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset("");
              }}
              className="border border-slate-200 rounded-md px-2 py-1 text-slate-700"
            />
          </div>
        </div>

        {/* Content */}
        <div className="text-xs text-slate-500 -mt-2">
          Showing {filtered.length.toLocaleString()} sessions
        </div>

        {tab === "dashboard" ? (
          <Dashboard rows={filtered} sectoral={sectoral} />
        ) : (
          <DataTable rows={filtered} />
        )}

        <footer className="pt-4 pb-8 text-center text-xs text-slate-400">
          Data: NSE India official Bhavcopy · Metrics replicate Market Breadth Monitor V2.0 ·
          Updated automatically after market close.
        </footer>
      </div>
    </main>
  );
}
