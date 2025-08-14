import { fetchDailyOHLCV, fetchNextEarnings, fetchTickerInfo } from './providers/yahoo.js';
import { computeMetrics } from './indicators.js';
import { buildPlan } from './plan.js';

export async function analyzeTicker(ticker, range = '1d', opts={}) {
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
  
  // Fetch candles and company info in parallel
  const [candles, tickerInfo, nextEarnings] = await Promise.all([
    fetchDailyOHLCV(ticker, { range: yahooRange, interval: yahooInterval }),
    fetchTickerInfo(ticker),
    fetchNextEarnings(ticker)
  ]);
  
  if (!candles.length) throw new Error('No data for ticker');
  
  // Calculate price change from previous close
  const currentPrice = candles[candles.length - 1].c;
  let priceChange = null;
  let priceChangePercent = null;
  
  if (tickerInfo.previousClose && tickerInfo.previousClose > 0) {
    priceChange = currentPrice - tickerInfo.previousClose;
    priceChangePercent = (priceChange / tickerInfo.previousClose) * 100;
  } else if (candles.length >= 2) {
    // Fallback: use previous candle's close
    const prevClose = candles[candles.length - 2].c;
    priceChange = currentPrice - prevClose;
    priceChangePercent = (priceChange / prevClose) * 100;
  }
  
  const metrics = computeMetrics(candles, nextEarnings, opts);
  const plan = buildPlan(candles, metrics);
  
  return { 
    ticker, 
    timeframe: range.toUpperCase(), 
    metrics, 
    plan, 
    candles,
    companyName: tickerInfo.companyName,
    priceChange,
    priceChangePercent
  };
}
