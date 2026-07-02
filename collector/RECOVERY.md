# Collector Backup & Recovery

These are the scripts that collect NSE market breadth data each day and push it to the
cloud (Turso). They live here on GitHub as a backup. The **live** copies run on the
collecting computer in its `~/MarketBreadth/` folder.

## What runs where

| Piece | Where it lives | Survives if the Mac dies? |
|-------|----------------|---------------------------|
| Website | Vercel (cloud) | ✅ Yes — stays online |
| 22 years of computed breadth history | Turso (cloud) | ✅ Yes — full copy |
| These scripts | GitHub (this folder) | ✅ Yes — backed up here |
| Raw daily price cache (`market_breadth.db`) | The collecting computer only | ❌ No — but it's disposable and re-downloadable |

The only thing tied to a specific computer is the daily *download* from NSE, because NSE
refuses connections from cloud/datacenter servers — it only accepts ordinary home
computers. So the collector must run on a home computer, but it can be *any* home
computer, not one specific Mac.

## Restore on a new / different computer — the easy way

1. Download this `collector` folder from GitHub onto the new Mac.
2. Double-click **`setup_new_mac.command`**. It installs the libraries, copies the
   scripts, asks for your Turso URL + token, installs the daily scheduler, and offers to
   rebuild history. That's the whole migration.

If you'd rather do it by hand, follow the manual steps below.

## Restore manually

1. Install Python 3, then the libraries:
   ```bash
   pip3 install pandas numpy openpyxl libsql-client
   ```
2. Make a folder and copy these four files into it:
   ```bash
   mkdir -p ~/MarketBreadth && cd ~/MarketBreadth
   # copy market_breadth_collector.py, push_to_cloud.py, run_daily.sh,
   # com.breadth.daily.plist from this GitHub folder into here
   ```
3. Create the `.turso_env` file with your Turso credentials (regenerate the token if the
   old one was ever exposed — `turso db tokens create market-breadth`):
   ```bash
   cat > .turso_env <<'EOF'
   TURSO_DATABASE_URL=libsql://market-breadth-adilaman-codes.aws-eu-west-1.turso.io
   TURSO_AUTH_TOKEN=your-token-here
   EOF
   ```
4. Rebuild the local price cache from scratch (one-time, ~1–2 hrs) OR just start fresh
   from today. To rebuild history:
   ```bash
   python3 market_breadth_collector.py --setup
   python3 push_to_cloud.py --full
   ```
   To just resume daily collection without rebuilding history, skip straight to step 5 —
   the computed history already in Turso is untouched.
5. Re-install the daily 4 PM IST scheduler:
   ```bash
   # edit paths/username in com.breadth.daily.plist first if the username differs
   cp com.breadth.daily.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.breadth.daily.plist
   ```

That's it — daily collection resumes and the website keeps showing the full history.

## Manual update any time

Run today's collection and push immediately:
```bash
cd ~/MarketBreadth
python3 market_breadth_collector.py --today
python3 push_to_cloud.py
```
