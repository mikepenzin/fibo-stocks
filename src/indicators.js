import { RSI, CCI, ATR, SMA } from 'technicalindicators';

export function computeMetrics(candles, nextEarningsISO) {
  const close = candles.map(r => r.c);
  const high  = candles.map(r => r.h);
  const low   = candles.map(r => r.l);
  const vol   = candles.map(r => r.v);

  const rsiArr = RSI.calculate({ period: 14, values: close });
  const cciArr = CCI.calculate({ period: 14, high, low, close });
  const atrArr = ATR.calculate({ period: 14, high, low, close });

  const sma50Arr = SMA.calculate({ period: 50, values: close });
  const sma200Arr = SMA.calculate({ period: 200, values: close });

  const lastClose = close[close.length - 1];
  const rsi = rsiArr[rsiArr.length - 1];
  const cci = cciArr[cciArr.length - 1];
  const atr = atrArr[atrArr.length - 1];

  // Align SMA results (they start after N-1 bars)
  const sma50 = sma50Arr[sma50Arr.length - 1];
  const sma200 = sma200Arr[sma200Arr.length - 1];

  const atr_pct = (atr / lastClose) * 100;

  // Volume delta vs 20d
  const smaVol20 = SMA.calculate({ period: 20, values: vol });
  const volMA = smaVol20[smaVol20.length - 1];
  const vol_delta = ((vol[vol.length - 1] - volMA) / volMA) * 100;

  let trend = 'Sideways', trend_emoji = '🟡';
  if (lastClose > sma50 && sma50 > sma200) { 
    trend = 'Uptrend'; trend_emoji = '🟢'; 
  } else if (lastClose < sma50 && sma50 < sma200) { 
    trend = 'Downtrend'; trend_emoji = '🔴'; 
  } else if (sma50 < sma200) {
    // If SMA50 is below SMA200, consider it bearish even if price is slightly above SMA50
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
    vol_delta: round(vol_delta,1),
    trend, trend_emoji,
    earnings_str
  };
}

function round(x, d=2){ return Number.isFinite(x) ? Number(x.toFixed(d)) : null; }
