# Stocks Analyzer

Express API + Bootstrap frontend. Fetches Yahoo Finance data server-side, computes RSI/CCI/ATR, SMA50/200 trend, volume delta, and auto Fib trade plan. Renders a quick OHLC+Fib canvas chart in the browser.

## Run locally
```bash
npm install
npm start
# open http://localhost:3000
```

## Deploy on Render.com
1. Push this folder to a GitHub repo.
2. Create a **Web Service** on Render, connect the repo.
3. Environment: Node 18+
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Hit your Render URL and you're good.

### Notes
- Earnings date is pulled via Yahoo quoteSummary; if missing, it's shown as `n/a`.
- Timeframe is fixed at **1D** over the last ~6 months. Easy to extend to more intervals.
- All logic is split into provider, indicators, and plan for clean extension.
