import { fetchDailyOHLCV } from './providers/yahoo.js';
import { computeMetrics } from './indicators.js';

// Enhanced fibonacci retracement backtest with advanced performance metrics
export async function backtestTicker(ticker, range='1d', opts={}) {
  const { yahooRange, yahooInterval } = mapRange(range);
  const candles = await fetchDailyOHLCV(ticker, { range: yahooRange, interval: yahooInterval });
  if (candles.length < 120) throw new Error('Not enough data');

  const lookAhead = 15;          // bars to evaluate after signal
  const swingWindow = 20;        // window for swing pivots
  let setups = 0, wins = 0, losses = 0, shorts = 0, longs = 0, noExit = 0;
  const samples = [];
  let lastSwingKey = '';

  // Advanced tracking
  let barsWinTotal = 0, barsLossTotal = 0, winTrades = 0, lossTrades = 0;
  let equity = 0; // cumulative R
  let maxEquity = 0; let maxDrawdown = 0; // in R
  const equityCurve = [];

  for (let i = swingWindow; i < candles.length - lookAhead; i++) {
    const slice = candles.slice(0, i+1); // data up to current bar (no lookahead)
    const metrics = computeMetrics(slice, null, opts);
    const direction = metrics.trend === 'Uptrend' ? 'LONG' : metrics.trend === 'Downtrend' ? 'SHORT' : null;
    if (!direction) continue;

    const swing = direction === 'LONG' ? findUpSwing(slice, swingWindow) : findDownSwing(slice, swingWindow);
    if (!swing) continue;
    const { low, high } = swing;
    if (!(Number.isFinite(low) && Number.isFinite(high) && high > low)) continue;

    const swingKey = `${direction}:${low.toFixed(4)}-${high.toFixed(4)}`;
    if (swingKey === lastSwingKey) continue; // avoid duplicate swing processing

    const fib = fibLevels(low, high);
    let entry, target, stop;
    if (direction === 'LONG') {
      entry = fib['50%']; target = fib['38.2%']; stop = fib['61.8%'];
      if (!(low < stop && stop < entry && entry < target && target < high)) continue;
    } else { // SHORT
      entry = fib['50%']; target = fib['61.8%']; stop = fib['38.2%'];
      if (!(low < target && target < entry && entry < stop && stop < high)) continue;
    }

    let entered = false; let outcome = null; let barsHeld = 0; let entryBarIdx = null;
    for (let j=0;j<lookAhead;j++) {
      const bar = candles[i + j]; if (!bar) break;
      if (!entered) {
        if (bar.l <= entry && bar.h >= entry) { entered = true; entryBarIdx = i + j; }
      } else {
        barsHeld = (i + j) - entryBarIdx;
        if (direction === 'LONG') {
          if (bar.l <= stop) { outcome='LOSS'; break; }
          if (bar.h >= target) { outcome='WIN'; break; }
        } else {
          if (bar.h >= stop) { outcome='LOSS'; break; }
          if (bar.l <= target) { outcome='WIN'; break; }
        }
      }
    }
    if (!entered) continue; // no fill

    // Swing consumed
    lastSwingKey = swingKey;
    setups++;
    if (direction === 'LONG') longs++; else shorts++;
    if (!outcome) { outcome='NO_EXIT'; noExit++; }

    // Update stats only for resolved trades (exclude NO_EXIT from expectancy by default)
    if (outcome === 'WIN') { wins++; winTrades++; barsWinTotal += barsHeld; equity += 1; }
    else if (outcome === 'LOSS') { losses++; lossTrades++; barsLossTotal += barsHeld; equity -= 1; }

    // Equity / drawdown tracking (only when resolved)
    if (outcome === 'WIN' || outcome === 'LOSS') {
      if (equity > maxEquity) maxEquity = equity;
      const dd = maxEquity - equity; if (dd > maxDrawdown) maxDrawdown = dd;
      equityCurve.push(equity);
    }

    if (samples.length < 12) {
      const barDate = candles[i].date?.slice(0,10);
      samples.push({ date: barDate, entry, target, stop, outcome, side: direction, bars: barsHeld });
    }
  }

  const completed = wins + losses;
  const winRate = setups ? (wins / setups) * 100 : 0; // based on all setups (including potential NO_EXIT exclusion)
  const resolvedWinRate = completed ? (wins / completed) * 100 : 0; // only resolved
  const expectancy = completed ? (wins - losses) / completed : 0; // R per trade (1:1 reward/risk)
  const profitFactor = losses ? (wins / losses) : (wins > 0 ? Infinity : 0);
  const avgBarsWin = winTrades ? (barsWinTotal / winTrades) : 0;
  const avgBarsLoss = lossTrades ? (barsLossTotal / lossTrades) : 0;

  return {
    ticker,
    range,
    stats: {
      setups,
      wins,
      losses,
      noExit,
      winRate: Number(winRate.toFixed(2)),
      resolvedWinRate: Number(resolvedWinRate.toFixed(2)),
      longs, shorts,
      expectancy: Number(expectancy.toFixed(3)),
      profitFactor: Number(isFinite(profitFactor)?profitFactor.toFixed(2):profitFactor),
      avgBarsWin: Number(avgBarsWin.toFixed(2)),
      avgBarsLoss: Number(avgBarsLoss.toFixed(2)),
      maxDrawdownR: Number(maxDrawdown.toFixed(2)),
      finalR: Number(equity.toFixed(2)),
      tradesCompleted: completed,
      ma_basis: opts.mabasis || '20-50'
    },
    samples,
    equityCurve // kept if needed for future visualization
  };
}

// Find upswing: lowest low then highest high AFTER that low within window
function findUpSwing(candles, window){
  const len = candles.length; if (len < window+2) return null;
  const start = Math.max(0, len - window);
  let loIdx = start;
  for (let i=start+1;i<len;i++) if (candles[i].l < candles[loIdx].l) loIdx = i;
  // find high after low
  let hiIdx = loIdx; for (let i=loIdx+1;i<len;i++) if (candles[i].h > candles[hiIdx].h) hiIdx=i;
  if (hiIdx === loIdx) return null;
  const low = candles[loIdx].l, high = candles[hiIdx].h;
  return { low, high };
}

// Find downswing: highest high then lowest low AFTER that high within window
function findDownSwing(candles, window){
  const len = candles.length; if (len < window+2) return null;
  const start = Math.max(0, len - window);
  let hiIdx = start;
  for (let i=start+1;i<len;i++) if (candles[i].h > candles[hiIdx].h) hiIdx = i;
  // find low after high
  let loIdx = hiIdx; for (let i=hiIdx+1;i<len;i++) if (candles[i].l < candles[loIdx].l) loIdx=i;
  if (loIdx === hiIdx) return null;
  const low = candles[loIdx].l, high = candles[hiIdx].h;
  return { low, high };
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
