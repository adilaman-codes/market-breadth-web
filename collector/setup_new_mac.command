#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Market Breadth — New Mac Setup
#
# Run this ONCE on a new/replacement computer to restore the daily collector.
# Download this whole `collector` folder from GitHub, then double-click this file.
#
# It will:
#   1. Install the Python libraries the collector needs
#   2. Copy the collector scripts into ~/MarketBreadth
#   3. Ask for your Turso database URL + token and save them
#   4. Install the automatic daily 4 PM IST scheduler
#   5. Optionally rebuild the full price history (or just start from today)
#
# Your 22-year computed history already lives in Turso — this does NOT touch it.
# ─────────────────────────────────────────────────────────────────────────────
set -e
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/MarketBreadth"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Market Breadth — New Mac Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Python libraries
echo "▸ Installing Python libraries (pandas, numpy, openpyxl, libsql-client)..."
pip3 install --quiet --upgrade pandas numpy openpyxl libsql-client 2>&1 || \
  pip3 install --quiet --upgrade --user pandas numpy openpyxl libsql-client
echo "  done."
echo ""

# 2. Copy scripts into ~/MarketBreadth
echo "▸ Setting up ~/MarketBreadth ..."
mkdir -p "$DEST"
cp "$SELF_DIR/market_breadth_collector.py" "$DEST/"
cp "$SELF_DIR/push_to_cloud.py"            "$DEST/"
cp "$SELF_DIR/run_daily.sh"                "$DEST/"
chmod +x "$DEST/run_daily.sh"
echo "  scripts copied."
echo ""

# 3. Turso credentials
if [ -f "$DEST/.turso_env" ]; then
    echo "▸ Found existing .turso_env — keeping it."
else
    echo "▸ Enter your Turso credentials (from turso.tech)."
    printf "   Database URL (libsql://...): "
    read TURSO_URL
    printf "   Auth token (eyJ...): "
    read TURSO_TOKEN
    cat > "$DEST/.turso_env" <<EOF
TURSO_DATABASE_URL=$TURSO_URL
TURSO_AUTH_TOKEN=$TURSO_TOKEN
EOF
    echo "  saved."
fi
echo ""

# 4. Install the daily scheduler (regenerate plist for THIS user/paths)
echo "▸ Installing the daily 4 PM IST scheduler..."
PLIST="$HOME/Library/LaunchAgents/com.breadth.daily.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.breadth.daily</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$DEST/run_daily.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
        <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
        <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
        <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
        <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
    </array>
    <key>StandardOutPath</key><string>$DEST/launchd_out.log</string>
    <key>StandardErrorPath</key><string>$DEST/launchd_err.log</string>
    <key>RunAtLoad</key><false/>
    <key>EnvironmentVariables</key>
    <dict><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
</dict>
</plist>
EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
launchctl list | grep breadth >/dev/null && echo "  scheduler active." || echo "  scheduler loaded (may need a reboot)."
echo ""

# 5. History
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Your computed history is already safe in Turso, so you do NOT have to rebuild it."
printf "Rebuild the full local price history now anyway? (~1-2 hrs)  [y/N]: "
read REBUILD
cd "$DEST"
if [[ "$REBUILD" =~ ^[Yy]$ ]]; then
    python3 market_breadth_collector.py --setup
    python3 push_to_cloud.py --full
else
    echo "Skipping. Fetching just today to confirm everything works..."
    python3 market_breadth_collector.py --today || echo "(No market data today — that's fine on a weekend/holiday.)"
    python3 push_to_cloud.py || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Setup complete. Daily collection will run automatically at 4 PM IST."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Press Enter to close..."
