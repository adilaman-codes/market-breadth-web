# Deploying the Market Breadth Website

This turns your local breadth data into a live website:
**a free Turso database** (holds the data online) + **Vercel** (hosts the site for free).

Your Mac keeps collecting data as it does now. After each daily run it also pushes the
latest numbers up to Turso, and the website reads from Turso — so the site updates itself.

```
  Your Mac (4 PM IST)                Cloud                     Anyone's browser
  ┌──────────────────┐   push    ┌──────────────┐   read    ┌──────────────────┐
  │ collector + push │ ────────▶ │  Turso  DB   │ ◀──────── │  Vercel website  │
  └──────────────────┘           └──────────────┘           └──────────────────┘
```

You only do Parts 1–3 once. After that it is fully automatic.

---

## Part 1 — Create the free Turso database  (~5 min)

1. Go to **https://turso.tech** and sign up (GitHub or email). The free "Starter" plan is
   plenty: 9 GB storage, 1 billion row-reads/month.
2. Install the Turso CLI on your Mac. Open **Terminal** and paste:

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

   Then close and reopen Terminal so the `turso` command is available.
3. Log in and create the database:

   ```bash
   turso auth login
   turso db create market-breadth
   ```
4. Get the two secrets the website and push script need:

   ```bash
   turso db show market-breadth --url
   turso db tokens create market-breadth
   ```

   - The first command prints the **database URL** (looks like `libsql://market-breadth-yourname.turso.io`).
   - The second prints a long **auth token**.

   Keep both handy for the next steps.

---

## Part 2 — Push your existing data to Turso  (one time)

On your Mac, in Terminal:

```bash
cd ~/MarketBreadth

# Install the tiny library that talks to Turso
pip3 install libsql-client

# Create the credentials file (replace with YOUR values from Part 1)
cat > .turso_env <<'EOF'
TURSO_DATABASE_URL=libsql://market-breadth-yourname.turso.io
TURSO_AUTH_TOKEN=paste-your-long-token-here
EOF

# Upload ALL history (run once; takes a few minutes)
python3 push_to_cloud.py --full
```

You should see it push ~5,800 breadth rows. From now on your daily job (`run_daily.sh`)
automatically runs `push_to_cloud.py` after collecting each day — no action needed.

> The `.turso_env` file holds a secret token. It stays only on your Mac. Don't share it.

---

## Part 3 — Put the website on Vercel  (~10 min)

The website lives in the `web/` folder. The easiest reliable path is GitHub → Vercel.

### 3a. Put the `web` folder on GitHub

1. Create a free account at **https://github.com** if you don't have one.
2. Create a new **empty** repository (e.g. `market-breadth-web`). Don't add a README.
3. In Terminal:

   ```bash
   cd ~/MarketBreadth/web
   git init
   git add .
   git commit -m "Market breadth website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/market-breadth-web.git
   git push -u origin main
   ```

   (`node_modules` and `.next` are ignored automatically, so only the source uploads.)

### 3b. Deploy on Vercel

1. Go to **https://vercel.com** and sign up with your GitHub account.
2. Click **Add New… → Project**, and **Import** the `market-breadth-web` repo.
3. Vercel auto-detects Next.js. Leave the defaults.
4. Before clicking Deploy, open **Environment Variables** and add the two from Part 1:

   | Name | Value |
   |------|-------|
   | `TURSO_DATABASE_URL` | `libsql://market-breadth-yourname.turso.io` |
   | `TURSO_AUTH_TOKEN` | your long token |

5. Click **Deploy**. In ~1 minute you'll get a public URL like
   `https://market-breadth-web.vercel.app`.

That's it — open the URL and you'll see the dashboard, data table, summary, and date
selectors, reading live from Turso.

### Alternative (no GitHub): Vercel CLI

```bash
cd ~/MarketBreadth/web
npm i -g vercel
vercel            # follow prompts; when asked, set the two env vars above
vercel --prod
```

---

## Daily updates — already wired up

`run_daily.sh` was updated to call `push_to_cloud.py` after each collection, so every
weekday at 4 PM IST your Mac refreshes Turso and the website shows the new day. Nothing
else to do.

To re-push manually any time:

```bash
cd ~/MarketBreadth && python3 push_to_cloud.py        # latest days
cd ~/MarketBreadth && python3 push_to_cloud.py --full # everything
```

---

## What's on the site

- **Summary** — a plain-English market read plus a 7-point bull/bear scorecard and KPI tiles.
- **Dashboard** — charts for Net Breadth, participation (% above 50/200-DEMA), Net New
  Highs−Lows, Nifty 50, breakouts vs breakdowns, and latest sector performance.
- **Data Table** — the full Excel-style grid, all 30+ metrics, colour-coded, sortable by date.
- **Date selectors** — quick presets (1M/3M/6M/1Y/YTD/All) and custom from/to dates.

---

## Troubleshooting

**Site says "database isn't reachable yet"** — the two environment variables aren't set on
Vercel, or the initial `--full` push hasn't run. Recheck Part 2 and the env vars in Part 3b,
then in Vercel click **Redeploy**.

**Data looks a day behind** — the site reads whatever is in Turso. Confirm your Mac ran the
daily job (check `~/MarketBreadth/run_daily.log` and `push_to_cloud.log`).

**Local preview before deploying** — in `web/`, copy `.env.local.example` to `.env.local`,
fill in the two values, then `npm install && npm run dev` and open http://localhost:3000.
