// Technical analysis calculations
function computeOBV(candles){
  let obv=[]; let cur=0; 
  for(let i=0;i<candles.length;i++){ 
    if(i>0){ 
      const prev=candles[i-1]; 
      const c=candles[i]; 
      if(c.c>prev.c) cur+=c.v; 
      else if(c.c<prev.c) cur-=c.v; 
    } 
    obv.push(cur);
  } 
  return obv; 
}

function computeMFI(candles, period=14){
  const tp = candles.map(c=>(c.h+c.l+c.c)/3);
  const mf = tp.map((t,i)=> t * candles[i].v);
  let mfi=[]; 
  for(let i=0;i<candles.length;i++){ 
    if(i<period) { mfi.push(null); continue; } 
    let pos=0,neg=0; 
    for(let j=i-period+1;j<=i;j++){ 
      if(tp[j]>tp[j-1]) pos+=mf[j]; 
      else if(tp[j]<tp[j-1]) neg+=mf[j]; 
    }
    const ratio = neg===0?100: pos===0?0: 100 - (100/(1+ (pos/neg)));
    mfi.push(ratio); 
  }
  return mfi; 
}

function computeCMF(candles, period=20){
  let cmf=[]; 
  for(let i=0;i<candles.length;i++){ 
    if(i<period){ cmf.push(null); continue; }
    let mfvSum=0, volSum=0; 
    for(let j=i-period+1;j<=i;j++){ 
      const c=candles[j]; 
      const hl = c.h - c.l || 1e-9; 
      const mfm = ((c.c - c.l) - (c.h - c.c)) / hl; 
      const mfv = mfm * c.v; 
      mfvSum += mfv; 
      volSum += c.v; 
    }
    cmf.push(mfvSum / volSum); 
  }
  return cmf; 
}

function computeSRLevels(candles, opts={}) {
  if(!candles || candles.length < 20) return [];
  const rangeSel = document.getElementById('range')?.value || '1d';
  // Use deeper history for better S/R derivation
  let histBars;
  if (rangeSel === '5m') histBars = 600;           // ~2 trading days
  else if (rangeSel === '15m') histBars = 900;      // ~2+ weeks intraday
  else if (rangeSel === '1h') histBars = 900;       // ~5-6 weeks
  else if (rangeSel === '1d') histBars = 260;       // ~1 trading year
  else histBars = 400;                              // weekly ~7+ years max fallback
  const src = candles.slice(-histBars);

  // Dynamic pivot width relative to dataset length
  const n = src.length;
  const baseWin = rangeSel==='1d' ? 3 : 2; // smaller on intraday
  const pivotLeft = Math.max(baseWin, Math.floor(n/120));
  const pivotRight = pivotLeft; // symmetric window

  // Collect raw pivot points
  const pivots = [];
  for (let i=pivotLeft; i < n - pivotRight; i++) {
    let isHigh = true, isLow = true;
    const c = src[i];
    for (let k=1;k<=pivotLeft;k++) {
      if (src[i-k].h > c.h || src[i+k].h > c.h) isHigh = false;
      if (src[i-k].l < c.l || src[i+k].l < c.l) isLow = false;
      if(!isHigh && !isLow) break;
    }
    if (isHigh) pivots.push({price:c.h, type:'resistance', vol:c.v||0, idx:i});
    if (isLow) pivots.push({price:c.l, type:'support', vol:c.v||0, idx:i});
  }
  if(!pivots.length) return [];

  // Initial merge tolerance (% of price). Tighter than before for finer clustering.
  const pricesAll = pivots.map(p=>p.price);
  const minP = Math.min(...pricesAll), maxP = Math.max(...pricesAll);
  const priceRange = maxP - minP || 1;
  const tolPct = 0.004; // 0.4%
  const tolerance = priceRange * tolPct;

  // Sort by price then merge close pivots into clusters
  pivots.sort((a,b)=>a.price-b.price);
  const clusters = [];
  for (const p of pivots) {
    let found = clusters.find(cl => Math.abs(cl.center - p.price) <= tolerance);
    if (found) {
      found.points.push(p);
      // weighted center by touches (point count) and volume
      const wOld = found.points.length - 1;
      const wNew = 1;
      found.center = (found.center * wOld + p.price * wNew)/(wOld + wNew);
      if (p.type==='support') found.supportCount++; else found.resCount++;
      found.totalVol += p.vol || 0;
      found.lastIdx = Math.max(found.lastIdx, p.idx);
      found.firstIdx = Math.min(found.firstIdx, p.idx);
    } else {
      clusters.push({
        center: p.price,
        points: [p],
        supportCount: p.type==='support'?1:0,
        resCount: p.type==='resistance'?1:0,
        totalVol: p.vol||0,
        firstIdx: p.idx,
        lastIdx: p.idx
      });
    }
  }

  // Score clusters: touches + volume weight + recency weight + balance bonus
  const lastIndex = n-1;
  const lastClose = src[n-1].c; // Get current price for comparison
  
  clusters.forEach(cl => {
    const touches = cl.points.length;
    const volNorm = cl.totalVol / (1 + Math.max(...clusters.map(c=>c.totalVol))) * 2; // 0..2
    const recency = 1 - (lastIndex - cl.lastIdx)/ (lastIndex || 1); // 0 recent ..1 very recent
    const balance = (cl.supportCount>0 && cl.resCount>0) ? 1 : 0; // acted as both sides
    cl.score = touches * 2 + volNorm + recency * 1.5 + balance * 1.2;
  });

  // Deduplicate overlapping high-score clusters enforcing minimum spacing
  clusters.sort((a,b)=> b.score - a.score);
  const final = [];
  const minSpacing = priceRange * 0.018; // 1.8% spacing
  
  // Ensure balanced representation: get best resistance and support levels
  const maxLevels = opts.maxLevels || 8; // Increase limit slightly
  const resistanceClusters = clusters.filter(cl => cl.center > lastClose);
  const supportClusters = clusters.filter(cl => cl.center < lastClose);
  
  // Add top resistance levels (max 4-5)
  let addedCount = 0;
  for (const cl of resistanceClusters) {
    if (final.some(f=> Math.abs(f.level - cl.center) < minSpacing)) continue;
    
    final.push({
      level: cl.center,
      touches: cl.points.length,
      score: +cl.score.toFixed(3),
      type: 'resistance'
    });
    addedCount++;
    if (addedCount >= 4) break; // Limit resistance levels to make room for support
  }
  
  // Add top support levels (ensure at least 2 if they exist)
  for (const cl of supportClusters) {
    if (final.some(f=> Math.abs(f.level - cl.center) < minSpacing)) continue;
    
    final.push({
      level: cl.center,
      touches: cl.points.length,
      score: +cl.score.toFixed(3),
      type: 'support'
    });
    addedCount++;
    if (addedCount >= maxLevels) break;
  }

  // Ensure we include a level near current price if none within 1% (helps match examples)
  if(!final.some(l => Math.abs(l.level - lastClose)/lastClose < 0.01)) {
    final.push({level:lastClose, touches:1, score:0.5, type:'price'});
  }
  // Sort descending for drawing (top to bottom visually optional)
  const result = final.sort((a,b)=> b.level - a.level);
  return result;
}
