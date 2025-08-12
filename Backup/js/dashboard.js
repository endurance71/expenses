// =================================
// DASHBOARD.JS - Dashboard Manager
// Version: 1.0.3
// =================================

window.DashboardManager = {
    // Dashboard state
    chart: null,
    currentView: 'dashboard',
    currentCategory: null,
    
    // Initialize dashboard
    init() {
        Utils.debugLog('Initializing Dashboard Manager');
        this.setupChartTypeButtons();
    },
    
    // Setup chart type buttons for yearly chart
    setupChartTypeButtons() {
        const lineBtn = document.getElementById('chartTypeLineBtn');
        const barBtn = document.getElementById('chartTypeBarBtn');
        const loadBtn = document.getElementById('loadYearlyChartBtn');
        
        if (lineBtn) {
            lineBtn.addEventListener('click', () => {
                if (window.YearlyChartManager) {
                    window.YearlyChartManager.switchChartType('line');
                }
            });
        }
        
        if (barBtn) {
            barBtn.addEventListener('click', () => {
                if (window.YearlyChartManager) {
                    window.YearlyChartManager.switchChartType('bar');
                }
            });
        }
        
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                if (window.YearlyChartManager) {
                    window.YearlyChartManager.loadChart();
                }
            });
        }
    },
    
    // Update dashboard with data
    updateWithData(data) {
        Utils.debugLog('Updating dashboard with data:', data);
        
        this.updateSummaryCards(data);
        this.updateChart(data.expenseCategories);
        this.updateStats(data);
        this.updateRecentTransactions(data.recentTransactions);
        
        // Update category view if active
        if (this.currentView === 'category' && this.currentCategory) {
            this.updateCategoryTransactions(data.recentTransactions, this.currentCategory);
        }
    },
    
    // Update summary cards
    updateSummaryCards(data) {
        const categoryTotals = {
            'Prywatne': { amount: 0, transactions: 0 },
            'MT HUB': { amount: 0, transactions: 0 },
            'FHU': { amount: 0, transactions: 0 }
        };
        
        // Calculate totals
        if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
            data.expenseCategories.forEach(category => {
                if (categoryTotals[category.name]) {
                    categoryTotals[category.name].amount = category.amount || 0;
                    categoryTotals[category.name].transactions = category.transactionCount || 0;
                }
            });
        }
        
        // Update each card
        Object.keys(categoryTotals).forEach(category => {
            const card = document.querySelector(`.summary-card[data-category="${category}"]`);
            if (card) {
                const amountEl = card.querySelector('.summary-card-amount');
                const subtitleEl = card.querySelector('.summary-card-subtitle');
                
                if (amountEl) {
                    Utils.animateValue(
                        amountEl, 
                        0, 
                        categoryTotals[category].amount, 
                        800, 
                        Utils.formatCurrency
                    );
                }
                
                if (subtitleEl) {
                    subtitleEl.textContent = `${categoryTotals[category].transactions} transakcji`;
                }
            }
        });
    },
    
    // Update chart
    updateChart(categories) {
        Utils.debugLog('📊 Updating chart with categories:', categories);
        
        const ctx = document.getElementById('expenseChart');
        if (!ctx) {
            Utils.debugLog('❌ Canvas element not found');
            return;
        }
        
        // Check Chart.js
        if (typeof Chart === 'undefined') {
            Utils.debugLog('❌ Chart.js not loaded');
            return;
        }
        
        // Destroy previous chart
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // Prepare data
        let validCategories = [];
        if (categories && Array.isArray(categories)) {
            validCategories = categories.filter(cat => cat && cat.amount > 0);
        }
        
        // If no data, show placeholder
        if (validCategories.length === 0) {
            validCategories.push({
                name: 'Brak danych',
                amount: 1,
                color: '#E5E5EA'
            });
        }
        
        try {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: validCategories.map(cat => cat.name),
                    datasets: [{
                        data: validCategories.map(cat => cat.amount),
                        backgroundColor: validCategories.map(cat => 
                            cat.color || APP_CONFIG.CATEGORIES[cat.name]?.color || '#007AFF'
                        ),
                        borderWidth: 0,
                        hoverBorderWidth: 3,
                        hoverBorderColor: '#ffffff',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: APP_CONFIG.CHART.TOOLTIP.BACKGROUND,
                            titleColor: APP_CONFIG.CHART.TOOLTIP.TEXT_COLOR,
                            bodyColor: APP_CONFIG.CHART.TOOLTIP.TEXT_COLOR,
                            cornerRadius: APP_CONFIG.CHART.TOOLTIP.CORNER_RADIUS,
                            padding: 12,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = Utils.formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.parsed / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: APP_CONFIG.CHART.CUTOUT_PERCENTAGE,
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: APP_CONFIG.CHART.ANIMATION_DURATION,
                        easing: APP_CONFIG.CHART.ANIMATION_EASING
                    }
                }
            });
            
            Utils.debugLog('✅ Chart created successfully');
            
        } catch (error) {
            Utils.debugLog('❌ Chart creation failed:', error);
            Utils.showError('Nie można utworzyć wykresu');
        }
    },
    
    // Update stats
    updateStats(data) {
        const totalExpenses = data.monthlyExpenses || 0;
        const totalTransactions = data.recentTransactions?.length || 0;
        
        const totalExpensesEl = document.getElementById('totalExpenses');
        const transactionCountEl = document.getElementById('transactionCount');
        
        if (totalExpensesEl) {
            Utils.animateValue(totalExpensesEl, 0, totalExpenses, 1000, Utils.formatCurrency);
        }
        
        if (transactionCountEl) {
            Utils.animateValue(transactionCountEl, 0, totalTransactions, 800);
        }
    },
    
    // Update recent transactions
    updateRecentTransactions(transactions) {
        const container = document.getElementById('recentTransactionsList');
        if (!container) return;
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">Brak transakcji</div>
                    <div class="empty-subtitle">Nie znaleziono ostatnich transakcji</div>
                </div>
            `;
            return;
        }
        
        // Show only 5 most recent
        const recentTransactions = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        container.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon">
                    ${APP_CONFIG.CATEGORIES[transaction.category]?.icon || '💰'}
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.description || 'Bez opisu'}</div>
                    <div class="transaction-meta">
                        ${Utils.formatDate(transaction.date)} • ${transaction.category}
                    </div>
                </div>
                <div class="transaction-amount">
                    ${Utils.formatCurrency(transaction.amount || 0)}
                </div>
            </div>
        `).join('');
    },
    
    // Show dashboard view
    showDashboard() {
        Utils.debugLog('🏠 Showing dashboard');
        HapticManager.light();
        
        this.currentView = 'dashboard';
        this.currentCategory = null;
        
        // Update title
        const navTitle = document.getElementById('navTitle');
        if (navTitle) navTitle.textContent = 'Dashboard';
        
        // Update views
        const dashboardView = document.getElementById('dashboardView');
        const categoryViews = document.getElementById('categoryViews');
        
        if (dashboardView) dashboardView.classList.remove('hidden');
        if (categoryViews) categoryViews.classList.add('hidden');
        
        // Update navigation
        const navHeader = document.getElementById('navHeader');
        const mainContent = document.getElementById('mainContent');
        
        if (navHeader) navHeader.classList.remove('category-view');
        if (mainContent) mainContent.classList.remove('category-view');
        
        // Hide bottom sheet
        this.hideBottomSheet();
        
        // Update tab bar
        this.updateTabBar('dashboard');
    },
    
    // Show category view
    showCategoryView(category) {
        Utils.debugLog(`📊 Showing category: ${category}`);
        HapticManager.light();
        
        this.currentView = 'category';
        this.currentCategory = category;
        
        // Update title
        const navTitle = document.getElementById('navTitle');
        if (navTitle) navTitle.textContent = category;
        
        // Update views
        const dashboardView = document.getElementById('dashboardView');
        const categoryViews = document.getElementById('categoryViews');
        
        if (dashboardView) dashboardView.classList.add('hidden');
        if (categoryViews) categoryViews.classList.remove('hidden');
        
        // Update navigation
        const navHeader = document.getElementById('navHeader');
        const mainContent = document.getElementById('mainContent');
        
        if (navHeader) navHeader.classList.add('category-view');
        if (mainContent) mainContent.classList.add('category-view');
        
        // Show transactions for category
        if (WydatkiApp.state.currentData && WydatkiApp.state.currentData.recentTransactions) {
            const categoryTransactions = WydatkiApp.state.currentData.recentTransactions
                .filter(t => t.category === category)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.showBottomSheet(category, categoryTransactions);
        }
        
        // Update tab bar
        this.updateTabBar(category);
    },
    
    // Show bottom sheet
    showBottomSheet(title, transactions) {
        const sheet = document.getElementById('transactionSheet');
        const backdrop = document.getElementById('sheetBackdrop');
        const sheetTitle = document.getElementById('sheetTitle');
        const sheetContent = document.getElementById('sheetContent');
        
        if (!sheet || !backdrop || !sheetTitle || !sheetContent) return;
        
        sheetTitle.textContent = `${title} - Transakcje`;
        
        if (!transactions || transactions.length === 0) {
            sheetContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">Brak transakcji</div>
                    <div class="empty-subtitle">Nie znaleziono transakcji dla kategorii ${title}</div>
                </div>
            `;
        } else {
            sheetContent.innerHTML = transactions.map(transaction => `
                <div class="transaction-item">
                    <div class="transaction-icon">
                        ${APP_CONFIG.CATEGORIES[transaction.category]?.icon || '💰'}
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">${transaction.description || 'Bez opisu'}</div>
                        <div class="transaction-meta">
                            ${Utils.formatDate(transaction.date)} • ${transaction.category}
                        </div>
                    </div>
                    <div class="transaction-amount">
                        ${Utils.formatCurrency(transaction.amount || 0)}
                    </div>
                </div>
            `).join('');
        }
        
        // Show with animation
        backdrop.classList.add('open');
        requestAnimationFrame(() => {
            sheet.classList.add('open');
        });
        
        HapticManager.light();
    },
    
    // Hide bottom sheet
    hideBottomSheet() {
        const sheet = document.getElementById('transactionSheet');
        const backdrop = document.getElementById('sheetBackdrop');
        
        if (sheet) sheet.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        
        HapticManager.light();
    },
    
    // Update tab bar
    updateTabBar(activeItem) {
        const tabItems = document.querySelectorAll('.tab-item');
        
        tabItems.forEach(item => {
            const view = item.dataset.view;
            const category = item.dataset.category;
            
            const isActive = (view === activeItem) || (category === activeItem);
            
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive.toString());
        });
    },
    
    // Update category transactions
    updateCategoryTransactions(transactions, category) {
        if (!transactions || !category) return;
        
        const categoryTransactions = transactions
            .filter(t => t.category === category)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.showBottomSheet(category, categoryTransactions);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.DashboardManager;
}