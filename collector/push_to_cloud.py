#!/usr/bin/env python3
"""
push_to_cloud.py — Sync local Market Breadth data to a free Turso (libSQL) database.

Only the lightweight `breadth` and `sectoral` tables are pushed (NOT the millions of
raw_prices rows), so the cloud database stays tiny and well within Turso's free tier.

The website on Vercel reads from Turso; this script keeps Turso up to date.

SETUP (one time):
  pip3 install libsql-client
  export TURSO_DATABASE_URL="libsql://your-db-name.turso.io"
  export TURSO_AUTH_TOKEN="your-token"
  python3 push_to_cloud.py --full     # push all history once

DAILY (called automatically by run_daily.sh after the collector runs):
  python3 push_to_cloud.py            # push only the latest date(s)

The URL + token can also be placed in a file called `.turso_env` next to this script:
  TURSO_DATABASE_URL=libsql://your-db-name.turso.io
  TURSO_AUTH_TOKEN=your-token
"""

import os
import sys
import sqlite3
import argparse
import logging
from pathlib import Path

BASE_DIR = Path(__file__).parent
DB_PATH  = BASE_DIR / "market_breadth.db"
ENV_FILE = BASE_DIR / ".turso_env"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[logging.FileHandler(BASE_DIR / "push_to_cloud.log"),
              logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("push")

# Columns pushed to the cloud (must match the website's expectations)
BREADTH_COLS = [
    "date", "weekday", "nifty50", "smlcap100", "universe",
    "adv4pct", "dec4pct", "net_breadth", "range3pct", "range5pct",
    "vol_ratio", "uhlh_ratio", "breakouts", "up_close_pct", "bo_sf_ratio",
    "breakdowns", "down_close_pct", "bd_sf_ratio", "surge15_5d", "drop10_5d",
    "above10_10dema", "below10_10dema", "new52wh", "new52wl", "net_nhnl",
    "near52wh15", "near52wl15", "net15hl", "day_range5",
    "above10ma", "above20ma", "above50ma", "above200ma",
    "five_day_ratio", "ten_day_ratio",
]
SECTORAL_COLS = ["date", "sector", "close", "chg_pct"]
AI_INSIGHT_COLS = ["date", "insight", "model", "generated_at"]
KEEP_INSIGHTS = 8   # rolling window: only the most recent N days of AI insight


def _load_env():
    """Load Turso creds from environment or .turso_env file."""
    url   = os.environ.get("TURSO_DATABASE_URL")
    token = os.environ.get("TURSO_AUTH_TOKEN")
    if (not url or not token) and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k == "TURSO_DATABASE_URL" and not url:
                url = v
            elif k == "TURSO_AUTH_TOKEN" and not token:
                token = v
    if not url or not token:
        log.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN. "
                  "Set env vars or create a .turso_env file. See DEPLOY.md.")
        sys.exit(1)
    return url, token


def _get_client(url, token):
    try:
        from libsql_client import create_client_sync
    except ImportError:
        log.error("libsql-client not installed. Run:  pip3 install libsql-client")
        sys.exit(1)
    # create_client_sync expects an https:// URL for the sync (HTTP) transport
    http_url = url.replace("libsql://", "https://").replace("ws://", "https://")
    return create_client_sync(url=http_url, auth_token=token)


def _ensure_schema(client):
    client.execute("""
        CREATE TABLE IF NOT EXISTS breadth (
            date TEXT PRIMARY KEY, weekday TEXT, nifty50 REAL, smlcap100 REAL,
            universe INTEGER, adv4pct REAL, dec4pct REAL, net_breadth REAL,
            range3pct REAL, range5pct REAL, vol_ratio REAL, uhlh_ratio REAL,
            breakouts REAL, up_close_pct REAL, bo_sf_ratio REAL, breakdowns REAL,
            down_close_pct REAL, bd_sf_ratio REAL, surge15_5d REAL, drop10_5d REAL,
            above10_10dema REAL, below10_10dema REAL, new52wh REAL, new52wl REAL,
            net_nhnl REAL, near52wh15 REAL, near52wl15 REAL, net15hl REAL,
            day_range5 REAL, above10ma REAL, above20ma REAL, above50ma REAL,
            above200ma REAL, five_day_ratio REAL, ten_day_ratio REAL
        )
    """)
    client.execute("""
        CREATE TABLE IF NOT EXISTS sectoral (
            date TEXT NOT NULL, sector TEXT NOT NULL, close REAL, chg_pct REAL,
            PRIMARY KEY (date, sector)
        )
    """)
    client.execute("""
        CREATE TABLE IF NOT EXISTS ai_insight (
            date TEXT PRIMARY KEY, insight TEXT, model TEXT, generated_at TEXT
        )
    """)


