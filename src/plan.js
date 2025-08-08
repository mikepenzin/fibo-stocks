export function buildPlan(candles, metrics) {
  const high = candles.map(r=>r.h), low=candles.map(r=>r.l), close = candles.map(r=>r.c);
  
  // Try ATR-based approach instead of swing-based fibonacci
  const currentPrice = close[close.length - 1];
  const atrMultiplier = 1.5; // Common ATR multiplier for stops
  
  // Use metrics.atr which is already calculated
  const atrValue = metrics.atr || 1.0; // fallback if ATR not available
  
  const up = metrics.trend === 'Uptrend';
  const down = metrics.trend === 'Downtrend';

  let entry, sl, tp1, tp2, bias, stars;
  if (up) {
    entry = currentPrice - (atrValue * 0.5);
    sl = currentPrice - (atrValue * atrMultiplier); 
    tp1 = currentPrice + (atrValue * 0.5); 
    tp2 = currentPrice + (atrValue * 1.5);
    bias = 'Bullish'; stars = metrics.rsi < 70 ? '⭐⭐⭐' : '⭐⭐';
  } else if (down) {
    // Fine-tune for tighter levels like the bot
    entry = currentPrice - (atrValue * 0.2); // Closer to current price
    sl = currentPrice + (atrValue * 0.1); // Tighter stop
    tp1 = currentPrice - (atrValue * 0.3); // Closer target  
    tp2 = currentPrice - (atrValue * 0.5); // More conservative target
    bias = 'Bearish'; stars = metrics.rsi > 30 ? '⭐⭐⭐' : '⭐⭐';
  } else {
    // Fallback to original fibonacci approach for sideways
    const sw = lastSwing(high, low, 10);
    const fib = fibLevels(sw.low, sw.high);
    entry = fib['50%']; sl = fib['61.8%']; tp1 = fib['38.2%']; tp2 = fib['23.6%'];
    bias = 'Range'; stars = '⭐⭐';
  }
  
  // Keep fib calculation for display
  const sw = lastSwing(high, low, 10);
  const fib = fibLevels(sw.low, sw.high);
  
  return { entry: round(entry), sl: round(sl), tp1: round(tp1), tp2: round(tp2), bias, stars, fib: mapRound(fib) };
}

function lastSwing(high, low, window=20){
  // Try even more recent swing - last 10 days
  const start = Math.max(0, high.length - 10);
  let hi = start, lo = start;
  for (let i=start;i<high.length;i++){ if (high[i]>high[hi]) hi=i; if (low[i]<low[lo]) lo=i; }
  const H = high[hi], L = low[lo];
  return { low: Math.min(L,H), high: Math.max(L,H) };
}

function fibLevels(L,H){
  const s = H-L;
  return {
    '0%': H,
    '23.6%': H - 0.236*s,
    '38.2%': H - 0.382*s,
    '50%': H - 0.5*s,
    '61.8%': H - 0.618*s,
    '100%': L
  };
}

function round(x, d=2){ return Number.isFinite(x) ? Number(x.toFixed(d)) : null; }
function mapRound(obj){ const o={}; for(const k in obj) o[k]=round(obj[k]); return o; }
