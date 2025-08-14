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
  
  // Use moderate history - enough to see major swings
  const src = candles.slice(-80); // ~2-3 months
  const n = src.length;
  
  if (n < 15) return [];
  
  // Find significant swing highs and lows with adaptive window
  const swings = [];
  
  // First pass: Find major swings with standard window
  const pivotWindow = 4;
  for (let i = pivotWindow; i < n - pivotWindow; i++) {
    const current = src[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    
    // Check if this is a clear swing high or low
    for (let j = 1; j <= pivotWindow; j++) {
      if (src[i-j].h >= current.h || src[i+j].h >= current.h) {
        isSwingHigh = false;
      }
      if (src[i-j].l <= current.l || src[i+j].l <= current.l) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) {
      swings.push({
        price: current.h,
        type: 'resistance',
        index: i,
        volume: current.v || 0,
        strength: 'normal'
      });
    }
    
    if (isSwingLow) {
      swings.push({
        price: current.l,
        type: 'support',
        index: i,
        volume: current.v || 0,
        strength: 'normal'
      });
    }
  }
  
  // Second pass: Find sharp spikes/rejections with smaller window
  const spikeWindow = 2;
  for (let i = spikeWindow; i < n - spikeWindow; i++) {
    const current = src[i];
    let isSharpHigh = true;
    let isSharpLow = true;
    
    // Check for sharp spikes - more sensitive detection
    for (let j = 1; j <= spikeWindow; j++) {
      if (src[i-j].h >= current.h || src[i+j].h >= current.h) {
        isSharpHigh = false;
      }
      if (src[i-j].l <= current.l || src[i+j].l <= current.l) {
        isSharpLow = false;
      }
    }
    
    // Only add if it's a significant spike (not already found in first pass)
    const alreadyFound = swings.some(s => Math.abs(s.index - i) <= 2);
    
    if (isSharpHigh && !alreadyFound) {
      // Check if it's a significant high compared to recent price action
      const recentHigh = Math.max(...src.slice(Math.max(0, i-10), i+10).map(c => c.h));
      if (current.h >= recentHigh * 0.95) { // Within 5% of recent high
        swings.push({
          price: current.h,
          type: 'resistance',
          index: i,
          volume: current.v || 0,
          strength: 'spike'
        });
      }
    }
    
    if (isSharpLow && !alreadyFound) {
      // Check if it's a significant low compared to recent price action
      const recentLow = Math.min(...src.slice(Math.max(0, i-10), i+10).map(c => c.l));
      if (current.l <= recentLow * 1.05) { // Within 5% of recent low
        swings.push({
          price: current.l,
          type: 'support',
          index: i,
          volume: current.v || 0,
          strength: 'spike'
        });
      }
    }
  }
  
  if (swings.length === 0) return [];
  
  // Group nearby swings (within 2% of each other) - increased tolerance
  const groups = [];
  const tolerance = 0.02; // 2% - wider grouping to prevent close levels
  
  swings.forEach(swing => {
    let foundGroup = false;
    
    for (let group of groups) {
      const groupAvg = group.reduce((sum, s) => sum + s.price, 0) / group.length;
      if (Math.abs(swing.price - groupAvg) / groupAvg <= tolerance) {
        group.push(swing);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([swing]);
    }
  });
  
  // Convert groups to S/R levels
  const currentPrice = src[n-1].c;
  const levels = [];
  
  groups.forEach(group => {
    const avgPrice = group.reduce((sum, s) => sum + s.price, 0) / group.length;
    const touches = group.length;
    const mostRecentIndex = Math.max(...group.map(s => s.index));
    const recency = mostRecentIndex / n; // 0 to 1
    
    // Check if group contains spikes (sharp rejections are important)
    const hasSpike = group.some(s => s.strength === 'spike');
    const spikeBonus = hasSpike ? 2 : 0;
    
    // Simple scoring: touches + recency weight + spike bonus
    const score = touches * 3 + recency * 2 + spikeBonus;
    
    // Determine type based on position relative to current price
    let type;
    if (avgPrice > currentPrice * 1.01) {
      type = 'resistance';
    } else if (avgPrice < currentPrice * 0.99) {
      type = 'support';
    } else {
      type = 'current'; // Near current price
    }
    
    levels.push({
      level: avgPrice,
      touches: touches,
      score: score,
      type: type,
      recency: recency,
      hasSpike: hasSpike
    });
  });
  
  // Sort by score and filter
  levels.sort((a, b) => b.score - a.score);
  
  // Get best resistance and support levels
  const resistanceLevels = levels.filter(l => l.type === 'resistance').slice(0, 3);
  const supportLevels = levels.filter(l => l.type === 'support').slice(0, 3);
  
  // Combine and ensure good spacing
  const finalLevels = [...resistanceLevels, ...supportLevels];
  const result = [];
  
  // Remove levels that are too close to each other
  finalLevels.forEach(level => {
    const tooClose = result.some(existing => {
      const priceDiff = Math.abs(existing.level - level.level) / existing.level;
      return priceDiff < 0.05; // 5% minimum spacing - increased from 3%
    });
    
    if (!tooClose) {
      result.push(level);
    }
  });
  
  return result.sort((a, b) => b.level - a.level); // Sort high to low correctly
}
