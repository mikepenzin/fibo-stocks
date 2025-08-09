export function buildPlan(candles, metrics) {
  const high = candles.map(r=>r.h), low=candles.map(r=>r.l), close = candles.map(r=>r.c);
  
  // ATR based core values
  const currentPrice = close[close.length - 1];
  const atrMultiplier = 1.5;
  const atrValue = metrics.atr || 1.0;

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
    entry = currentPrice - (atrValue * 0.2);
    sl = currentPrice + (atrValue * 0.1);
    tp1 = currentPrice - (atrValue * 0.3);
    tp2 = currentPrice - (atrValue * 0.5);
    bias = 'Bearish'; stars = metrics.rsi > 30 ? '⭐⭐⭐' : '⭐⭐';
  } else {
    // Neutral: use refined fibonacci defined by adaptive swing around MA20 band
    const sw = adaptiveSwing(high, low, close, 14);
    const fib = fibLevels(sw.low, sw.high);
    entry = fib['50%']; sl = fib['61.8%']; tp1 = fib['38.2%']; tp2 = fib['23.6%'];
    bias = 'Range'; stars = '⭐⭐';
  }

  // Always compute fib for display using adaptive swing (better than naive last 10)
  const sw = adaptiveSwing(high, low, close, 14);
  const fib = fibLevels(sw.low, sw.high);

  return { entry: round(entry), sl: round(sl), tp1: round(tp1), tp2: round(tp2), bias, stars, fib: mapRound(fib) };
}

function adaptiveSwing(high, low, close, lookback=14){
  const start = Math.max(0, close.length - lookback*3);
  const highs = high.slice(start), lows = low.slice(start), closes = close.slice(start);
  // Midline: simple MA20 within the slice (fallback: average of closes)
  const maWindow = Math.min(20, closes.length);
  const ma20 = closes.slice(-maWindow).reduce((a,b)=>a+b,0)/maWindow;

  // Partition above/below ma20 to find recent directional leg
  let hiIdx = highs.length-1, loIdx = lows.length-1;
  for(let i=highs.length-2;i>=0;i--){
    if (highs[i] > highs[hiIdx]) hiIdx = i;
    if (lows[i] < lows[loIdx]) loIdx = i;
  }
  // Choose ordering based on which extreme is most recent relative to trend bias
  const absoluteHi = highs[hiIdx];
  const absoluteLo = lows[loIdx];
  let swingHigh, swingLow;
  if (absoluteHi - ma20 > ma20 - absoluteLo) {
    swingHigh = absoluteHi; swingLow = absoluteLo; // wider up range
  } else {
    swingHigh = absoluteHi; swingLow = absoluteLo;
  }
  return { high: swingHigh, low: swingLow };
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
