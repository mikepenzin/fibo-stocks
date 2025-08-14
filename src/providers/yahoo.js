import yahooFinance from 'yahoo-finance2';

export async function fetchDailyOHLCV(ticker, { range='6mo', interval='1d' } = {}) {
  // Calculate period1 and period2 for the API
  const period2 = new Date();
  const period1 = new Date();
  
  // More precise date calculation to match expected behavior
  if (range === '1d') {
    period1.setDate(period1.getDate() - 1);
  } else if (range === '5d') {
    period1.setDate(period1.getDate() - 5);
  } else if (range === '3mo') {
    period1.setMonth(period1.getMonth() - 3);
  } else if (range === '6mo') {
    period1.setMonth(period1.getMonth() - 6);
  } else if (range === '1y') {
    period1.setFullYear(period1.getFullYear() - 1);
  } else if (range === '2y') {
    period1.setFullYear(period1.getFullYear() - 2);
  }
  
  const result = await yahooFinance.chart(ticker, { 
    period1: Math.floor(period1.getTime() / 1000), // Unix timestamp in seconds
    period2: Math.floor(period2.getTime() / 1000), // Unix timestamp in seconds
    interval 
  });
  const quotes = result?.quotes ?? [];
  return quotes.map(q => ({
    date: q.date ? new Date(q.date).toISOString() : null,
    t: q.date ? Math.floor(new Date(q.date).getTime() / 1000) : null, // Add timestamp for chart labels
    o: Number(q.open), h: Number(q.high), l: Number(q.low), c: Number(q.close), v: Number(q.volume)
  })).filter(r => Number.isFinite(r.c) && Number.isFinite(r.h) && Number.isFinite(r.l));
}

export async function fetchTickerInfo(ticker) {
  try {
    const res = await yahooFinance.quoteSummary(ticker, { modules: ['price', 'summaryProfile'] });
    return {
      companyName: res?.summaryProfile?.longName || res?.price?.longName || ticker,
      previousClose: res?.price?.regularMarketPreviousClose || null
    };
  } catch (e) {
    console.warn(`Could not fetch ticker info for ${ticker}:`, e.message);
    return {
      companyName: ticker,
      previousClose: null
    };
  }
}

export async function fetchNextEarnings(ticker) {
  try {
    const res = await yahooFinance.quoteSummary(ticker, { modules: ['calendarEvents'] });
    const d = res?.calendarEvents?.earnings?.earningsDate?.[0];
    if (d) return new Date(d).toISOString().slice(0,10);
  } catch (e) {
    // ignore
  }
  return null;
}
