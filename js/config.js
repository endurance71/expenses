// =================================
// CONFIG.JS - Globalna konfiguracja aplikacji
// =================================

window.APP_CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'https://jan204-20204.wykr.es/webhook',
        ENDPOINTS: {
            DASHBOARD: '/dashboard-wydatki',
            YEARLY: '/dashboard-wydatki-yearly',
            ADD_EXPENSE: '/dashboard-add-expense'
        },
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // App Settings
    APP: {
        VERSION: '1.0.3',
        DEBUG_MODE: false, // Set to false in production
        CACHE_NAME: 'dashboard-wydatki-v1.0.3',
        DEFAULT_YEAR: new Date().getFullYear(),
        DEFAULT_MONTH: String(new Date().getMonth() + 1).padStart(2, '0')
    },
    
    // Categories Configuration
    CATEGORIES: {
        'Prywatne': { 
            icon: '🏠', 
            color: '#34C759',
            label: 'Prywatne'
        },
        'MT HUB': { 
            icon: '🔧', 
            color: '#007AFF',
            label: 'MT HUB'
        },
        'FHU': { 
            icon: '⛽', 
            color: '#FF2D92',
            label: 'FHU'
        }
    },
    
    // Chart Settings
    CHART: {
        ANIMATION_DURATION: 1000,
        ANIMATION_EASING: 'easeOutCubic',
        CUTOUT_PERCENTAGE: '65%',
        DEFAULT_COLOR: '#E5E5EA',
        TOOLTIP: {
            BACKGROUND: 'rgba(0, 0, 0, 0.8)',
            TEXT_COLOR: '#fff',
            CORNER_RADIUS: 8
        }
    },
    
    // UI Settings
    UI: {
        ANIMATION_DURATION: {
            FAST: 200,
            NORMAL: 300,
            SLOW: 500
        },
        PULL_TO_REFRESH_THRESHOLD: 140,
        MAX_PULL_DISTANCE: 180,
        HAPTIC_ENABLED: true
    },
    
    // Storage Keys
    STORAGE_KEYS: {
        LAST_REFRESH: 'lastRefresh',
        SELECTED_YEAR: 'selectedYear',
        SELECTED_MONTH: 'selectedMonth',
        PREFERRED_VIEW: 'preferredView'
    }
};

// Freeze config to prevent modifications
Object.freeze(window.APP_CONFIG);
Object.freeze(window.APP_CONFIG.API);
Object.freeze(window.APP_CONFIG.CATEGORIES);
Object.freeze(window.APP_CONFIG.CHART);
Object.freeze(window.APP_CONFIG.UI);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}