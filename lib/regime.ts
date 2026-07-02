import { BreadthRow } from "./types";

export interface Regime {
  score: number;        // 0..7 bullish points
  label: string;        // Strong Bull / Bullish / Neutral / Bearish / Strong Bear
  tone: "pos" | "neg" | "neutral";
  checks: { label: string; bull: boolean; detail: string }[];
}

const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : (n * 100).toFixed(0) + "%";
const num = (n: number | null | undefined, d = 1) =>
  n === null || n === undefined ? "—" : n.toFixed(d);

// A 7-point bull/bear scorecard derived from the breadth metrics.
export function scoreRegime(r: BreadthRow): Regime {
  const checks = [
    {
      label: "Net Breadth positive",
      bull: (r.net_breadth ?? 0) > 0,
      detail: `Net Breadth ${num(r.net_breadth)}`,
    },
    {
      label: "Majority above 50-DEMA",
      bull: (r.above50ma ?? 0) > 0.5,
      detail: `${pct(r.above50ma)} above 50MA`,
    },
    {
      label: "Majority above 200-DEMA",
      bull: (r.above200ma ?? 0) > 0.5,
      detail: `${pct(r.above200ma)} above 200MA`,
    },
    {
      label: "New highs beating new lows",
      bull: (r.net_nhnl ?? 0) > 0,
      detail: `Net NH-NL ${num(r.net_nhnl)}`,
    },
    {
      label: "5-day A/D ratio > 1",
      bull: (r.five_day_ratio ?? 0) > 1,
      detail: `5D ratio ${num(r.five_day_ratio, 2)}`,
    },
    {
      label: "Breakouts sustaining",
      bull: (r.bo_sf_ratio ?? 0) > 1,
      detail: `BO S/F ${num(r.bo_sf_ratio, 2)}`,
    },
    {
      label: "Stocks near 52W highs lead lows",
      bull: (r.net15hl ?? 0) > 0,
      detail: `Net 15% HL ${num(r.net15hl)}`,
    },
  ];

  const score = checks.filter((c) => c.bull).length;
  let label: string, tone: Regime["tone"];
  if (score >= 6) { label = "Strong Bull"; tone = "pos"; }
  else if (score >= 4) { label = "Bullish"; tone = "pos"; }
  else if (score === 3) { label = "Neutral"; tone = "neutral"; }
  else if (score >= 1) { label = "Bearish"; tone = "neg"; }
  else { label = "Strong Bear"; tone = "neg"; }

  return { score, label, tone, checks };
}

// One-sentence plain-English summary of the latest regime + short-term drift.
export function summarize(latest: BreadthRow, prev?: BreadthRow): string {
  const reg = scoreRegime(latest);
  const parts: string[] = [];
  parts.push(
    `The market is in a ${reg.label.toLowerCase()} regime (${reg.score}/7 bullish signals).`
  );

  const ab50 = latest.above50ma;
  if (ab50 !== null && ab50 !== undefined) {
    parts.push(`${(ab50 * 100).toFixed(0)}% of stocks trade above their 50-day average`);
  }
  const nb = latest.net_breadth;
  if (nb !== null && nb !== undefined) {
    parts.push(`and today's net breadth is ${nb.toFixed(1)}`);
  }
  let sentence = parts.join(", ").replace(", and", " and") + ".";

  if (prev) {
    const nbNow = latest.net_breadth ?? 0;
    const nbPrev = prev.net_breadth ?? 0;
    const drift = nbNow > nbPrev ? "improving" : nbNow < nbPrev ? "deteriorating" : "flat";
    sentence += ` Breadth is ${drift} versus the prior session.`;
  }
  return sentence;
}
