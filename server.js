import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { analyzeTicker } from './src/analyze.js';
import { backtestTicker } from './src/backtest.js';

// Bypass SSL certificate validation for development/corporate networks
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Symbol suggestions proxy (Yahoo Finance autocomplete)
app.get('/api/suggest', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toUpperCase();
    if (!q) return res.json({ ok: true, results: [] });
    
    // Fallback popular symbols for common searches
    const popularSymbols = [
      { symbol: 'AAPL', name: 'Apple Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'META', name: 'Meta Platforms Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'NFLX', name: 'Netflix Inc.', exch: 'NASDAQ', type: 'Stock' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exch: 'NYSE', type: 'ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', exch: 'NASDAQ', type: 'ETF' },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exch: 'NYSE', type: 'ETF' }
    ];
    
    try {
      // Try Yahoo Finance search API first
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
      
      const r = await fetch(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 3000
      });
      
      if (r.ok) {
        const data = await r.json();
        const quotes = data?.quotes ?? [];
        const results = [];
        
        for (const quote of quotes) {
          const symbol = String(quote.symbol || '').toUpperCase();
          if (!symbol) continue;
          
          const type = quote.quoteType || quote.typeDisp || 'Stock';
          const name = quote.longname || quote.shortname || '';
          const exch = quote.exchange || quote.exchDisp || '';
          
          results.push({ symbol, name, exch, type });
          if (results.length >= 12) break;
        }
        
        if (results.length > 0) {
          return res.json({ ok: true, results });
        }
      }
    } catch (apiError) {
      console.log('Yahoo API failed, using fallback:', apiError.message);
    }
    
    // Fallback: filter popular symbols by query
    const filtered = popularSymbols.filter(item => 
      item.symbol.includes(q) || item.name.toUpperCase().includes(q)
    ).slice(0, 8);
    
    return res.json({ ok: true, results: filtered });
    
  } catch (e) {
    console.error('Suggest API error:', e.message);
    res.status(500).json({ ok: false, error: 'Search temporarily unavailable' });
  }
});

// API endpoint
app.get('/api/analyze/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { range = '1d', mabasis = '20-50' } = req.query; // Default to 1d and MA20/50
    console.log(`Analyzing ${ticker} with range ${range} and mabasis ${mabasis}`);
    const data = await analyzeTicker(ticker.toUpperCase(), range, { mabasis });
    res.json({ ok: true, ...data });
  } catch (err) {
    console.error('Analysis error:', err);
    const errorMsg = err.message || 'Failed to analyze ticker';
    res.status(500).json({ ok: false, error: errorMsg });
  }
});

// Backtest endpoint
app.get('/api/backtest/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { range = '1d', mabasis = '20-50' } = req.query;
    const data = await backtestTicker(ticker.toUpperCase(), range, { mabasis });
    res.json({ ok: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
