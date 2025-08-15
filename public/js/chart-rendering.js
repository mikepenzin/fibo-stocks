// Chart rendering functions
function drawChart(canvas, rows, fib){
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const padL=50, padR=10, padT=10, padB=32; // increase padB for date labels
  const xs=rows.length;
  const prices = rows.flatMap(r=>[r.h,r.l]);
  const minP=Math.min(...prices), maxP=Math.max(...prices);
  const x = i => padL + (i/(xs-1))*(W-padL-padR);
  const y = p => padT + (1-(p-minP)/(maxP-minP))*(H-padT-padB);

  // grid
  ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--bs-border-color');
  ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.beginPath();
  for(let i=0;i<=4;i++){ const yy=padT + i*(H-padT-padB)/4; ctx.moveTo(padL,yy); ctx.lineTo(W-padR,yy); }
  ctx.stroke(); ctx.setLineDash([]);

  // candles
  for(let i=0;i<rows.length;i++){
    const r=rows[i]; const cx=x(i);
    const col = r.c>=r.o ? '#198754' : '#dc3545';
    ctx.strokeStyle=col; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx,y(r.l)); ctx.lineTo(cx,y(r.h)); ctx.stroke();
    ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(cx,y(r.o)); ctx.lineTo(cx,y(r.c)); ctx.stroke();
  }

  // fib lines
  ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.strokeStyle='#6c757d';
  Object.entries(fib).forEach(([label,level])=>{
    const yy=y(level);
    ctx.beginPath(); ctx.moveTo(padL,yy); ctx.lineTo(W-padR,yy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#6c757d'; ctx.font='12px system-ui';
    ctx.fillText(label, padL+2, yy-2);
    ctx.setLineDash([4,3]);
  });

  // x-axis date labels
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const dateStep = Math.ceil(xs / 7); // 7 labels max
  
  // Get current range to determine date format
  const currentRange = document.getElementById('range')?.value || '1d';
  
  for(let i=0;i<xs;i+=dateStep){
    const r = rows[i];
    let dateStr = '';
    if(r.t){
      const ts = r.t > 1e12 ? r.t : r.t*1000;
      const d = new Date(ts);
      
      // Format based on timeframe
      if (currentRange === '5m' || currentRange === '15m') {
        dateStr = d.toTimeString().slice(0,5); // HH:MM
      } else if (currentRange === '1h') {
        dateStr = d.toTimeString().slice(0,5); // HH:MM
      } else if (currentRange === '1w') {
        dateStr = d.toISOString().slice(0,10); // YYYY-MM-DD
      } else {
        dateStr = d.toISOString().slice(5,10); // MM-DD
      }
    } else if(r.date){
      dateStr = r.date.length > 6 ? r.date.slice(5,10) : r.date;
    } else {
      dateStr = String(i);
    }
    ctx.fillText(dateStr, x(i), H-padB+4);
  }
  
  // Always show last date
  if(xs>0){
    const r = rows[xs-1];
    let dateStr = '';
    if(r.t){
      const ts = r.t > 1e12 ? r.t : r.t*1000;
      const d = new Date(ts);
      
      if (currentRange === '5m' || currentRange === '15m') {
        dateStr = d.toTimeString().slice(0,5);
      } else if (currentRange === '1h') {
        dateStr = d.toTimeString().slice(0,5);
      } else if (currentRange === '1w') {
        dateStr = d.toISOString().slice(0,10);
      } else {
        dateStr = d.toISOString().slice(5,10);
      }
    } else if(r.date){
      dateStr = r.date.length > 6 ? r.date.slice(5,10) : r.date;
    } else {
      dateStr = String(xs-1);
    }
    ctx.fillText(dateStr, x(xs-1), H-padB+4);
  }
}

