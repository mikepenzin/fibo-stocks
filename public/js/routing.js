// URL routing and state management
class StockRouter {
  constructor() {
    this.currentParams = new URLSearchParams(window.location.search);
    this.setupEventListeners();
  }

  // Update URL with current analysis parameters
  updateURL(ticker, range = '1d', mabasis = '20-50') {
    const params = new URLSearchParams();
    params.set('ticker', ticker.toUpperCase());
    params.set('range', range);
    params.set('mabasis', mabasis);
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ ticker, range, mabasis }, '', newURL);
    
    console.log('URL updated:', newURL);
  }

  // Get parameters from current URL
  getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      ticker: params.get('ticker'),
      range: params.get('range') || '1d',
      mabasis: params.get('mabasis') || '20-50'
    };
  }

  // Check if URL has analysis parameters
  hasAnalysisParams() {
    return this.getURLParams().ticker !== null;
  }

  // Load analysis from URL parameters
  async loadFromURL() {
    const params = this.getURLParams();
    
    if (!params.ticker) {
      console.log('No ticker in URL, skipping auto-load');
      return false;
    }

    console.log('Loading analysis from URL:', params);
    
    try {
      // Update form fields to match URL parameters
      const tickerInput = document.getElementById('ticker');
      const rangeSelect = document.getElementById('range');
      const maBasisSelect = document.getElementById('maBasis');
      
      if (tickerInput) tickerInput.value = params.ticker.toUpperCase();
      if (rangeSelect) rangeSelect.value = params.range;
      if (maBasisSelect) maBasisSelect.value = params.mabasis;
      
      // Trigger analysis
      await analyze(params.ticker.toUpperCase());
      
      return true;
    } catch (error) {
      console.error('Failed to load analysis from URL:', error);
      showToast('Failed to load analysis from URL: ' + error.message, 'danger');
      return false;
    }
  }

  // Handle browser back/forward navigation
  setupEventListeners() {
    window.addEventListener('popstate', (event) => {
      console.log('Browser navigation detected');
      
      if (event.state && event.state.ticker) {
        // Load analysis from browser state
        this.loadFromURL();
      } else {
        // No state, check URL parameters
        if (this.hasAnalysisParams()) {
          this.loadFromURL();
        }
      }
    });
  }

  // Generate shareable URL
  generateShareableURL(ticker, range = '1d', mabasis = '20-50') {
    const params = new URLSearchParams();
    params.set('ticker', ticker.toUpperCase());
    params.set('range', range);
    params.set('mabasis', mabasis);
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  // Copy current URL to clipboard
  async copyCurrentURL() {
    if (!this.hasAnalysisParams()) {
      showToast('No analysis to share. Analyze a stock first.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      
      // Fallback: select text in a temporary input
      const tempInput = document.createElement('input');
      tempInput.value = window.location.href;
      document.body.appendChild(tempInput);
      tempInput.select();
      tempInput.setSelectionRange(0, 99999);
      
      try {
        document.execCommand('copy');
        showToast('Link copied to clipboard!', 'success');
      } catch (fallbackError) {
        showToast('Failed to copy link', 'danger');
      }
      
      document.body.removeChild(tempInput);
    }
  }
}

// Global router instance
const stockRouter = new StockRouter();

// Helper function to update URL when analysis is performed
function updateAnalysisURL(ticker, range, mabasis) {
  stockRouter.updateURL(ticker, range, mabasis);
}

// Helper function to check for URL parameters on page load
function checkURLOnLoad() {
  return stockRouter.loadFromURL();
}
