// Main analysis and data management
let lastTicker = '';
let lastCandles = null; // store latest candles
let lastFib = null;     // store latest fib levels
let lastSRLevels = null; // store latest S/R levels
let lastMetrics = null; // optional meta

async function analyze(ticker){
  clearBacktest(); // hide old backtest while loading new ticker
  $('#alert').classList.add('d-none');
  $('#spin').classList.remove('d-none');
  
  // Hide action buttons while loading
  const actionButtons = document.getElementById('actionButtons');
  if (actionButtons) actionButtons.classList.add('d-none');
  
  try{
    const range = document.getElementById('range').value;
    const maBasis = document.getElementById('maBasis')?.value || '20-50';
    const r = await fetch(`/api/analyze/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&mabasis=${maBasis}`);
    const j = await r.json();
    if(!j.ok) throw new Error(j.error||'API error');

    const { metrics, plan, candles } = j;
    lastTicker = ticker;
    
    // Update URL with current analysis parameters for sharing
    updateAnalysisURL(ticker, range, maBasis);
    
    lastMetrics = metrics;
    lastCandles = candles.slice(-140);
    lastFib = plan.fib;
    
    // Calculate S/R levels early so both info table and chart can use them
    lastSRLevels = computeSRLevels(candles);
    
    $('#panel').classList.remove('d-none');
    
    // Show action buttons now that we have stock data
    const actionButtons = document.getElementById('actionButtons');
    if (actionButtons) actionButtons.classList.remove('d-none');
    
    $('#title').textContent = `${j.ticker} • ${metrics.trend_emoji} ${metrics.trend}`;
    // Show selected range in badge
    document.querySelector('#panel .badge').textContent = range.toUpperCase();
    document.getElementById('tfBadge').textContent = range.toUpperCase();
    const headerMABasis = document.getElementById('headerMABasis');
    if(headerMABasis) headerMABasis.textContent = metrics.ma_basis;
    document.getElementById('price').textContent = fmt(metrics.last_close);
    $('#trend').textContent = metrics.trend;
    
    $('#rsi').textContent = fmt(metrics.rsi);
    $('#cci').textContent = fmt(metrics.cci,1);
    $('#atr').textContent = fmt(metrics.atr);
    $('#atrpct').textContent = pct(metrics.atr_pct);
    $('#vold').textContent = pct(metrics.vol_delta,1);
    $('#earn').textContent = metrics.earnings_str;

    $('#bias').textContent = plan.bias + ' ' + plan.stars;
    $('#entry').textContent = fmt(plan.entry);
    $('#sl').textContent = fmt(plan.sl);
    $('#tp1').textContent = fmt(plan.tp1);
    $('#tp2').textContent = fmt(plan.tp2);

    const fibDiv = $('#fibs'); fibDiv.innerHTML='';
    Object.entries(plan.fib).forEach(([k,v])=>{
      const d=document.createElement('div'); d.textContent = `${k}: ${fmt(v)}`; fibDiv.appendChild(d);
    });

    // Populate S/R levels section with key levels
    if (lastSRLevels && lastSRLevels.length > 0) {
      const currentPrice = metrics.last_close;
      
      // Add buffer zone around current price (0.5% on each side)
      const bufferPercent = 0.005; // 0.5%
      const buffer = currentPrice * bufferPercent;
      
      // Classify levels with buffer zone:
      // - Resistance: levels above (current price + buffer)
      // - Support: levels below (current price - buffer)
      // - Levels within buffer zone are classified by their intended role
      
      let resistances = lastSRLevels.filter(sr => sr.level > (currentPrice + buffer))
                                   .sort((a,b) => a.level - b.level);
      let supports = lastSRLevels.filter(sr => sr.level < (currentPrice - buffer))
                                 .sort((a,b) => b.level - a.level);
      
      // For levels very close to current price (within buffer), classify by context
      const nearbyLevels = lastSRLevels.filter(sr => 
        sr.level >= (currentPrice - buffer) && sr.level <= (currentPrice + buffer)
      );
      
      // Add nearby levels to appropriate category based on which side has more room
      nearbyLevels.forEach(level => {
        const distanceAbove = Math.abs(level.level - (currentPrice + buffer));
        const distanceBelow = Math.abs(level.level - (currentPrice - buffer));
        
        if (distanceBelow <= distanceAbove) {
          // Closer to lower bound, treat as support
          supports.push(level);
        } else {
          // Closer to upper bound, treat as resistance  
          resistances.push(level);
        }
      });
      
      // Re-sort after adding nearby levels
      resistances.sort((a,b) => a.level - b.level);
      supports.sort((a,b) => b.level - a.level);
      
      // Helper function to find levels within percentage range
      const findWithinRange = (levels, price, isResistance, percent) => {
        const maxDistance = price * percent;
        return levels.filter(level => {
          const distance = isResistance ? 
            (level.level - price) : 
            (price - level.level);
          return distance <= maxDistance && distance >= -buffer; // Allow negative distance within buffer
        });
      };
      
      // Try different thresholds: 2%, 5%, 10%, 15%, then any level
      let keyRes = null;
      let keySup = null;
      
      for (const threshold of [0.02, 0.05, 0.10, 0.15, 1.0]) {
        if (!keyRes) {
          const nearResistances = findWithinRange(resistances, currentPrice, true, threshold);
          if (nearResistances.length > 0) keyRes = nearResistances[0];
        }
        if (!keySup) {
          const nearSupports = findWithinRange(supports, currentPrice, false, threshold);
          if (nearSupports.length > 0) keySup = nearSupports[0];
        }
        if (keyRes && keySup) break;
      }
      
      // Fallback to closest levels if still nothing found
      if (!keyRes && resistances.length > 0) keyRes = resistances[0];
      if (!keySup && supports.length > 0) keySup = supports[0];
      
      $('#keyResistance').innerHTML = keyRes ? 
        `<span style="color: #E53E3E; font-weight: 500;">${fmt(keyRes.level)}</span>` : 
        '<span style="color: #999;">None nearby</span>';
        
      $('#keySupport').innerHTML = keySup ? 
        `<span style="color: #38A169; font-weight: 500;">${fmt(keySup.level)}</span>` : 
        '<span style="color: #999;">None nearby</span>';
    } else {
      $('#keyResistance').innerHTML = '<span style="color: #999;">None</span>';
      $('#keySupport').innerHTML = '<span style="color: #999;">None</span>';
    }

    // Color classes
    ['rsi','atrpct','vold'].forEach(id=>{ const el=$('#'+id); el.classList.remove('metric-good','metric-warn','metric-bad'); });
    const rsiCls = classifyRSI(metrics.rsi); if(rsiCls) $('#rsi').classList.add(rsiCls);
    const atrpCls = classifyATRpct(metrics.atr_pct); if(atrpCls) $('#atrpct').classList.add(atrpCls);
    const volCls = classifyVol(metrics.vol_delta); if(volCls) $('#vold').classList.add(volCls);

    // Insight
    const insightText = buildInsight(metrics);
    const insEl = $('#insight');
    if(insightText){ insEl.textContent = insightText; insEl.classList.remove('d-none'); } else insEl.classList.add('d-none');

    const showChart = $('#showChart').checked;
    show($('#chartCard'), showChart);
    if(showChart){ 
      drawChart($('#chart'), lastCandles, plan.fib); 
      drawFlowFromSelection(); 
      drawSRFromSelection(); 
      updateFlowTitle(); 
    }

    // Add to recently viewed stocks after successful analysis
    if (window.addToRecentlyViewed) {
      addToRecentlyViewed(ticker);
    }

  }catch(err){
    const a=$('#alert'); a.textContent = 'Error: ' + (err.message || err); a.classList.remove('d-none');
  }finally{
    $('#spin').classList.add('d-none');
  }
}