function drawFlowChart(canvas, candles, metric){
  const ctx=canvas.getContext('2d'); const W=canvas.width, H=canvas.height; ctx.clearRect(0,0,W,H); if(!candles||!candles.length) return;
  let data; let min,max; let type=metric;
  if(metric==='OBV'){ data=computeOBV(candles); min=Math.min(...data); max=Math.max(...data); }
  else if(metric==='MFI'){ data=computeMFI(candles); data=data.map(v=>v==null?null:+v); min=0; max=100; }
  else { data=computeCMF(candles); min=-1; max=1; }
  if(max===min){ max=min+1; }
  const padL=50,padR=10,padT=8,padB=20; const n=data.length; const x=i=> padL + (i/(n-1))*(W-padL-padR); const y=v=> padT + (1-(v-min)/(max-min))*(H-padT-padB);
  ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#e0e0e0'; ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.beginPath(); const gSteps=4; for(let i=0;i<=gSteps;i++){ const yy=padT + i*(H-padT-padB)/gSteps; ctx.moveTo(padL,yy); ctx.lineTo(W-padR,yy);} ctx.stroke(); ctx.setLineDash([]);
  if(metric==='MFI'){ [20,50,80].forEach(level=>{ const yy=y(level); ctx.strokeStyle= level===50?'#999':'#bbb'; ctx.beginPath(); ctx.moveTo(padL,yy); ctx.lineTo(W-padR,yy); ctx.stroke(); }); }
  if(metric==='CMF'){ const zeroY=y(0); ctx.strokeStyle='#999'; ctx.beginPath(); ctx.moveTo(padL,zeroY); ctx.lineTo(W-padR,zeroY); ctx.stroke(); }
  ctx.beginPath(); let started=false; ctx.lineWidth=2; ctx.strokeStyle= metric==='OBV'? '#0d6efd': metric==='MFI'? '#6f42c1':'#fd7e14';
  for(let i=0;i<n;i++){ const v=data[i]; if(v==null) continue; const xx=x(i), yy=y(v); if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy); }
  ctx.stroke();
  const prices = candles.map(c=>c.c); const pMin=Math.min(...prices), pMax=Math.max(...prices);
  const priceNorm = prices.map(p=> min + ((p - pMin)/(pMax - pMin || 1)) * (max - min));
  ctx.beginPath(); started=false; ctx.lineWidth=1.25; ctx.strokeStyle='#444'; ctx.setLineDash([6,3]);
  for(let i=0;i<n;i++){ const v=priceNorm[i]; const xx=x(i), yy=y(v); if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy);} ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H-padB); ctx.stroke();
  ctx.fillStyle='#666'; ctx.font='11px system-ui'; ctx.textAlign='right'; ctx.textBaseline='middle';
  const labelVals=[min, min+(max-min)/2, max]; labelVals.forEach(val=>{ const yy=y(val); ctx.fillText(val.toFixed(metric==='OBV'?0: metric==='MFI'?0:2), padL-4, yy); });
  ctx.font='12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillStyle= metric==='OBV'? '#0d6efd': metric==='MFI'? '#6f42c1':'#fd7e14'; ctx.fillText(type, padL+4, 4);
  ctx.fillStyle='#444'; ctx.fillText('Price (norm)', padL+60, 4);
}

