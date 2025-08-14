// Recently viewed stocks functionality
class RecentlyViewedStocks {
  constructor() {
    this.storageKey = 'stockAnalyzer_recentlyViewed';
    this.maxItems = 10; // Maximum number of recent stocks to keep
  }

  // Get recently viewed stocks from localStorage
  getRecentStocks() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recent stocks:', error);
      return [];
    }
  }

  // Add a stock to recently viewed (or move to top if already exists)
  addStock(ticker) {
    if (!ticker) return;
    
    ticker = ticker.toUpperCase().trim();
    let recentStocks = this.getRecentStocks();
    
    // Remove existing entry (no duplicates)
    recentStocks = recentStocks.filter(stock => stock !== ticker);
    
    // Add to beginning of array (most recent first)
    recentStocks.unshift(ticker);
    
    // Keep only max items
    if (recentStocks.length > this.maxItems) {
      recentStocks = recentStocks.slice(0, this.maxItems);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(recentStocks));
      this.updateDropdown();
    } catch (error) {
      console.error('Error saving recent stocks:', error);
    }
  }

  // Update the dropdown with current recent stocks
  updateDropdown() {
    const dropdownList = document.getElementById('recentlyViewedList');
    if (!dropdownList) return;

    const recentStocks = this.getRecentStocks();
    
    // Clear existing items
    dropdownList.innerHTML = '';
    
    if (recentStocks.length === 0) {
      dropdownList.innerHTML = '<li><span class="dropdown-item-text text-muted small">No recent stocks</span></li>';
      return;
    }

    // Add clear history option
    const clearItem = document.createElement('li');
    clearItem.innerHTML = `
      <a class="dropdown-item text-danger small" href="#" id="clearRecentHistory">
        <i class="bi bi-trash"></i> Clear History
      </a>
    `;
    dropdownList.appendChild(clearItem);

    // Add separator
    const separator = document.createElement('li');
    separator.innerHTML = '<hr class="dropdown-divider">';
    dropdownList.appendChild(separator);

    // Add each recent stock
    recentStocks.forEach((ticker, index) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" data-ticker="${ticker}">
          <span class="fw-semibold">${ticker}</span>
        </a>
      `;
      dropdownList.appendChild(listItem);
    });

    // Add event listeners
    this.attachDropdownListeners();
  }

  // Attach event listeners to dropdown items
  attachDropdownListeners() {
    const dropdownList = document.getElementById('recentlyViewedList');
    if (!dropdownList) return;

    // Clear history button
    const clearBtn = document.getElementById('clearRecentHistory');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearHistory();
      });
    }

    // Stock selection items
    const stockItems = dropdownList.querySelectorAll('[data-ticker]');
    stockItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const ticker = item.getAttribute('data-ticker');
        this.selectStock(ticker);
      });
    });
  }

  // Select a stock from recent list
  async selectStock(ticker) {
    if (!ticker) return;

    try {
      // Update form inputs
      const tickerInput = document.getElementById('ticker');
      if (tickerInput) {
        tickerInput.value = ticker.toUpperCase();
      }

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('recentlyViewedBtn'));
      if (dropdown) {
        dropdown.hide();
      }

      // Trigger analysis
      await analyze(ticker.toUpperCase());
      
      // Show success toast
      showToast(`Loaded analysis for ${ticker.toUpperCase()}`, 'success');
      
    } catch (error) {
      console.error('Error selecting recent stock:', error);
      showToast(`Failed to load ${ticker}: ${error.message}`, 'danger');
    }
  }

  // Clear all recent history
  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      this.updateDropdown();
      showToast('Recent history cleared', 'info');
    } catch (error) {
      console.error('Error clearing history:', error);
      showToast('Failed to clear history', 'danger');
    }
  }

  // Initialize the recently viewed functionality
  init() {
    this.updateDropdown();
    
    // Update dropdown when it's about to be shown (ensures fresh data)
    const dropdownBtn = document.getElementById('recentlyViewedBtn');
    if (dropdownBtn) {
      dropdownBtn.addEventListener('show.bs.dropdown', () => {
        this.updateDropdown();
      });
    }
  }
}

// Global instance
const recentlyViewedStocks = new RecentlyViewedStocks();

// Function to add a stock to recent history (called after successful analysis)
function addToRecentlyViewed(ticker) {
  recentlyViewedStocks.addStock(ticker);
}

// Function to initialize recently viewed functionality
function initRecentlyViewed() {
  recentlyViewedStocks.init();
}
