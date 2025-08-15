// Modal functionality for chart enlargement
function openPriceModal(){
  if(!lastCandles) return; 
  const modalEl = document.getElementById('priceModal'); 
  if(!modalEl) return;
  
  // Ensure modal is mobile-friendly
  const modalDialog = modalEl.querySelector('.modal-dialog');
  if (modalDialog) {
    modalDialog.classList.add('modal-lg');
    modalDialog.style.maxWidth = '95vw';
    modalDialog.style.margin = '10px auto';
  }
  
  const c = document.getElementById('priceModalCanvas'); 
  if(c) { 
    // Set canvas size for mobile
    const isMobile = window.innerWidth < 768;
    c.width = isMobile ? 600 : 800;
    c.height = isMobile ? 300 : 400;
    drawChart(c, lastCandles, lastFib || {}); 
  }
  
  const meta = document.getElementById('priceModalMeta'); 
  if(meta && lastMetrics) { 
    meta.textContent = `${lastTicker||''} • Trend: ${lastMetrics.trend} • Price: ${fmt(lastMetrics.last_close)} • ATR%: ${pct(lastMetrics.atr_pct)} • VolΔ: ${pct(lastMetrics.vol_delta)}`; 
  }
  
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openFlowModal(){
  if(!lastCandles) return; 
  const modalEl = document.getElementById('flowModal'); 
  if(!modalEl) return;
  
  // Ensure modal is mobile-friendly
  const modalDialog = modalEl.querySelector('.modal-dialog');
  if (modalDialog) {
    modalDialog.classList.add('modal-lg');
    modalDialog.style.maxWidth = '95vw';
    modalDialog.style.margin = '10px auto';
  }
  
  const c = document.getElementById('flowModalCanvas'); 
  if(c) { 
    // Set canvas size for mobile
    const isMobile = window.innerWidth < 768;
    c.width = isMobile ? 600 : 800;
    c.height = isMobile ? 300 : 400;
    drawFlowChart(c, lastCandles, document.getElementById('flowMetric')?.value || 'OBV'); 
  }
  
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openSRModal(){
  if(!lastCandles) return; 
  const modalEl = document.getElementById('srModal'); 
  if(!modalEl) return;
  
  // Ensure modal is mobile-friendly
  const modalDialog = modalEl.querySelector('.modal-dialog');
  if (modalDialog) {
    modalDialog.classList.add('modal-lg');
    modalDialog.style.maxWidth = '95vw';
    modalDialog.style.margin = '10px auto';
  }
  
  const c = document.getElementById('srModalCanvas'); 
  if(c) { 
    // Set canvas size for mobile
    const isMobile = window.innerWidth < 768;
    c.width = isMobile ? 600 : 800;
    c.height = isMobile ? 300 : 400;
    drawSRChart(c, lastCandles); 
  }
  
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openMACDModal(){
  if(!lastCandles || !lastMetrics) return; 
  const modalEl = document.getElementById('macdModal'); 
  if(!modalEl) return;
  
  // Ensure modal is mobile-friendly
  const modalDialog = modalEl.querySelector('.modal-dialog');
  if (modalDialog) {
    modalDialog.classList.add('modal-lg');
    modalDialog.style.maxWidth = '95vw';
    modalDialog.style.margin = '10px auto';
  }
  
  const c = document.getElementById('macdModalCanvas'); 
  if(c) { 
    // Set canvas size for mobile
    const isMobile = window.innerWidth < 768;
    c.width = isMobile ? 600 : 800;
    c.height = isMobile ? 300 : 400;
    drawMACDChart(c, lastCandles, lastMetrics); 
  }
  
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// Initialize modal functionality
function initializeModals() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Helper function to add both click and touch events
  function addModalTrigger(element, handler) {
    if (!element) return;
    element.style.cursor = isMobile ? 'pointer' : 'zoom-in';
    
    if (isMobile) {
      // Use touchstart for better mobile responsiveness
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handler();
      }, { passive: false });
      // Keep click as fallback
      element.addEventListener('click', handler);
    } else {
      element.addEventListener('click', handler);
    }
  }

  // Canvas click triggers removed - modals now only open via zoom buttons
  // const mainPriceCanvas = document.getElementById('chart');
  // addModalTrigger(mainPriceCanvas, openPriceModal);
  
  // const mainFlowCanvas = document.getElementById('flowChart');
  // addModalTrigger(mainFlowCanvas, openFlowModal);
  
  // const mainSRCanvas = document.getElementById('srChart');
  // addModalTrigger(mainSRCanvas, openSRModal);
  
  // Save buttons with mobile-friendly download
  const priceModalSave = document.getElementById('priceModalSave'); 
  if (priceModalSave) { 
    priceModalSave.addEventListener('click', () => { 
      const canvas = document.getElementById('priceModalCanvas'); 
      if (!canvas) return; 
      downloadCanvasImage(canvas, 'price-chart.png');
    }); 
  }
  
  const flowModalSave = document.getElementById('flowModalSave'); 
  if (flowModalSave) { 
    flowModalSave.addEventListener('click', () => { 
      const canvas = document.getElementById('flowModalCanvas'); 
      if (!canvas) return; 
      downloadCanvasImage(canvas, 'flow-chart.png');
    }); 
  }
  
  const srModalSave = document.getElementById('srModalSave'); 
  if (srModalSave) { 
    srModalSave.addEventListener('click', () => { 
      const canvas = document.getElementById('srModalCanvas'); 
      if (!canvas) return; 
      downloadCanvasImage(canvas, 'sr-chart.png');
    }); 
  }
  
  const macdModalSave = document.getElementById('macdModalSave'); 
  if (macdModalSave) { 
    macdModalSave.addEventListener('click', () => { 
      const canvas = document.getElementById('macdModalCanvas'); 
      if (!canvas) return; 
      downloadCanvasImage(canvas, 'macd-chart.png');
    }); 
  }
}

// Helper function for mobile-friendly canvas download
function downloadCanvasImage(canvas, filename) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const dataURL = canvas.toDataURL('image/png');
  
  if (isMobile) {
    // For mobile, try to open in new window/tab
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${filename}</title></head>
          <body style="margin:0;padding:20px;text-align:center;">
            <h3>${filename}</h3>
            <img src="${dataURL}" style="max-width:100%;height:auto;" />
            <div style="margin-top:20px;">
              <p>Long press the image above and select "Save to Photos" or "Download image"</p>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
      showToast('Image opened in new tab - long press to save', 'success');
    } else {
      // Fallback: try direct download
      const a = document.createElement('a'); 
      a.href = dataURL; 
      a.download = filename; 
      a.click();
      showToast('Download started', 'success');
    }
  } else {
    // Desktop download
    const a = document.createElement('a'); 
    a.href = dataURL; 
    a.download = filename; 
    a.click();
  }
}