function drawSRChart(canvas, candles){
  const ctx=canvas.getContext('2d'); const W=canvas.width, H=canvas.height; ctx.clearRect(0,0,W,H); if(!candles||!candles.length) return;
  
  // Use pre-calculated S/R levels from analysis, or calculate if not available
  const srLevels = lastSRLevels || computeSRLevels(candles);
  
  // Store S/R levels globally so info table can use the same data
  if (!lastSRLevels) lastSRLevels = srLevels;
  
  // Use more recent data for cleaner chart
  const currentRange = document.getElementById('range')?.value || '1d';
  let displayBars;
  if (currentRange === '5m') displayBars = Math.min(candles.length, 200); // show more for context
  else if (currentRange === '15m') displayBars = Math.min(candles.length, 400);  
  else if (currentRange === '1h') displayBars = Math.min(candles.length, 500);
  else if (currentRange === '1d') displayBars = Math.min(candles.length, 180); // extended history for daily like example
  else displayBars = Math.min(candles.length, 260); // ~1 month for weekly data
  
  const displayCandles = candles.slice(-displayBars);
  const prices = displayCandles.map(c=>c.c); 
  
  // Expand price range to include all S/R levels
  const srPrices = srLevels.map(sr => sr.level);
  const allPrices = [...prices, ...srPrices];
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const priceRange = maxP - minP;
  const padding = priceRange * 0.08; // 8% padding for better visibility
  const chartMinP = minP - padding;
  const chartMaxP = maxP + padding;
  
  const padL=60,padR=15,padT=15,padB=25; const n=displayCandles.length; 
  const x=i=> padL + (i/(n-1))*(W-padL-padR); 
  const y=p=> padT + (1-(p-chartMinP)/(chartMaxP-chartMinP||1))*(H-padT-padB);
  
  // Clean background
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
  
  // Price grid lines (horizontal)
  ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=1; 
  const gridSteps = 8;
  for(let i=0; i<=gridSteps; i++){
    const gridPrice = chartMinP + (i/gridSteps) * (chartMaxP - chartMinP);
    const yy = y(gridPrice);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W-padR, yy); ctx.stroke();
  }
  
  // Price line (prominent blue like the example)
  ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle='#2196F3'; let started=false;
  for(let i=0;i<n;i++){ 
    const p=prices[i], xx=x(i), yy=y(p); 
    if(!started){ctx.moveTo(xx,yy);started=true;} else ctx.lineTo(xx,yy);
  } 
  ctx.stroke();
  
  // S/R levels - solid horizontal lines like the example
  srLevels.forEach((sr,idx)=>{
    const yy=y(sr.level); 
    const isResistance = sr.type === 'resistance';
    const color = isResistance ? '#E53E3E' : '#38A169'; // Clean red/green like example
    
    ctx.strokeStyle = color; 
    ctx.lineWidth = 1.5; // Clean solid line thickness
    ctx.setLineDash([]); // Solid lines, no dashing
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W-padR, yy); ctx.stroke();
    
    // Price level labels on left side
    ctx.fillStyle = color; 
    ctx.font = '11px system-ui'; 
    ctx.textAlign = 'right'; 
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sr.level.toFixed(2)}`, padL-5, yy);
  });
  
  // Y-axis price labels (left side)
  ctx.fillStyle='#666'; ctx.font='10px system-ui'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for(let i=0; i<=4; i++){
    const labelPrice = chartMinP + (i/4) * (chartMaxP - chartMinP);
    const yy = y(labelPrice);
    ctx.fillText(labelPrice.toFixed(2), padL-25, yy);
  }
  
  // Left axis line
  ctx.strokeStyle='#ddd'; ctx.lineWidth=1; 
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H-padB); ctx.stroke();
  
  // Title
  ctx.fillStyle='#333'; ctx.font='14px system-ui'; ctx.textAlign='left'; ctx.textBaseline='top'; 
  ctx.fillText('S/R Levels', padL+4, 4);
}

function drawMACDChart(canvas, candles, metrics){
  const ctx = canvas.getContext('2d'); 
  const W = canvas.width, H = canvas.height; 
  ctx.clearRect(0, 0, W, H); 
  
  if (!candles || !candles.length || !metrics?.macd) return;

  const { line: macdLine, signal: signalLine, histogram } = metrics.macd;
  
  if (!macdLine || macdLine.length === 0) return;
  
  // Find valid data range
  const validData = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null && macdLine[i] !== undefined && !isNaN(macdLine[i])) {
      validData.push({
        index: i,
        macd: macdLine[i],
        signal: (signalLine[i] !== null && signalLine[i] !== undefined && !isNaN(signalLine[i])) ? signalLine[i] : null,
        histogram: (histogram[i] !== null && histogram[i] !== undefined && !isNaN(histogram[i])) ? histogram[i] : null
      });
    }
  }
  
  if (validData.length === 0) return;
  
  // Get reasonable data ranges
  const macdValues = validData.map(d => d.macd);
  const signalValues = validData.map(d => d.signal).filter(v => v !== null);
  const histogramValues = validData.map(d => d.histogram).filter(v => v !== null);
  
  const allValues = [...macdValues, ...signalValues, ...histogramValues];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  
  // Add padding and ensure reasonable range
  const range = Math.max(maxVal - minVal, 0.001);
  const padding = range * 0.15;
  const chartMin = minVal - padding;
  const chartMax = maxVal + padding;

  const padL = 50, padR = 10, padT = 10, padB = 20;
  const n = validData.length;
  
  if (n <= 1) return; // Need at least 2 points
  
  const x = i => padL + (i / (n - 1)) * (W - padL - padR);
  const y = v => padT + (1 - (v - chartMin) / (chartMax - chartMin)) * (H - padT - padB);

  // Background
  ctx.fillStyle = '#fafafa'; 
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#e0e0e0'; 
  ctx.lineWidth = 1; 
  ctx.setLineDash([3, 3]); 
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const yy = padT + i * (H - padT - padB) / 4;
    ctx.moveTo(padL, yy); 
    ctx.lineTo(W - padR, yy);
  }
  ctx.stroke(); 
  ctx.setLineDash([]);

  // Zero line
  if (chartMin < 0 && chartMax > 0) {
    const zeroY = y(0);
    ctx.strokeStyle = '#999'; 
    ctx.lineWidth = 1;
    ctx.beginPath(); 
    ctx.moveTo(padL, zeroY); 
    ctx.lineTo(W - padR, zeroY); 
    ctx.stroke();
  }

  // Draw histogram bars
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < validData.length; i++) {
    const histVal = validData[i].histogram;
    if (histVal !== null) {
      const xx = x(i);
      const yy = y(histVal);
      const zeroY = y(0);
      
      ctx.fillStyle = histVal >= 0 ? '#22c55e' : '#ef4444';
      
      const barWidth = Math.max(1, (W - padL - padR) / n * 0.8);
      
      if (histVal >= 0) {
        ctx.fillRect(xx - barWidth/2, yy, barWidth, zeroY - yy);
      } else {
        ctx.fillRect(xx - barWidth/2, zeroY, barWidth, yy - zeroY);
      }
    }
  }
  ctx.globalAlpha = 1.0;

  // Draw MACD line
  ctx.beginPath(); 
  ctx.lineWidth = 2; 
  ctx.strokeStyle = '#3b82f6';
  let started = false;
  
  for (let i = 0; i < validData.length; i++) {
    const macdVal = validData[i].macd;
    const xx = x(i);
    const yy = y(macdVal);
    
    if (!started) {
      ctx.moveTo(xx, yy); 
      started = true; 
    } else {
      ctx.lineTo(xx, yy);
    }
  }
  ctx.stroke();

  // Draw signal line
  if (signalValues.length > 0) {
    ctx.beginPath(); 
    ctx.lineWidth = 2; 
    ctx.strokeStyle = '#f97316';
    started = false;
    
    for (let i = 0; i < validData.length; i++) {
      const signalVal = validData[i].signal;
      if (signalVal !== null) {
        const xx = x(i);
        const yy = y(signalVal);
        
        if (!started) {
          ctx.moveTo(xx, yy); 
          started = true; 
        } else {
          ctx.lineTo(xx, yy);
        }
      }
    }
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#666'; 
  ctx.font = '10px system-ui'; 
  ctx.textAlign = 'right'; 
  ctx.textBaseline = 'middle';
  
  const labelVals = [chartMin, (chartMin + chartMax) / 2, chartMax];
  labelVals.forEach(val => {
    const yy = y(val);
    ctx.fillText(val.toFixed(3), padL - 4, yy);
  });

  // Left axis line
  ctx.strokeStyle = '#ddd'; 
  ctx.lineWidth = 1; 
  ctx.beginPath(); 
  ctx.moveTo(padL, padT); 
  ctx.lineTo(padL, H - padB); 
  ctx.stroke();

  // Legend
  ctx.font = '12px system-ui'; 
  ctx.textAlign = 'left'; 
  ctx.textBaseline = 'top';
  
  ctx.fillStyle = '#3b82f6'; 
  ctx.fillText('MACD', padL + 4, 4);
  
  ctx.fillStyle = '#f97316'; 
  ctx.fillText('Signal', padL + 50, 4);
  
  ctx.fillStyle = '#666'; 
  ctx.fillText('Histogram', padL + 100, 4);
}

function drawFlowFromSelection(){ 
  const metric = document.getElementById('flowMetric')?.value||'OBV'; 
  const canvas=document.getElementById('flowChart'); 
  if(canvas && lastCandles) drawFlowChart(canvas,lastCandles,metric); 
}

function drawSRFromSelection(){ 
  const canvas=document.getElementById('srChart'); 
  if(canvas && lastCandles) drawSRChart(canvas,lastCandles); 
}

function drawMACDFromSelection(){ 
  const canvas=document.getElementById('macdChart'); 
  if(canvas && lastCandles && lastMetrics) drawMACDChart(canvas, lastCandles, lastMetrics); 
}

function updateFlowTitle(){
  const metric = document.getElementById('flowMetric')?.value || 'OBV';
  const el = document.getElementById('flowTitle');
  if(el) el.textContent = `Flow: ${metric} + Price`;
}

function copyChartToClone(cloneCard) {
  // First ensure all charts are rendered
  if (lastCandles) {
    drawChart(document.getElementById('chart'), lastCandles, lastFib || {});
    drawFlowFromSelection();
    drawSRFromSelection();
    drawMACDFromSelection();
  }
  
  const origCanvases = document.querySelectorAll('#chartCard canvas');
  const cloneCanvases = cloneCard.querySelectorAll('canvas');
  
  console.log('Original canvases found:', origCanvases.length);
  console.log('Clone canvases found:', cloneCanvases.length);
  
  origCanvases.forEach((orig, idx) => {
    const clone = cloneCanvases[idx]; 
    if (!clone) {
      console.warn(`Clone canvas ${idx} not found`);
      return;
    }
    
    // Ensure the original canvas has content
    if (orig.width === 0 || orig.height === 0) {
      console.warn(`Original canvas ${idx} has no dimensions`);
      return;
    }
    
    clone.width = orig.width; 
    clone.height = orig.height;
    
    const ctx = clone.getContext('2d');
    try {
      ctx.drawImage(orig, 0, 0);
      console.log(`Successfully copied canvas ${idx} (${orig.width}x${orig.height})`);
    } catch (e) {
      console.error(`Failed to copy canvas ${idx}:`, e);
    }
  });
}
