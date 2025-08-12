// =================================
// UTILS.JS - Wspólne funkcje pomocnicze
// =================================

window.Utils = {
    // Debug logging
    debugLog(message, data = null) {
        if (window.APP_CONFIG.APP.DEBUG_MODE) {
            console.log(`🔍 DEBUG: ${message}`, data || '');
        }
    },
    
    // Currency formatting
    formatCurrency(amount) {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },
    
    // Date formatting
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(date);
        } catch (error) {
            this.debugLog('Date formatting error:', error);
            return dateString;
        }
    },
    
    // Get month name
    getMonthName(month) {
        const months = [
            'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
            'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
        ];
        return months[parseInt(month) - 1] || months[0];
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    
    // Animate value
    animateValue(element, start, end, duration, formatter = null) {
        if (!element) return;
        
        const startTime = performance.now();
        const difference = end - start;
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = start + (difference * easeOutCubic);
            
            if (formatter) {
                element.textContent = formatter(Math.floor(current));
            } else {
                element.textContent = Math.floor(current);
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    },
    
    // Show loading
    showLoading() {
        this.debugLog('Showing loading screen');
        const loading = document.getElementById('loading');
        const appContainer = document.getElementById('appContainer');
        if (loading) loading.classList.remove('hidden');
        if (appContainer) appContainer.style.display = 'none';
    },
    
    // Hide loading
    hideLoading() {
        this.debugLog('Hiding loading screen');
        const loading = document.getElementById('loading');
        const appContainer = document.getElementById('appContainer');
        if (loading && appContainer) {
            loading.classList.add('hidden');
            appContainer.style.display = 'flex';
        }
    },
    
    // Show error modal
    showError(message) {
        this.debugLog('Showing error:', message);
        if (window.HapticManager) {
            window.HapticManager.error();
        }
        // Simple alert as fallback - replace with modal if needed
        alert(`Błąd: ${message}`);
    },
    
    // Parse query parameters
    parseQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },
    
    // Storage helpers
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                Utils.debugLog('Storage set error:', error);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                Utils.debugLog('Storage get error:', error);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                Utils.debugLog('Storage remove error:', error);
                return false;
            }
        },
        
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                Utils.debugLog('Storage clear error:', error);
                return false;
            }
        }
    },
    
    // Check if iOS device
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    },
    
    // Check if standalone PWA
    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    },
    
    // Update status bar color
    updateStatusBarColor() {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
        
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', isDarkMode ? '#1C1C1E' : '#F2F2F7');
        }
    },
    
    // Generate fallback data
    generateEmptyData(year, month) {
        this.debugLog(`Generating empty data for ${month}/${year}`);
        return {
            monthlyExpenses: 0,
            currentMonth: `${this.getMonthName(month)} ${year}`,
            expenseCategories: Object.keys(window.APP_CONFIG.CATEGORIES).map(name => ({
                name: name,
                amount: 0,
                percentage: 0,
                transactionCount: 0,
                color: window.APP_CONFIG.CATEGORIES[name].color
            })),
            recentTransactions: []
        };
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Utils;
}