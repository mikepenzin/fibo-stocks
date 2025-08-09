import { fetchDailyOHLCV } from './providers/yahoo.js';
import { computeMetrics } from './indicators.js';

// Enhanced fibonacci retracement backtest using adaptive MA20-based swing and trend filter
export async function backtestTicker(ticker, range='1d') {
  const { yahooRange, yahooInterval } = mapRange(range);
  const candles = await fetchDailyOHLCV(ticker, { range: yahooRange, interval: yahooInterval });
  if (candles.length < 120) throw new Error('Not enough data');

  const lookAhead = 15;          // bars to evaluate after signal
  const swingLookback = 14;      // for adaptive swing
  let setups = 0, wins = 0, losses = 0, shorts = 0, longs = 0;
  const samples = [];

  // Pre-extract arrays for speed
  const highs = candles.map(c=>c.h);
  const lows = candles.map(c=>c.l);
  const closes = candles.map(c=>c.c);

  for (let i = 60; i < candles.length - lookAhead; i++) { // start after enough data for MAs
    const sliceHigh = highs.slice(0,i+1);
    const sliceLow = lows.slice(0,i+1);
    const sliceClose = closes.slice(0,i+1);

    // Metrics up to bar i
    const metrics = computeMetrics(candles.slice(0,i+1), null);
    const sw = adaptiveSwing(sliceHigh, sliceLow, sliceClose, swingLookback);
    if (!Number.isFinite(sw.high) || !Number.isFinite(sw.low) || sw.high <= sw.low) continue;

    const fib = fibLevels(sw.low, sw.high);

    let direction = null; // 'LONG' or 'SHORT'
    let entry, target, stop;
    if (metrics.trend === 'Uptrend') {
      // LONG: retrace to 50%, target 38.2, stop 61.8
      entry = fib['50%']; target = fib['38.2%']; stop = fib['61.8%']; direction = 'LONG';
      // validate ordering L < stop < entry < target < H
      if (!(sw.low < stop && stop < entry && entry < target && target < sw.high)) continue;
    } else if (metrics.trend === 'Downtrend') {
      // SHORT: retrace up to 50%, target 61.8, stop 38.2
      entry = fib['50%']; target = fib['61.8%']; stop = fib['38.2%']; direction = 'SHORT';
      // validate ordering H > stop > entry > target > L when inverted (using fib definitions descending)
      if (!(sw.high > stop && stop > entry && entry > target && target > sw.low)) continue;
    } else {
      continue; // skip sideways in backtest to focus on directional edge
    }

    // Look ahead for trigger + resolution
    let entered = false; let outcome = null;
    for (let j=0;j<lookAhead;j++) {
      const bar = candles[i + j];
      if (!entered) {
        if (bar.l <= entry && bar.h >= entry) { entered = true; continue; }
      } else {
        if (direction === 'LONG') {
          if (bar.l <= stop) { outcome='LOSS'; break; }
          if (bar.h >= target) { outcome='WIN'; break; }
        } else { // SHORT
          if (bar.h >= stop) { outcome='LOSS'; break; }
            if (bar.l <= target) { outcome='WIN'; break; }
        }
      }
    }
    if (!entered) continue;
    setups++;
    if (direction === 'LONG') longs++; else shorts++;
    if (!outcome) outcome = 'NO_EXIT';
    if (outcome === 'WIN') wins++; else if (outcome === 'LOSS') losses++;

    if (samples.length < 12) {
      const barDate = candles[i].date?.slice(0,10);
      samples.push({ date: barDate, entry, target, stop, outcome, side: direction });
    }
  }

  const winRate = setups ? (wins / setups) * 100 : 0;
  return {
    ticker,
    range,
    stats: { setups, wins, losses, noExit: setups - wins - losses, winRate: Number(winRate.toFixed(2)), longs, shorts },
    samples
  };
}

function adaptiveSwing(high, low, close, lookback=14){
  const len = close.length;
  const span = Math.min(len, lookback*3);
  const start = len - span;
  let hi = start, lo = start;
  for (let i=start+1;i<len;i++) { if (high[i] > high[hi]) hi=i; if (low[i] < low[lo]) lo=i; }
  const H = high[hi], L = low[lo];
  return { high: Math.max(H,L), low: Math.min(H,L) };
}

function fibLevels(L,H){
  const s = H-L; return { '0%': H, '23.6%': H - 0.236*s, '38.2%': H - 0.382*s, '50%': H - 0.5*s, '61.8%': H - 0.618*s, '100%': L };
}

function mapRange(range){
  switch(range){
    case '5m': return { yahooRange: '5d', yahooInterval: '5m' };
    case '15m': return { yahooRange: '1mo', yahooInterval: '15m' };
    case '1h': return { yahooRange: '1mo', yahooInterval: '1h' };
    case '1w': return { yahooRange: '2y', yahooInterval: '1wk' };
    case '1d':
    default: return { yahooRange: '1y', yahooInterval: '1d' };
  }
}
