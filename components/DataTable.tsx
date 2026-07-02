"use client";

import { useMemo, useState } from "react";
import { BreadthRow } from "@/lib/types";
import { COLUMNS, fmtValue, Col } from "@/lib/columns";

// Color a cell based on the metric's meaning.
function cellColor(col: Col, v: number | string | null): string {
  if (v === null || v === undefined || v === "") return "text-slate-400";
  if (col.fmt === "date" || col.fmt === "text" || col.fmt === "int" || col.fmt === "index")
    return "text-slate-700";
  const n = typeof v === "number" ? v : parseFloat(v as string);
  if (isNaN(n)) return "text-slate-400";

  if (col.key === "net_breadth" || col.key === "net_nhnl" || col.key === "net15hl") {
    return n > 0 ? "text-pos font-medium" : n < 0 ? "text-neg font-medium" : "text-slate-600";
  }
  if (col.fmt === "ratio" && col.goodHigh !== undefined) {
    return n > 1 ? "text-pos" : n < 1 ? "text-neg" : "text-slate-600";
  }
  return "text-slate-700";
}

export default function DataTable({ rows }: { rows: BreadthRow[] }) {
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(
    () => (desc ? [...rows].reverse() : rows),
    [rows, desc]
  );

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No sessions in the selected range.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <span className="text-xs text-slate-500">
          {rows.length.toLocaleString()} sessions · {COLUMNS.length} metrics
        </span>
        <button
          onClick={() => setDesc((d) => !d)}
          className="text-xs font-medium text-brand hover:underline"
        >
          Date {desc ? "↓ newest first" : "↑ oldest first"}
        </button>
      </div>

      <div className="tbl-scroll overflow-auto" style={{ maxHeight: "70vh" }}>
        <table className="border-collapse text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10">
            <tr>
              {COLUMNS.map((c, i) => (
                <th
                  key={c.key}
                  className={`bg-navy text-white font-semibold px-2.5 py-2 text-center border-r border-white/10 ${
                    i < 2 ? "sticky left-0 z-20 bg-navy" : ""
                  }`}
                  style={i === 0 ? { left: 0 } : i === 1 ? { left: 90 } : undefined}
                  title={c.group}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={row.date} className={ri % 2 ? "bg-slate-50" : "bg-white"}>
                {COLUMNS.map((c, i) => {
                  const raw = row[c.key];
                  const sticky = i < 2;
                  const bg = ri % 2 ? "bg-slate-50" : "bg-white";
                  return (
                    <td
                      key={c.key}
                      className={`px-2.5 py-1.5 text-center border-r border-slate-100 ${cellColor(
                        c,
                        raw
                      )} ${sticky ? `sticky z-[1] ${bg} font-medium` : ""}`}
                      style={i === 0 ? { left: 0 } : i === 1 ? { left: 90 } : undefined}
                    >
                      {fmtValue(raw, c.fmt)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
