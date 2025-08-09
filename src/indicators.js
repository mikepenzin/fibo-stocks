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
    last_close: lastClose, // expose current price for UI table
    rsi: round(rsi), cci: round(cci), atr: round(atr), atr_pct: round(atr_pct),
    vol_delta: round(vol_delta,1),
    trend, trend_emoji,
    earnings_str,
    ma_basis: useAlt ? '50/150' : '20/50'
  };
}

function round(x, d=2){ return Number.isFinite(x) ? Number(x.toFixed(d)) : null; }
