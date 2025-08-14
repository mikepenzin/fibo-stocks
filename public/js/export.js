// Export and download functionality
function ensureFlowReady(){
  console.log('ensureFlowReady called, lastCandles:', !!lastCandles);
  
  const flowCanvas = document.getElementById('flowChart');
  if (flowCanvas && lastCandles) { 
    console.log('Drawing flow chart');
    drawFlowFromSelection(); 
  } else {
    console.warn('Flow canvas or lastCandles missing:', !!flowCanvas, !!lastCandles);
  }
  
  const srCanvas = document.getElementById('srChart');
  if (srCanvas && lastCandles) { 
    console.log('Drawing SR chart');
    drawSRFromSelection(); 
  } else {
    console.warn('SR canvas or lastCandles missing:', !!srCanvas, !!lastCandles);
  }
  
  const mainChart = document.getElementById('chart');
  if (mainChart && lastCandles && lastFib) {
    console.log('Drawing main chart');
    drawChart(mainChart, lastCandles, lastFib);
  } else {
    console.warn('Main chart elements missing:', !!mainChart, !!lastCandles, !!lastFib);
  }
}

async function downloadImage() {
  // Check if we have data to export
  if (!lastCandles || !lastMetrics) {
    showToast('No data to export. Please analyze a ticker first.', 'warning');
    return;
  }
  
  // Temporarily ensure charts are visible and rendered
  const chartCard = document.getElementById('chartCard');
  const wasHidden = chartCard.classList.contains('d-none');
  
  if (wasHidden) {
    chartCard.classList.remove('d-none');
    await new Promise(resolve => setTimeout(resolve, 100)); // Let it render
  }
  
  ensureFlowReady();
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.zIndex = '-1';
  wrapper.style.visibility = 'visible';
  wrapper.style.pointerEvents = 'none';
  
  if (isMobile) {
    wrapper.style.width = '800px';
    wrapper.style.display = 'block';
    wrapper.style.padding = '15px';
  } else {
    wrapper.style.width = '1280px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.flexWrap = 'nowrap';
    wrapper.style.alignItems = 'flex-start';
    wrapper.style.gap = '20px';
    wrapper.style.padding = '20px';
  }
  
  wrapper.style.background = '#ffffff';
  wrapper.style.border = '1px solid #ddd';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

  const panelOrig = document.getElementById('panel');
  const chartOrig = document.getElementById('chartCard');
  if (!panelOrig || !chartOrig) { 
    showToast('Unable to find content to export', 'danger');
    if (wasHidden) chartCard.classList.add('d-none'); // Restore original state
    return; 
  }
  
  const panelClone = panelOrig.cloneNode(true); 
  panelClone.classList.remove('d-none');
  
  const chartClone = chartOrig.cloneNode(true); 
  chartClone.classList.remove('d-none');

  if (isMobile) {
    panelClone.style.width = '100%';
    panelClone.style.marginBottom = '15px';
    chartClone.style.width = '100%';
  } else {
    panelClone.style.flex = '0 0 360px';
    panelClone.style.maxWidth = '360px';
    panelClone.style.minWidth = '360px';
    chartClone.style.flex = '1 1 auto';
  }

  wrapper.appendChild(panelClone);
  wrapper.appendChild(chartClone);
  document.body.appendChild(wrapper);

  // Force browser to render the content
  wrapper.offsetHeight;

  try {
    // Sync canvases after DOM insertion
    copyChartToClone(chartClone);
    
    // Wait longer for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Starting html2canvas with wrapper dimensions:', wrapper.offsetWidth, 'x', wrapper.offsetHeight);
    
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: isMobile ? 1 : Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: true,
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
      windowWidth: wrapper.offsetWidth,
      windowHeight: wrapper.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      allowTaint: false,
      foreignObjectRendering: false
    });
    
    console.log('html2canvas completed, canvas dimensions:', canvas.width, 'x', canvas.height);
    
    // Check if canvas has content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((value, index) => index % 4 !== 3 && value !== 255);
    
    if (!hasContent) {
      throw new Error('Generated image appears to be empty - try enabling charts first');
    }
    
    // Mobile-friendly download
    if (isMobile) {
      const dataURL = canvas.toDataURL('image/png');
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Stock Analysis</title></head>
            <body style="margin:0;padding:20px;text-align:center;">
              <h3>Stock Analysis</h3>
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
        const a = document.createElement('a'); 
        a.href = dataURL; 
        // Use ticker as prefix for filename if available
        let prefix = '';
        if (localStorage.getItem("stockAnalyzer_recentlyViewed")) {
            prefix = JSON.parse(localStorage.getItem("stockAnalyzer_recentlyViewed"))[0].toUpperCase() + '-';
        }

        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        const formattedDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        a.download = prefix + 'stock-analysis-' + formattedDate + '.png'; 
        a.click();
        showToast('Download started', 'success');
      }
    } else {
      const a = document.createElement('a'); 
      a.href = canvas.toDataURL('image/png'); 
      // Use ticker as prefix for filename if available
      let prefix = '';
      if (localStorage.getItem("stockAnalyzer_recentlyViewed")) {
        prefix = JSON.parse(localStorage.getItem("stockAnalyzer_recentlyViewed"))[0].toUpperCase() + '-';
      }
      const now = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      const formattedDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}`;

      a.download = prefix + 'stock-analysis-' + formattedDate + '.png'; 
      a.click();
      showToast('Download started', 'success');
    }
  } catch(err) {
    console.error('Download render failed', err);
    showToast('Image render failed: ' + err.message, 'danger');
  } finally {
    document.body.removeChild(wrapper);
    // Restore original chart visibility state
    if (wasHidden) chartCard.classList.add('d-none');
  }
}

async function copyToClipboard() {
  // Check if we have data to export
  if (!lastCandles || !lastMetrics) {
    showToast('No data to copy. Please analyze a ticker first.', 'warning');
    return;
  }
  
  // Check if clipboard API is available (not always on mobile)
  if (!navigator.clipboard || !navigator.clipboard.write) {
    showToast('Clipboard not supported on this device. Use download instead.', 'warning');
    return;
  }
  
  // Temporarily ensure charts are visible and rendered
  const chartCard = document.getElementById('chartCard');
  const wasHidden = chartCard.classList.contains('d-none');
  
  if (wasHidden) {
    chartCard.classList.remove('d-none');
    await new Promise(resolve => setTimeout(resolve, 100)); // Let it render
  }
  
  ensureFlowReady();
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.visibility = 'visible'; // Changed from hidden
  container.style.pointerEvents = 'none';
  
  if (isMobile) {
    container.style.display = 'block';
    container.style.width = '600px';
    container.style.padding = '12px';
  } else {
    container.style.display = 'flex';
    container.style.gap = '16px';
    container.style.padding = '16px';
    container.style.width = '1000px';
  }
  
  container.style.background = '#fff';
  
  const panelClone = document.getElementById('panel').cloneNode(true);
  const chartCardClone = document.getElementById('chartCard').cloneNode(true);
  
  panelClone.classList.remove('d-none');
  chartCardClone.classList.remove('d-none');
  
  if (isMobile) {
    panelClone.style.width = '100%';
    panelClone.style.marginBottom = '12px';
    chartCardClone.style.width = '100%';
  } else {
    panelClone.style.flex = '0 0 360px';
    chartCardClone.style.flex = '1 1 auto';
  }
  
  container.appendChild(panelClone);
  container.appendChild(chartCardClone);
  document.body.appendChild(container);
  
  // Force browser to render
  container.offsetHeight;
  
  try {
    // Sync canvases after DOM insertion
    copyChartToClone(chartCardClone);
    
    // Wait longer for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Starting clipboard copy with container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#fff',
      scale: isMobile ? 1 : 1.5,
      useCORS: true,
      logging: true, // Enable logging for debugging
      width: container.offsetWidth,
      height: container.offsetHeight,
      windowWidth: container.offsetWidth,
      windowHeight: container.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      allowTaint: false,
      foreignObjectRendering: false
    });
    
    console.log('Clipboard canvas completed, dimensions:', canvas.width, 'x', canvas.height);
    
    // Check if canvas has content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((value, index) => index % 4 !== 3 && value !== 255);
    
    if (!hasContent) {
      throw new Error('Generated image appears to be empty - try enabling charts first');
    }
    
    canvas.toBlob(async blob => {
      try { 
        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); 
        showToast('Copied to clipboard!', 'success'); 
      }
      catch(e) { 
        console.error('Clipboard error:', e);
        showToast('Copy failed: ' + e.message, 'danger'); 
      }
    });
  } catch(err) {
    console.error('Copy render failed:', err);
    showToast('Copy failed: ' + err.message, 'danger');
  } finally {
    document.body.removeChild(container);
    // Restore original chart visibility state
    if (wasHidden) chartCard.classList.add('d-none');
  }
}

function savePNG() {
  const c=document.querySelector('#chart');
  const a=document.createElement('a'); 
  a.href=c.toDataURL('image/png'); 
  a.download='chart.png'; 
  a.click();
}
