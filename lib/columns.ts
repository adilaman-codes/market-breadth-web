// Column metadata for the breadth table. `fmt` drives how each value is displayed
// and coloured. Percent fields are stored as fractions (0.12 = 12%).

export type Fmt = "date" | "text" | "int" | "index" | "score" | "pct" | "ratio";

export interface Col {
  key: string;
  label: string;
  fmt: Fmt;
  group: string;
  // If true, higher = more bullish (used for green/red tinting where relevant)
  goodHigh?: boolean;
}

export const COLUMNS: Col[] = [
  { key: "date", label: "Date", fmt: "date", group: "Meta" },
  { key: "weekday", label: "Day", fmt: "text", group: "Meta" },
  { key: "nifty50", label: "Nifty 50", fmt: "index", group: "Index" },
  { key: "smlcap100", label: "Smallcap 100", fmt: "index", group: "Index" },
  { key: "universe", label: "Universe", fmt: "int", group: "Index" },

  { key: "adv4pct", label: "4% Advance", fmt: "pct", group: "Breadth", goodHigh: true },
  { key: "dec4pct", label: "4% Decline", fmt: "pct", group: "Breadth", goodHigh: false },
  { key: "net_breadth", label: "Net Breadth", fmt: "score", group: "Breadth", goodHigh: true },

  { key: "range3pct", label: "3% Range", fmt: "pct", group: "Volatility" },
  { key: "day_range5", label: "5-Day Range", fmt: "pct", group: "Volatility" },
  { key: "vol_ratio", label: "Volume Ratio", fmt: "ratio", group: "Volatility", goodHigh: true },
  { key: "uhlh_ratio", label: "UH/LH Ratio", fmt: "ratio", group: "Volatility", goodHigh: true },

  { key: "breakouts", label: "Breakouts", fmt: "pct", group: "Breakouts", goodHigh: true },
  { key: "up_close_pct", label: "Up Close %", fmt: "pct", group: "Breakouts", goodHigh: true },
  { key: "bo_sf_ratio", label: "BO S/F", fmt: "ratio", group: "Breakouts", goodHigh: true },
  { key: "breakdowns", label: "Breakdowns", fmt: "pct", group: "Breakdowns", goodHigh: false },
  { key: "down_close_pct", label: "Down Close %", fmt: "pct", group: "Breakdowns", goodHigh: false },
  { key: "bd_sf_ratio", label: "BD S/F", fmt: "ratio", group: "Breakdowns", goodHigh: false },

  { key: "surge15_5d", label: "15% in 5D", fmt: "pct", group: "Momentum", goodHigh: true },
  { key: "drop10_5d", label: "10%- in 5D", fmt: "pct", group: "Momentum", goodHigh: false },
  { key: "above10_10dema", label: "10%+ 10DEMA", fmt: "pct", group: "Momentum", goodHigh: true },
  { key: "below10_10dema", label: "10%- 10DEMA", fmt: "pct", group: "Momentum", goodHigh: false },

  { key: "new52wh", label: "New 52WH", fmt: "pct", group: "52-Week", goodHigh: true },
  { key: "new52wl", label: "New 52WL", fmt: "pct", group: "52-Week", goodHigh: false },
  { key: "net_nhnl", label: "Net NH-NL", fmt: "score", group: "52-Week", goodHigh: true },
  { key: "near52wh15", label: "15% fr 52WH", fmt: "pct", group: "52-Week", goodHigh: true },
  { key: "near52wl15", label: "15% fr 52WL", fmt: "pct", group: "52-Week", goodHigh: false },
  { key: "net15hl", label: "Net 15% HL", fmt: "score", group: "52-Week", goodHigh: true },

  { key: "above10ma", label: "Above 10MA", fmt: "pct", group: "Moving Avg", goodHigh: true },
  { key: "above20ma", label: "Above 20MA", fmt: "pct", group: "Moving Avg", goodHigh: true },
  { key: "above50ma", label: "Above 50MA", fmt: "pct", group: "Moving Avg", goodHigh: true },
  { key: "above200ma", label: "Above 200MA", fmt: "pct", group: "Moving Avg", goodHigh: true },

  { key: "five_day_ratio", label: "5D Ratio", fmt: "ratio", group: "Trend", goodHigh: true },
  { key: "ten_day_ratio", label: "10D Ratio", fmt: "ratio", group: "Trend", goodHigh: true },
];

export function fmtValue(v: number | string | null | undefined, fmt: Fmt): string {
  if (v === null || v === undefined || v === "") return "—";
  if (fmt === "date") {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (fmt === "text") return String(v);
  const n = typeof v === "number" ? v : parseFloat(v as string);
  if (isNaN(n)) return "—";
  switch (fmt) {
    case "int": return n.toLocaleString("en-IN");
    case "index": return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    case "score": return n.toFixed(1);
    case "pct": return (n * 100).toFixed(1) + "%";
    case "ratio": return n.toFixed(2);
    default: return String(n);
  }
}
