import { RSI, CCI, ATR, SMA } from 'technicalindicators';

export function computeMetrics(candles, nextEarningsISO, opts={}) {
  const basis = (opts.mabasis||'20-50').toLowerCase();
  const useAlt = basis === '50-150';
  const fastPeriod = useAlt ? 50 : 20;
  const slowPeriod = useAlt ? 150 : 50;

  const close = candles.map(r => r.c);
  const high  = candles.map(r => r.h);
  const low   = candles.map(r => r.l);
  const vol   = candles.map(r => r.v);

  const rsiArr = RSI.calculate({ period: 14, values: close });
  const cciArr = CCI.calculate({ period: 14, high, low, close });
  const atrArr = ATR.calculate({ period: 14, high, low, close });

  const fastArr = SMA.calculate({ period: fastPeriod, values: close });
  const slowArr = SMA.calculate({ period: slowPeriod, values: close });

  const lastClose = close[close.length - 1];
  const rsi = rsiArr[rsiArr.length - 1];
  const cci = cciArr[cciArr.length - 1];
  const atr = atrArr[atrArr.length - 1];

  const fast = fastArr[fastArr.length - 1];
  const slow = slowArr[slowArr.length - 1];

  const atr_pct = (atr / lastClose) * 100;

  const smaVol20 = SMA.calculate({ period: 20, values: vol });
  const volMA = smaVol20[smaVol20.length - 1];
  const vol_delta = ((vol[vol.length - 1] - volMA) / volMA) * 100;

  // Relative Volume Speed - compare current session volume to average for same time period
  let rel_vol_speed = 0;
  let session_volume = 0;
  let avg_session_volume = 0;
  
  // For intraday data, calculate volume pace relative to same time of day
  if (candles.length >= 20) {
    // Get today's accumulated volume (sum all bars from today)
    let todayVolume = 0;
    let barsIntoDay = 0;
    
    // For intraday: count bars from start of current trading day
    const lastCandle = candles[candles.length - 1];
    const lastTime = new Date(lastCandle.date || lastCandle.t * 1000);
    
    // Find start of current trading day (9:30 AM ET typically)
    const todayStart = new Date(lastTime);
    todayStart.setHours(9, 30, 0, 0); // 9:30 AM
    
    // Sum volume for current day's bars
    for (let i = candles.length - 1; i >= 0; i--) {
      const candleTime = new Date(candles[i].date || candles[i].t * 1000);
      if (candleTime >= todayStart) {
        todayVolume += candles[i].v;
        barsIntoDay++;
      } else {
        break;
      }
    }
    
    session_volume = todayVolume;
    
    // Calculate average volume for same number of bars from previous days
    if (barsIntoDay > 0 && candles.length >= barsIntoDay + 10) {
      let historicalSamples = [];
      
      // Look at previous 10-20 trading days for same time period
      for (let dayOffset = barsIntoDay; dayOffset < Math.min(candles.length, barsIntoDay + 200); dayOffset += barsIntoDay) {
        let dayVolume = 0;
        let validBars = 0;
        
        // Sum volume for same number of bars as current day
        for (let j = 0; j < barsIntoDay && (dayOffset + j) < candles.length; j++) {
          const idx = candles.length - 1 - dayOffset - j;
          if (idx >= 0) {
            dayVolume += candles[idx].v;
            validBars++;
          }
        }
        
        if (validBars === barsIntoDay) {
          historicalSamples.push(dayVolume);
        }
      }
      
      // Calculate average of historical samples
      if (historicalSamples.length >= 5) {
        avg_session_volume = historicalSamples.reduce((a, b) => a + b, 0) / historicalSamples.length;
        if (avg_session_volume > 0) {
          rel_vol_speed = ((todayVolume - avg_session_volume) / avg_session_volume) * 100;
        }
      }
    }
  }

  // MACD Calculation (12, 26, 9) - Standard implementation
  const ema12 = calculateEMA(close, 12);
  const ema26 = calculateEMA(close, 26);
  
  // MACD line starts only when both EMAs are available (after 26 periods)
  const macdLine = [];
  for (let i = 0; i < close.length; i++) {
    if (i >= 25 && ema12[i] !== undefined && ema26[i] !== undefined) { // 26 periods = index 25
      macdLine.push(ema12[i] - ema26[i]);
    } else {
      macdLine.push(null);
    }
  }
  
  // Signal line = EMA9 of valid MACD values
  const validMacdValues = macdLine.filter(v => v !== null);
  const signalEma = calculateEMA(validMacdValues, 9);
  
  // Map signal values back to full array
  const signalLine = [];
  let signalIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signalLine.push(signalEma[signalIndex] || null);
      signalIndex++;
    } else {
      signalLine.push(null);
    }
  }
  
  // Histogram = MACD - Signal
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(macdLine[i] - signalLine[i]);
    } else {
      histogram.push(null);
    }
  }

  let trend = 'Sideways', trend_emoji = '🟡';
  if (lastClose > fast && fast > slow) {
    trend = 'Uptrend'; trend_emoji = '🟢';
  } else if (lastClose < fast && fast < slow) {
    trend = 'Downtrend'; trend_emoji = '🔴';
  } else if (fast > slow && lastClose >= fast * 0.995) {
    trend = 'Uptrend'; trend_emoji = '🟢';
  } else if (fast < slow && lastClose <= fast * 1.005) {
    trend = 'Downtrend'; trend_emoji = '🔴';
  }

  let earnings_str = 'n/a';
  if (nextEarningsISO) {
    const days = Math.round((new Date(nextEarningsISO) - new Date()) / 86400000);
    earnings_str = days >= 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
  }

  return {
    last_close: lastClose,
    rsi: round(rsi), cci: round(cci), atr: round(atr), atr_pct: round(atr_pct),
    vol_delta: round(vol_delta,1), rel_vol_speed: round(rel_vol_speed,1),
    session_volume: Math.round(session_volume), avg_session_volume: Math.round(avg_session_volume),
    trend, trend_emoji,
    earnings_str,
    ma_basis: useAlt ? '50/150' : '20/50',
    macd: { line: macdLine, signal: signalLine, histogram: histogram }
  };
}

function round(x, d=2){ return Number.isFinite(x) ? Number(x.toFixed(d)) : null; }

// Standard EMA calculation
function calculateEMA(values, period) {
  if (!values || values.length === 0) return [];
  
  const result = [];
  const smoothing = 2 / (period + 1);
  
  // Find first valid value
  let firstValidIndex = 0;
  while (firstValidIndex < values.length && 
         (values[firstValidIndex] === null || values[firstValidIndex] === undefined || isNaN(values[firstValidIndex]))) {
    firstValidIndex++;
  }
  
  if (firstValidIndex >= values.length) return result;
  
  // Fill initial nulls
  for (let i = 0; i < firstValidIndex + period - 1 && i < values.length; i++) {
    result[i] = undefined;
  }
  
  // Calculate SMA for first EMA value
  if (firstValidIndex + period - 1 < values.length) {
    let sum = 0;
    for (let i = firstValidIndex; i < firstValidIndex + period; i++) {
      sum += values[i];
    }
    result[firstValidIndex + period - 1] = sum / period;
  }
  
  // Calculate EMA for remaining values
  for (let i = firstValidIndex + period; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined && !isNaN(values[i])) {
      result[i] = (values[i] * smoothing) + (result[i - 1] * (1 - smoothing));
    } else {
      result[i] = undefined;
    }
  }
  
  return result;
}