// Backtest functionality
async function runBacktest() {
  const t = tickerEl.value.trim();
  if(!t){ showToast('Enter ticker first','danger'); return; }
  const backtestBtn = document.getElementById('backtestBtn');
  backtestBtn.disabled = true; backtestBtn.textContent = 'Testing...';
  try {
    const range = document.getElementById('range').value;
    const maBasis = document.getElementById('maBasis')?.value || '20-50';
    const r = await fetch(`/api/backtest/${encodeURIComponent(t)}?range=${encodeURIComponent(range)}&mabasis=${maBasis}`);
    const j = await r.json();
    if(!j.ok) throw new Error(j.error||'Backtest failed');
    const s = j.stats;
    const statsLine = `Setups: ${s.setups} • Wins: ${s.wins} • Losses: ${s.losses} • No Exit: ${s.noExit} • WinRate: ${s.winRate}% (Resolved: ${s.resolvedWinRate}%) <button id="toggleBTAdv" class="btn btn-link btn-sm p-0 ms-2">Advanced</button>`; 
    const extraLine = `Expectancy: ${s.expectancy}R • PF: ${s.profitFactor} • MaxDD: ${s.maxDrawdownR}R • Final: ${s.finalR}R • AvgBars W/L: ${s.avgBarsWin}/${s.avgBarsLoss} • MA:${s.ma_basis}`;
    document.getElementById('btStats').innerHTML = `<div>${statsLine}</div><div id="btAdv" class="text-secondary small mt-1 d-none">${extraLine}</div>`;
    const rowsHtml = (j.samples||[]).map(r=>`<tr><td>${r.date||''}</td><td>${fmt(r.entry)}</td><td>${fmt(r.target)}</td><td>${fmt(r.stop)}</td><td class="${r.outcome==='WIN'?'text-success':r.outcome==='LOSS'?'text-danger':'text-muted'}">${r.outcome}</td></tr>`).join('');
    document.getElementById('btRows').innerHTML = rowsHtml || '<tr><td colspan="5" class="text-center text-muted">No samples</td></tr>';
    document.getElementById('btSection').classList.remove('d-none');
    // expectancy badge
    const expBadge = document.getElementById('expBadge');
    const expVal = parseFloat(s.expectancy);
    if(Number.isFinite(expVal)){
      expBadge.textContent = `Exp ${expVal.toFixed(2)}R`;
      expBadge.className = 'badge ' + (expVal>0? 'text-bg-success' : expVal<0? 'text-bg-danger':'text-bg-secondary');
      expBadge.classList.remove('d-none');
    }
    const tog=document.getElementById('toggleBTAdv'); if(tog){ tog.addEventListener('click',()=>{ document.getElementById('btAdv').classList.toggle('d-none'); }); }
    showToast('Backtest done','success');
  } catch(e){
    showToast(e.message,'danger');
  } finally {
    backtestBtn.disabled = false; backtestBtn.textContent = 'Backtest Fib';
  }
}

function calculatePositionSize() {
  const risk = parseFloat($('#riskUsd').value||'');
  const entryV = parseFloat($('#entry').textContent);
  const slV = parseFloat($('#sl').textContent);
  if(!risk || !Number.isFinite(entryV) || !Number.isFinite(slV)) { 
    $('#sizeOut').textContent=''; 
    return; 
  }
  const perShare = Math.abs(entryV - slV);
  if(perShare<=0){ 
    $('#sizeOut').textContent=''; 
    return; 
  }
  const shares = Math.floor(risk / perShare);
  $('#sizeOut').textContent = shares>0?`~${shares} shares (risk/share ${perShare.toFixed(2)})`:'Risk too small';
}
