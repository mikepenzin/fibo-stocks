import { fetchDailyOHLCV, fetchNextEarnings } from './providers/yahoo.js';
import { computeMetrics } from './indicators.js';
import { buildPlan } from './plan.js';

export async function analyzeTicker(ticker, range = '1d') {
  // Map frontend range values to Yahoo Finance parameters
  let yahooRange, yahooInterval;
  
  switch(range) {
    case '5m':
      yahooRange = '1d';
      yahooInterval = '5m';
      break;
    case '15m':
      yahooRange = '5d';
      yahooInterval = '15m';
      break;
    case '1h':
      yahooRange = '5d';
      yahooInterval = '1h';
      break;
    case '1d':
      yahooRange = '1y';
      yahooInterval = '1d';
      break;
    case '1w':
      yahooRange = '2y';
      yahooInterval = '1wk';
      break;
    default:
      yahooRange = '1y';
      yahooInterval = '1d';
  }
  
  const candles = await fetchDailyOHLCV(ticker, { range: yahooRange, interval: yahooInterval });
  if (!candles.length) throw new Error('No data for ticker');
  
  const nextEarnings = await fetchNextEarnings(ticker); // may be null
  const metrics = computeMetrics(candles, nextEarnings);
  const plan = buildPlan(candles, metrics);
  
  return { ticker, timeframe: range.toUpperCase(), metrics, plan, candles };
}
