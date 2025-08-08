import { fetchDailyOHLCV, fetchNextEarnings } from './providers/yahoo.js';
import { computeMetrics } from './indicators.js';
import { buildPlan } from './plan.js';

export async function analyzeTicker(ticker) {
  // Get more data to ensure we have enough for SMA200 calculation
  const candles = await fetchDailyOHLCV(ticker, { range: '1y', interval: '1d' });
  if (!candles.length) throw new Error('No data for ticker');
  
  const nextEarnings = await fetchNextEarnings(ticker); // may be null
  const metrics = computeMetrics(candles, nextEarnings);
  const plan = buildPlan(candles, metrics);
  
  return { ticker, timeframe: '1D', metrics, plan, candles };
}
