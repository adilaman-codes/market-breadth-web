#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Market Breadth Daily Runner
# Runs automatically at 4:00 PM IST (10:30 AM UTC) Mon–Fri
# Called by launchd via com.breadth.daily.plist
# ─────────────────────────────────────────────────────────────────────────────

# Directory where market_breadth_collector.py lives — edit this path
SCRIPT_DIR="/Users/idontapprove/MarketBreadth"

LOG="$SCRIPT_DIR/run_daily.log"
echo "──────────────────────────────────────" >> "$LOG"
echo "Run started: $(date)" >> "$LOG"

# Install / upgrade dependencies silently
pip3 install --upgrade --quiet pandas openpyxl numpy libsql-client >> "$LOG" 2>&1

# Run the collector for today
python3 "$SCRIPT_DIR/market_breadth_collector.py" --today >> "$LOG" 2>&1
EXIT_CODE=$?

# Push the latest data to the cloud (Turso) so the website updates.
# Only runs if Turso creds are configured (env vars or .turso_env file).
if [ -f "$SCRIPT_DIR/.turso_env" ] || [ -n "$TURSO_DATABASE_URL" ]; then
    echo "Pushing to cloud..." >> "$LOG"
    python3 "$SCRIPT_DIR/push_to_cloud.py" >> "$LOG" 2>&1
fi

echo "Finished: $(date)  exit=$EXIT_CODE" >> "$LOG"
exit $EXIT_CODE
