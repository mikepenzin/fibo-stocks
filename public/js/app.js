// Event handlers and UI initialization
function initializeEventHandlers() {
  // Form submission
  document.querySelector('#form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const t = document.querySelector('#ticker').value.trim();
    if(!t) return;
    showBox(false);
    analyze(t.toUpperCase());
  });

  // Update header timeframe when dropdown changes
  const rangeEl = document.getElementById('range');
  if (rangeEl) {
    rangeEl.addEventListener('change', (e) => {
      const headerTimeframe = document.getElementById('headerTimeframe');
      if (headerTimeframe) headerTimeframe.textContent = e.target.value.toUpperCase();
      const tfBadge = document.getElementById('tfBadge');
      if (tfBadge) tfBadge.textContent = e.target.value.toUpperCase();
      clearBacktest();
    });
  }

  // Update header MA basis when changed
  const maBasisEl = document.getElementById('maBasis');
  if (maBasisEl){
    maBasisEl.addEventListener('change', e=>{
      const headerMABasis = document.getElementById('headerMABasis');
      if(headerMABasis) headerMABasis.textContent = e.target.value.replace('-','/');
      clearBacktest();
    });
  }

  // Flow metric selection
  const flowSel=document.getElementById('flowMetric'); 
  if(flowSel){ 
    flowSel.addEventListener('change', ()=> { 
      updateFlowTitle(); 
      drawFlowFromSelection(); 
    }); 
  }

  // Chart toggle
  const showChartEl = document.getElementById('showChart'); 
  if(showChartEl){ 
    showChartEl.addEventListener('change', ()=>{ 
      if(showChartEl.checked){ 
        drawFlowFromSelection(); 
        drawSRFromSelection(); 
      } 
    }); 
  }

  // Save PNG button (only if it exists - currently commented out in HTML)
  const savePngBtn = document.querySelector('#savePng');
  if (savePngBtn) {
    savePngBtn.addEventListener('click', savePNG);
  }

  // Backtest button
  const backtestBtn = document.getElementById('backtestBtn');
  if (backtestBtn){
    backtestBtn.addEventListener('click', runBacktest);
  }

  // Position sizing
  document.addEventListener('click',e=>{
    if(e.target&& e.target.id==='calcSize'){
      calculatePositionSize();
    }
  });

  // Download and copy buttons
  const dlBtn=document.getElementById('downloadImg');
  if(dlBtn){ 
    dlBtn.addEventListener('click', downloadImage);
  }

  const copyBtn=document.getElementById('copyImg');
  if(copyBtn){ 
    // Hide copy button on devices where clipboard API doesn't work well
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasClipboard = navigator.clipboard && navigator.clipboard.write;
    
    if (!hasClipboard || isMobile) {
      copyBtn.style.display = 'none';
    } else {
      copyBtn.addEventListener('click', copyToClipboard);
    }
  }

  // Set up share link button
  const shareBtn = document.getElementById('shareLink');
  if(shareBtn) {
    shareBtn.addEventListener('click', () => {
      stockRouter.copyCurrentURL();
    });
  }
}

// Main initialization function - called after all scripts are loaded
function initApp() {
  initializeTickerInput();
  initializeEventHandlers();
  initializeModals();
  
  // Setup routing
  if (window.stockRouter) {
    stockRouter.setupEventListeners();
  }
  
  // Add mobile-friendly enhancements
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    // Add mobile class to body for additional CSS targeting
    document.body.classList.add('mobile-device');
    
    // Improve touch experience
    document.addEventListener('touchstart', function() {}, {passive: true});
  }
}

// Legacy DOMContentLoaded for fallback (in case not using dynamic loading)
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if not already initialized by dynamic loader
  if (!window.appInitialized) {
    initApp();
    
    // Check for URL parameters and auto-load analysis
    setTimeout(() => {
      checkURLOnLoad();
    }, 500); // Small delay to ensure all components are initialized
  }
});
