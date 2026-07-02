#!/usr/bin/env python3
"""
generate_ai_insight.py — Write a short, plain-English "AI Expert Insight" for the
latest trading day and store it in the local SQLite `ai_insight` table.

The top of the website (regime scorecard, KPI tiles, one-line summary) is generated
by deterministic Python/TypeScript rules — no AI, no tokens. THIS script is the only
part that calls a language model. It runs once per day from run_daily.sh, produces one
paragraph or two of narrative interpretation, and keeps only the most recent 8 days
(a rolling window) so cost and storage stay tiny.

SETUP (one time):
  pip3 install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."          # your key
  # optional: export ANTHROPIC_MODEL="claude-haiku-4-5-20251001"

DAILY (called automatically by run_daily.sh after the collector runs):
  python3 generate_ai_insight.py                 # insight for the latest date
  python3 generate_ai_insight.py --date 2026-07-02   # a specific date
  python3 generate_ai_insight.py --force         # regenerate even if one exists

If ANTHROPIC_API_KEY is missing the script exits quietly (0) so the rest of the daily
run is never blocked — the site simply shows "insight not generated" for that day.
The key can also live in a file called `.ai_env` next to this script:
  ANTHROPIC_API_KEY=sk-ant-...
  ANTHROPIC_MODEL=claude-haiku-4-5-20251001
"""

import os
import sys
import json
import sqlite3
import argparse
import logging
import datetime as dt
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_PATH  = BASE_DIR / "market_breadth.db"
ENV_FILE = BASE_DIR / ".ai_env"

KEEP_DAYS = 8          # rolling window: keep only the most recent N insights
DEFAULT_MODEL = "claude-haiku-4-5-20251001"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[logging.FileHandler(BASE_DIR / "ai_insight.log"),
              logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("ai_insight")


# ── env ──────────────────────────────────────────────────────────────────────
def _load_env():
    key   = os.environ.get("ANTHROPIC_API_KEY")
    model = os.environ.get("ANTHROPIC_MODEL")
    if (not key or not model) and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k == "ANTHROPIC_API_KEY" and not key:
                key = v
            elif k == "ANTHROPIC_MODEL" and not model:
                model = v
    return key, (model or DEFAULT_MODEL)


# ── local db ─────────────────────────────────────────────────────────────────
def _ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_insight (
            date         TEXT PRIMARY KEY,
            insight      TEXT,
            model        TEXT,
            generated_at TEXT
        )
    """)
    conn.commit()


def _latest_date(conn):
    row = conn.execute("SELECT date FROM breadth ORDER BY date DESC LIMIT 1").fetchone()
    return row[0] if row else None


def _breadth_context(conn, date):
    """Latest date's row plus the previous ~9 sessions, for trend context."""
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM breadth WHERE date <= ? ORDER BY date DESC LIMIT 10",
        (date,),
    ).fetchall()
    return [dict(r) for r in rows]  # newest first


def _sectoral_context(conn, date):
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT sector, close, chg_pct FROM sectoral WHERE date = ? ORDER BY chg_pct DESC",
        (date,),
    ).fetchall()
    return [dict(r) for r in rows]


def _trim(conn, keep=KEEP_DAYS):
    conn.execute(
        "DELETE FROM ai_insight WHERE date NOT IN "
        "(SELECT date FROM ai_insight ORDER BY date DESC LIMIT ?)",
        (keep,),
    )
    conn.commit()


# ── prompt ───────────────────────────────────────────────────────────────────
def _pct(x):
    return "n/a" if x is None else f"{x * 100:.0f}%"

def _num(x, d=1):
    return "n/a" if x is None else f"{x:.{d}f}"


