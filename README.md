# Stocks Analyzer

Express API + Bootstrap frontend. Fetches Yahoo Finance data server-side, computes RSI/CCI/ATR, SMA50/200 trend, volume delta, and auto Fib trade plan. Renders a quick OHLC+Fib canvas chart in the browser.

## 🚀 Live Demo

**Try it now:** [https://fibo-stocks.onrender.com/](https://fibo-stocks.onrender.com/)

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

## How to Use

### Web Application
- Visit the [Live Demo](https://fibo-stocks.onrender.com/).
- Enter a stock ticker (e.g., `AAPL`, `MSFT`, `LLY`) in the input box.
- Select your preferred timeframe and moving average basis if available.
- Click **Analyze** to fetch and display the latest stock data, technical indicators, and chart.
- Use the action buttons to:
  - **Download as Image**: Save the chart and analysis as a PNG file.
  - **Copy Result to Clipboard**: Copy the chart image for sharing.
  - **Share Analysis**: Copy a shareable link to your clipboard.
- Review the info panel for price, trend, S/R levels, technical indicators, trade plan, and Fibonacci levels.

### Local Usage
- Start the app locally (see instructions above).
- Open [http://localhost:3000](http://localhost:3000) in your browser.
- Use the interface as described above.

### Sharing & Routing
- After analysis, use the **Share Analysis** button to copy a link with your selected stock and settings.
- Send the link to others; opening it will auto-load the same analysis.
