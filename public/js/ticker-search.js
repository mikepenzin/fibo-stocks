// Ticker search and autocomplete functionality
let tickerEl, boxEl, listEl;
let suggestTimer;

function upperSanitize(v){ 
  return v.toUpperCase().replace(/[^A-Z0-9\.\-]/g,''); 
}

function showBox(show){ 
  if(!boxEl) return; 
  boxEl.classList.toggle('d-none', !show); 
}

function renderSuggestions(items){
  // Populate native datalist too (fallback / native dropdown)
  if (listEl) {
    const opts = (items||[]).map(it => {
      const lbl = `${(it.name||'').replace(/</g,'&lt;')} ${it.exch?`(${it.exch})`:''}`.trim();
      return `<option value="${it.symbol}" label="${lbl}"></option>`;
    }).join('');
    listEl.innerHTML = opts;
  }
  if(!boxEl) return;
  if(!items?.length){ boxEl.innerHTML=''; showBox(false); return; }
  boxEl.innerHTML = items.map(it=>
    `<div class="autocomplete-item" data-sym="${it.symbol}">
      <div><span class="ac-symbol">${it.symbol}</span>${it.type ? `<span class="ac-type">${it.type}</span>` : ''}</div>
      <div class="ac-name">${(it.name||'').replace(/</g,'&lt;')}</div>
      <div class="ac-exch">${it.exch||''}</div>
    </div>`
  ).join('');
  boxEl.classList.add('list-group');
  showBox(true);
  boxEl.querySelectorAll('[data-sym]').forEach(btn=>{
    btn.addEventListener('click',()=>{ tickerEl.value = btn.dataset.sym; showBox(false); tickerEl.focus(); });
  });
}

async function fetchSuggestions(q){
  try{
    const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { cache:'no-store' });
    const j = await r.json();
    if(!j.ok) return renderSuggestions([]);
    renderSuggestions(j.results||[]);
  }catch(e){ renderSuggestions([]); }
}

// Initialize ticker input handlers
function initializeTickerInput() {
  // Initialize DOM element references
  tickerEl = $('#ticker');
  boxEl = $('#suggestBox');
  listEl = $('#tickerList');
  
  if (tickerEl) {
    tickerEl.addEventListener('input',(e)=>{
      const pos = e.target.selectionStart;
      e.target.value = upperSanitize(e.target.value);
      try{ e.target.setSelectionRange(pos,pos); }catch{}
      clearTimeout(suggestTimer);
      const v = e.target.value.trim();
      if (!v){ showBox(false); return; }
      suggestTimer = setTimeout(()=>fetchSuggestions(v), 150);
    });
    tickerEl.addEventListener('blur',()=> setTimeout(()=>showBox(false), 150));
    tickerEl.addEventListener('focus',()=>{ if (tickerEl.value) fetchSuggestions(tickerEl.value); });
  }
}