def _build_prompt(breadth_rows, sectoral):
    latest = breadth_rows[0]
    prev = breadth_rows[1] if len(breadth_rows) > 1 else None
    date = latest["date"]

    def line(r):
        return (f'{r["date"]}: net_breadth={_num(r.get("net_breadth"))}, '
                f'%>50DEMA={_pct(r.get("above50ma"))}, %>200DEMA={_pct(r.get("above200ma"))}, '
                f'net_NH-NL={_num(r.get("net_nhnl"))}, 5D_AD_ratio={_num(r.get("five_day_ratio"),2)}, '
                f'breakouts={_num(r.get("breakouts"))}, breakdowns={_num(r.get("breakdowns"))}, '
                f'BO_S/F={_num(r.get("bo_sf_ratio"),2)}, Nifty50={_num(r.get("nifty50"),0)}')

    recent = "\n".join(line(r) for r in reversed(breadth_rows))  # oldest→newest

    top = ", ".join(f'{s["sector"]} {_num(s.get("chg_pct"),2)}%' for s in sectoral[:3]) or "n/a"
    bot = ", ".join(f'{s["sector"]} {_num(s.get("chg_pct"),2)}%' for s in sectoral[-3:]) or "n/a"

    data_block = (
        f"Latest trading day: {date}\n"
        f"Breadth metrics (last {len(breadth_rows)} sessions, oldest to newest):\n{recent}\n\n"
        f"Leading sectors today: {top}\n"
        f"Lagging sectors today: {bot}\n"
    )

    system = (
        "You are a market-breadth analyst writing a short daily note for an Indian "
        "(NSE) equities dashboard. You are given pre-computed breadth statistics — do "
        "NOT recompute or invent numbers, only interpret the ones provided. Explain, in "
        "plain English, what the breadth picture says about market health and the "
        "short-term trend, note any divergence (e.g. index up but breadth weak), and "
        "flag what to watch next. Be specific and grounded in the figures. No financial "
        "advice, no price targets, no buy/sell calls. 120-180 words, 2 short paragraphs, "
        "plain prose (no headings, no bullet lists, no markdown)."
    )
    user = (
        f"{data_block}\n"
        "Write the daily breadth insight for the latest trading day."
    )
    return system, user


def _generate(system, user, key, model):
    try:
        import anthropic
    except ImportError:
        log.error("anthropic package not installed. Run:  pip3 install anthropic")
        return None
    client = anthropic.Anthropic(api_key=key)
    resp = client.messages.create(
        model=model,
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


# ── main ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Generate the daily AI Expert Insight")
    ap.add_argument("--date", type=str, help="Specific date (YYYY-MM-DD); default = latest")
    ap.add_argument("--force", action="store_true", help="Regenerate even if one exists")
    args = ap.parse_args()

    if not DB_PATH.exists():
        log.error(f"Local database not found at {DB_PATH}. Run the collector first.")
        sys.exit(0)

    key, model = _load_env()
    if not key:
        log.warning("ANTHROPIC_API_KEY not set — skipping AI insight (site will show none).")
        sys.exit(0)

    conn = sqlite3.connect(DB_PATH)
    _ensure_table(conn)

    date = args.date or _latest_date(conn)
    if not date:
        log.error("No breadth data available.")
        sys.exit(0)

    existing = conn.execute("SELECT 1 FROM ai_insight WHERE date = ?", (date,)).fetchone()
    if existing and not args.force:
        log.info(f"Insight for {date} already exists — skipping (use --force to regenerate).")
        _trim(conn)
        conn.close()
        return

    breadth_rows = _breadth_context(conn, date)
    if not breadth_rows:
        log.error(f"No breadth row for {date}.")
        sys.exit(0)
    sectoral = _sectoral_context(conn, date)

    system, user = _build_prompt(breadth_rows, sectoral)
    log.info(f"Generating insight for {date} with {model}...")
    text = _generate(system, user, key, model)
    if not text:
        log.error("No insight produced.")
        sys.exit(0)

    conn.execute(
        "INSERT OR REPLACE INTO ai_insight (date, insight, model, generated_at) "
        "VALUES (?, ?, ?, ?)",
        (date, text, model, dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"),
    )
    conn.commit()
    _trim(conn)
    conn.close()
    log.info(f"✓ Insight stored for {date} ({len(text)} chars). Kept last {KEEP_DAYS} days.")


if __name__ == "__main__":
    main()