def _fetch_local(where_recent: bool):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if where_recent:
        # latest 10 dates only (covers today + any recent backfill/re-computes)
        dates = [r[0] for r in conn.execute(
            "SELECT date FROM breadth ORDER BY date DESC LIMIT 10").fetchall()]
        if not dates:
            return [], []
        placeholders = ",".join("?" * len(dates))
        b = conn.execute(
            f"SELECT {','.join(BREADTH_COLS)} FROM breadth WHERE date IN ({placeholders})",
            dates).fetchall()
        s = conn.execute(
            f"SELECT {','.join(SECTORAL_COLS)} FROM sectoral WHERE date IN ({placeholders})",
            dates).fetchall()
    else:
        b = conn.execute(f"SELECT {','.join(BREADTH_COLS)} FROM breadth").fetchall()
        s = conn.execute(f"SELECT {','.join(SECTORAL_COLS)} FROM sectoral").fetchall()
    conn.close()
    return [list(r) for r in b], [list(r) for r in s]


def _fetch_ai_insights():
    """Most recent AI insights (rolling window). Empty if the table doesn't exist yet."""
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            f"SELECT {','.join(AI_INSIGHT_COLS)} FROM ai_insight "
            f"ORDER BY date DESC LIMIT {KEEP_INSIGHTS}"
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []   # ai_insight table not created yet
    conn.close()
    return [list(r) for r in rows]


def _trim_cloud_insights(client, keep=KEEP_INSIGHTS):
    client.execute(
        "DELETE FROM ai_insight WHERE date NOT IN "
        "(SELECT date FROM ai_insight ORDER BY date DESC LIMIT ?)",
        [keep],
    )


def _upsert_batch(client, table, cols, rows, chunk=200):
    if not rows:
        return 0
    placeholders = ",".join("?" * len(cols))
    sql = f"INSERT OR REPLACE INTO {table} ({','.join(cols)}) VALUES ({placeholders})"
    total = 0
    for i in range(0, len(rows), chunk):
        batch = rows[i:i + chunk]
        stmts = [(sql, list(r)) for r in batch]
        client.batch(stmts)
        total += len(batch)
        log.info(f"  {table}: pushed {total}/{len(rows)}")
    return total


def main():
    ap = argparse.ArgumentParser(description="Push local breadth data to Turso")
    ap.add_argument("--full", action="store_true",
                    help="Push ALL history (use once for initial seed)")
    args = ap.parse_args()

    if not DB_PATH.exists():
        log.error(f"Local database not found at {DB_PATH}. Run the collector first.")
        sys.exit(1)

    url, token = _load_env()
    client = _get_client(url, token)
    _ensure_schema(client)

    breadth_rows, sectoral_rows = _fetch_local(where_recent=not args.full)
    log.info(f"Pushing {len(breadth_rows)} breadth rows, "
             f"{len(sectoral_rows)} sectoral rows ({'FULL' if args.full else 'recent'})...")

    _upsert_batch(client, "breadth", BREADTH_COLS, breadth_rows)
    _upsert_batch(client, "sectoral", SECTORAL_COLS, sectoral_rows)

    # AI insights: push the most recent few, then trim the cloud to the last 8 days.
    ai_rows = _fetch_ai_insights()
    log.info(f"Pushing {len(ai_rows)} ai_insight rows...")
    _upsert_batch(client, "ai_insight", AI_INSIGHT_COLS, ai_rows)
    _trim_cloud_insights(client)

    client.close()
    log.info("✓ Cloud sync complete.")


if __name__ == "__main__":
    main()
