// Utility functions and helpers
const $ = s=>document.querySelector(s);
const show = (el, v)=>el.classList.toggle('d-none', !v);
const pct = (x,d=2)=>Number.isFinite(x)?((x>=0?'+':'')+x.toFixed(d)+'%'):'n/a';
const fmt = (x,d=2)=>Number.isFinite(x)?Number(x).toFixed(d):'n/a';

function clearBacktest(){
  const s=document.getElementById('btSection'); if(!s) return;
  s.classList.add('d-none');
  const st=document.getElementById('btStats'); if(st) st.textContent='';
  const rows=document.getElementById('btRows'); if(rows) rows.innerHTML='';
}

function showToast(message, type = 'primary') {
  const toast = document.getElementById('mainToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  
  toastMsg.textContent = message;
  toast.className = `toast align-items-center border-0 ${type === 'success' ? 'text-bg-success' : type === 'danger' ? 'text-bg-danger' : 'text-bg-primary'}`;
  
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Metric classification helpers
function classifyRSI(v){ if(!Number.isFinite(v)) return null; return v>70?'metric-warn':v<30?'metric-warn':'metric-good'; }
function classifyATRpct(v){ if(!Number.isFinite(v)) return null; return v>4? 'metric-warn': v<1? 'metric-good': null; }
function classifyVol(v){ if(!Number.isFinite(v)) return null; return v>50? 'metric-good': v<-30? 'metric-bad': null; }

function buildInsight(m){
  if(!m) return '';
  let parts=[];
  if(m.trend==='Uptrend'){ if(m.rsi>70) parts.push('Overbought – wait for pullback (Fib 38.2 / 50).'); else parts.push('Healthy uptrend – watch 50% retrace for entry.'); }
  else if(m.trend==='Downtrend'){ if(m.rsi<30) parts.push('Oversold – bounce risk; target 38.2%.'); else parts.push('Downtrend – look for rally to 50% for short.'); }
  else parts.push('Range – fade extremes near 61.8% / 38.2%.');
  if(m.vol_delta>60) parts.push('High volume expansion.');
  if(m.atr_pct>4) parts.push('Elevated volatility – reduce size.');
  return parts.join(' ');
}
