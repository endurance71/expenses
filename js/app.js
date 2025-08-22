// =================================
// APP.JS - Główna aplikacja
// Version: 1.0.4 - FIXED
// =================================

// Global application namespace
window.WydatkiApp = {
    // Application state
    state: {
        currentData: null,
        currentView: 'dashboard',
        currentCategory: null,
        currentYear: null,
        currentMonth: null,
        isOnline: navigator.onLine,
        isLoading: false,
        chart: null
    },
    
    // Initialize application
    async init() {
        Utils.debugLog('🚀 Initializing WydatkiApp...');
        
        try {
            // Check dependencies
            if (!this.checkDependencies()) {
                throw new Error('Missing critical dependencies');
            }
            
            // Setup date selectors
            this.initializeDateSelectors();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize components
            this.initializeComponents();
            
            // Load initial data
            await this.loadInitialData();
            
            // Register service worker
            await this.registerServiceWorker();
            
            // Apply iOS optimizations
            this.applyIOSOptimizations();
            
            // Hide loading screen
            Utils.hideLoading();
            
            Utils.debugLog('✅ App initialized successfully');
            
        } catch (error) {
            Utils.debugLog('❌ Initialization failed:', error);
            Utils.showError('Nie można zainicjalizować aplikacji');
        }
    },
    
    // Check critical dependencies
    checkDependencies() {
        if (typeof Chart === 'undefined') {
            Utils.debugLog('❌ Chart.js not available');
            Utils.showError('Chart.js nie został załadowany');
            return false;
        }
        
        if (!window.APIService) {
            Utils.debugLog('❌ API Service not available');
            return false;
        }
        
        return true;
    },
    
    // Initialize date selectors
    initializeDateSelectors() {
        const now = new Date();
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (yearSelect) {
            const savedYear = Utils.storage.get(APP_CONFIG.STORAGE_KEYS.SELECTED_YEAR);
            yearSelect.value = savedYear || String(now.getFullYear());
            this.state.currentYear = yearSelect.value;
        }
        
        if (monthSelect) {
            const savedMonth = Utils.storage.get(APP_CONFIG.STORAGE_KEYS.SELECTED_MONTH);
            monthSelect.value = savedMonth || String(now.getMonth() + 1).padStart(2, '0');
            this.state.currentMonth = monthSelect.value;
        }
    },
    
    // Setup all event listeners
    setupEventListeners() {
        Utils.debugLog('Setting up event listeners...');
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        // Date selectors
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.state.currentYear = e.target.value;
                Utils.storage.set(APP_CONFIG.STORAGE_KEYS.SELECTED_YEAR, e.target.value);
                this.onDateChange();
            });
        }
        
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                this.state.currentMonth = e.target.value;
                Utils.storage.set(APP_CONFIG.STORAGE_KEYS.SELECTED_MONTH, e.target.value);
                this.onDateChange();
            });
        }
        
        // Summary cards
        const summaryCards = document.querySelectorAll('.summary-card');
        summaryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                if (category) {
                    window.DashboardManager.showCategoryView(category);
                }
            });
        });
        
        // Tab bar - FIXED
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Handle add expense button FIRST before closing other modals
                if (item.id === 'addExpenseTab') {
                    // Check if expense form is already open
                    const addExpenseSheet = document.getElementById('addExpenseSheet');
                    const isOpen = addExpenseSheet && addExpenseSheet.classList.contains('open');
                    
                    if (isOpen) {
                        // If open, close it
                        if (window.ExpenseFormManager) {
                            window.ExpenseFormManager.hide();
                        }
                    } else {
                        // If closed, close other modals first, then open expense form
                        const transactionSheet = document.getElementById('transactionSheet');
                        if (transactionSheet && transactionSheet.classList.contains('open')) {
                            if (window.DashboardManager) {
                                window.DashboardManager.hideBottomSheet();
                            }
                        }
                        
                        setTimeout(() => {
                            if (window.ExpenseFormManager) {
                                window.ExpenseFormManager.show();
                            }
                        }, 100);
                    }
                    return;
                }
                
                // Close any open modals for other buttons
                const addExpenseSheet = document.getElementById('addExpenseSheet');
                const transactionSheet = document.getElementById('transactionSheet');
                
                // Close add expense form if open
                if (addExpenseSheet && addExpenseSheet.classList.contains('open')) {
                    if (window.ExpenseFormManager) {
                        window.ExpenseFormManager.hide();
                    }
                }
                
                // Close transaction sheet if open  
                if (transactionSheet && transactionSheet.classList.contains('open')) {
                    if (window.DashboardManager) {
                        window.DashboardManager.hideBottomSheet();
                    }
                }
                
                // Handle navigation
                const view = item.dataset.view;
                const category = item.dataset.category;
                
                if (view === 'dashboard') {
                    window.DashboardManager.showDashboard();
                } else if (category) {
                    window.DashboardManager.showCategoryView(category);
                }
            });
        });
        
        // Bottom sheet controls
        this.setupBottomSheetListeners();
        
        // Network status listeners
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            Utils.debugLog('🌐 Back online');
            this.refreshData();
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            Utils.debugLog('📱 Gone offline');
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (window.DashboardManager) {
                    window.DashboardManager.hideBottomSheet();
                    window.DashboardManager.showDashboard();
                }
            }
        });
        
        // Pull to refresh
        this.initializePullToRefresh();
    },
    
    // Setup bottom sheet listeners
    setupBottomSheetListeners() {
        const sheetBackdrop = document.getElementById('sheetBackdrop');
        const closeSheet = document.getElementById('closeSheet');
        const sheetHandle = document.getElementById('sheetHandle');
        
        const closeHandler = () => {
            if (window.DashboardManager) {
                window.DashboardManager.hideBottomSheet();
                window.DashboardManager.showDashboard();
            }
        };
        
        if (sheetBackdrop) {
            sheetBackdrop.addEventListener('click', closeHandler);
        }
        
        if (closeSheet) {
            closeSheet.addEventListener('click', closeHandler);
        }
        
        if (sheetHandle) {
            sheetHandle.addEventListener('click', closeHandler);
        }
    },
    
    // Initialize components
    initializeComponents() {
        // Initialize dashboard manager
        if (window.DashboardManager) {
            window.DashboardManager.init();
        }
        
        // Initialize yearly chart
        if (window.YearlyChartManager) {
            window.YearlyChartManager.init();
        }
        
        // Initialize expense form
        if (window.ExpenseFormManager) {
            window.ExpenseFormManager.init();
        }
        
        // Initialize expense delete manager
        if (window.ExpenseDeleteManager) {
            window.ExpenseDeleteManager.init();
        }
        
        // Initialize receipt viewer
        if (window.ReceiptViewer) {
            window.ReceiptViewer.init();
        }
    },
    
    // Load initial data
    async loadInitialData() {
        Utils.debugLog('Loading initial data...');
        
        try {
            const data = await window.APIService.fetchExpenseData(
                this.state.currentYear,
                this.state.currentMonth
            );
            
            this.state.currentData = data;
            
            // Update dashboard
            if (window.DashboardManager) {
                window.DashboardManager.updateWithData(data);
            }
            
            return data;
            
        } catch (error) {
            Utils.debugLog('Failed to load initial data:', error);
            throw error;
        }
    },
    
    // Refresh data
    async refreshData() {
        if (this.state.isLoading) {
            Utils.debugLog('Already loading, skipping refresh');
            return;
        }
        
        Utils.debugLog('🔄 Refreshing data...');
        window.HapticManager && window.HapticManager.medium();
        
        this.state.isLoading = true;
        
        try {
            const data = await window.APIService.fetchExpenseData(
                this.state.currentYear,
                this.state.currentMonth
            );
            
            this.state.currentData = data;
            
            // Update dashboard
            if (window.DashboardManager) {
                window.DashboardManager.updateWithData(data);
            }
            
            // Update yearly chart if visible
            if (window.YearlyChartManager && window.YearlyChartManager.isVisible()) {
                window.YearlyChartManager.refresh();
            }
            
            window.HapticManager && window.HapticManager.success();
            Utils.debugLog('✅ Data refreshed successfully');
            
            // Save last refresh time
            Utils.storage.set(APP_CONFIG.STORAGE_KEYS.LAST_REFRESH, Date.now());
            
        } catch (error) {
            Utils.debugLog('❌ Failed to refresh data:', error);
            window.HapticManager && window.HapticManager.error();
            Utils.showError('Nie można odświeżyć danych');
        } finally {
            this.state.isLoading = false;
        }
    },
    
    // Handle date change
    onDateChange() {
        Utils.debugLog('📅 Date changed');
        window.HapticManager && window.HapticManager.selection();
        this.refreshData();
    },
    
    // Initialize pull to refresh
    initializePullToRefresh() {
        const mainContent = document.getElementById('mainContent');
        const pullIndicator = document.getElementById('pullToRefresh');
        
        if (!mainContent || !pullIndicator) return;
        
        let startY = 0;
        let currentY = 0;
        let pullDistance = 0;
        let isPulling = false;
        let isRefreshing = false;
        
        const PULL_THRESHOLD = APP_CONFIG.UI.PULL_TO_REFRESH_THRESHOLD;
        const MAX_PULL_DISTANCE = APP_CONFIG.UI.MAX_PULL_DISTANCE;
        
        const handleTouchStart = (e) => {
            if (mainContent.scrollTop === 0 && !isRefreshing) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        };
        
        const handleTouchMove = Utils.throttle((e) => {
            if (!isPulling || isRefreshing) return;
            
            currentY = e.touches[0].clientY;
            pullDistance = Math.max(0, currentY - startY);
            
            if (pullDistance > PULL_THRESHOLD && !pullIndicator.classList.contains('active')) {
                pullIndicator.classList.add('active');
                window.HapticManager && window.HapticManager.light();
            }
            
            const resistance = Math.min(pullDistance * 0.3, MAX_PULL_DISTANCE * 0.3);
            mainContent.style.transform = `translateY(${resistance}px)`;
        }, 16);
        
        const handleTouchEnd = async () => {
            if (!isPulling) return;
            
            if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
                isRefreshing = true;
                window.HapticManager && window.HapticManager.medium();
                
                setTimeout(async () => {
                    await this.refreshData();
                    isRefreshing = false;
                    pullIndicator.classList.remove('active');
                }, 800);
            } else {
                pullIndicator.classList.remove('active');
            }
            
            isPulling = false;
            pullDistance = 0;
            mainContent.style.transform = '';
            mainContent.style.transition = 'transform 0.3s ease-out';
            
            setTimeout(() => {
                mainContent.style.transition = '';
            }, 300);
        };
        
        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchmove', handleTouchMove, { passive: true });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
    },
    
    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                Utils.debugLog('✅ Service Worker registered:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    Utils.debugLog('🔄 Service Worker update found');
                });
                
            } catch (error) {
                Utils.debugLog('❌ Service Worker registration failed:', error);
            }
        }
    },
    
    // Apply iOS-specific optimizations
    applyIOSOptimizations() {
        // Prevent zoom on input focus
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
        }
        
        // Prevent bounce scrolling
        document.body.style.overscrollBehavior = 'none';
        
        // Update status bar color
        Utils.updateStatusBarColor();
        
        // Listen for theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            Utils.updateStatusBarColor();
        });
        
        // Enhanced touch interactions
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Handle standalone mode
        if (Utils.isStandalone()) {
            document.body.classList.add('standalone-mode');
        }
    },
    
    // Handle app lifecycle
    setupAppLifecycle() {
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.isOnline) {
                const lastRefresh = Utils.storage.get(APP_CONFIG.STORAGE_KEYS.LAST_REFRESH);
                const now = Date.now();
                
                // Refresh if more than 5 minutes since last refresh
                if (!lastRefresh || (now - lastRefresh) > 300000) {
                    this.refreshData();
                }
            }
        });
        
        // Handle before unload
        window.addEventListener('beforeunload', () => {
            // Clean up chart
            if (this.state.chart) {
                this.state.chart.destroy();
            }
        });
    }
};

// =================================
// Initialize app when DOM is ready
// =================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM loaded, starting app initialization...');
    
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        WydatkiApp.init();
    }, 100);
});

// =================================
// Global error handling
// =================================
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
    if (window.Utils) {
        Utils.showError('Wystąpił nieoczekiwany błąd aplikacji');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    if (window.Utils) {
        Utils.showError('Wystąpił błąd podczas ładowania danych');
    }
    event.preventDefault();
});

// Export for debugging
window.appDebug = {
    state: () => WydatkiApp.state,
    refresh: () => WydatkiApp.refreshData(),
    config: APP_CONFIG,
    utils: Utils
};