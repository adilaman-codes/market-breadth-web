"use client";

import { BreadthRow, SectoralRow } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { useMemo } from "react";

const NAVY = "#1B3A6B";
const BRAND = "#2E75B6";
const POS = "#1D6E3D";
const NEG = "#C0392B";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div style={{ width: "100%", height: 220 }}>{children}</div>
    </div>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: "#64748b" },
  tickLine: false,
  axisLine: { stroke: "#e2e8f0" },
};

const tooltipStyle = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },
  labelFormatter: (l: string) =>
    new Date(l).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
};

export default function Dashboard({
  rows,
  sectoral,
}: {
  rows: BreadthRow[];
  sectoral: SectoralRow[];
}) {
  // Thin the data for very wide ranges so charts stay readable/fast.
  const data = useMemo(() => {
    if (rows.length <= 400) return rows;
    const step = Math.ceil(rows.length / 400);
    return rows.filter((_, i) => i % step === 0 || i === rows.length - 1);
  }, [rows]);

  // Latest-day sector snapshot for the bar chart
  const sectorSnapshot = useMemo(() => {
    if (rows.length === 0 || sectoral.length === 0) return [];
    const lastDate = rows[rows.length - 1].date;
    // find nearest sectoral date <= lastDate
    const dates = Array.from(new Set(sectoral.map((s) => s.date))).sort();
    const target = [...dates].reverse().find((d) => d <= lastDate) ?? dates[dates.length - 1];
    return sectoral
      .filter((s) => s.date === target && s.chg_pct !== null)
      .map((s) => ({ sector: s.sector, chg: (s.chg_pct as number) * 100 }))
      .sort((a, b) => b.chg - a.chg);
  }, [rows, sectoral]);

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No sessions in the selected range.
      </div>
    );
  }

  const pctTip = (v: number) => (v * 100).toFixed(1) + "%";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Net Breadth" subtitle="(4% Advancers − 4% Decliners) as a score">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="nb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND} stopOpacity={0.5} />
                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(1), "Net Breadth"]} />
            <Area type="monotone" dataKey="net_breadth" stroke={BRAND} strokeWidth={1.5} fill="url(#nb)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Participation" subtitle="% of stocks above key moving averages">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} domain={[0, 1]} tickFormatter={(v) => Math.round(v * 100) + "%"} />
            <ReferenceLine y={0.5} stroke="#cbd5e1" strokeDasharray="4 4" />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, n: string) => [pctTip(v), n === "above50ma" ? "Above 50MA" : "Above 200MA"]}
            />
            <Line type="monotone" dataKey="above50ma" stroke={BRAND} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="above200ma" stroke={NAVY} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Net New Highs − New Lows" subtitle="52-week highs vs lows, net score">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="nhnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={POS} stopOpacity={0.5} />
                <stop offset="50%" stopColor={POS} stopOpacity={0} />
                <stop offset="50%" stopColor={NEG} stopOpacity={0} />
                <stop offset="100%" stopColor={NEG} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(1), "Net NH-NL"]} />
            <Area type="monotone" dataKey="net_nhnl" stroke={NAVY} strokeWidth={1.5} fill="url(#nhnl)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Nifty 50" subtitle="Index level over the selected range">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} domain={["auto", "auto"]} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number) => [v?.toLocaleString("en-IN"), "Nifty 50"]}
            />
            <Line type="monotone" dataKey="nifty50" stroke={POS} strokeWidth={1.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Breakouts vs Breakdowns" subtitle="% of universe, latest sessions">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} {...axisProps} minTickGap={40} />
            <YAxis {...axisProps} tickFormatter={(v) => Math.round(v * 100) + "%"} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, n: string) => [pctTip(v), n === "breakouts" ? "Breakouts" : "Breakdowns"]}
            />
            <Line type="monotone" dataKey="breakouts" stroke={POS} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="breakdowns" stroke={NEG} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sector Performance" subtitle="Latest session % change by NSE sector index">
        {sectorSnapshot.length > 0 ? (
          <ResponsiveContainer>
            <BarChart
              data={sectorSnapshot}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 30, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(v) => v.toFixed(1) + "%"} />
              <YAxis type="category" dataKey="sector" {...axisProps} width={70} />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(2) + "%", "Change"]} />
              <Bar dataKey="chg" radius={[0, 3, 3, 0]}>
                {sectorSnapshot.map((s, i) => (
                  <Cell key={i} fill={s.chg >= 0 ? POS : NEG} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No sector data available.
          </div>
        )}
      </ChartCard>
    </div>
  );
}
