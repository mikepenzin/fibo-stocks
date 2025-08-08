import yahooFinance from 'yahoo-finance2';

export async function fetchDailyOHLCV(ticker, { range='6mo', interval='1d' } = {}) {
  // Calculate period1 (6 months ago) and period2 (today) for the API
  const period2 = new Date();
  const period1 = new Date();
  
  // More precise date calculation to match expected behavior
  if (range === '6mo') {
    period1.setMonth(period1.getMonth() - 6);
  } else if (range === '1y') {
    period1.setFullYear(period1.getFullYear() - 1);
  } else if (range === '2y') {
    period1.setFullYear(period1.getFullYear() - 2);
  } else if (range === '3mo') {
    period1.setMonth(period1.getMonth() - 3);
  }
  
  const result = await yahooFinance.chart(ticker, { 
    period1: Math.floor(period1.getTime() / 1000), // Unix timestamp in seconds
    period2: Math.floor(period2.getTime() / 1000), // Unix timestamp in seconds
    interval 
  });
  const quotes = result?.quotes ?? [];
  return quotes.map(q => ({
    date: q.date ? new Date(q.date).toISOString() : null,
    o: Number(q.open), h: Number(q.high), l: Number(q.low), c: Number(q.close), v: Number(q.volume)
  })).filter(r => Number.isFinite(r.c) && Number.isFinite(r.h) && Number.isFinite(r.l));
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
