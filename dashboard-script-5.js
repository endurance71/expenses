// =================================
// iOS Native PWA JavaScript - v18 FIXED
// POPRAWKI: Wykres, error handling, debugging
// =================================

// Global state
const appState = {
    currentData: null,
    currentView: 'dashboard',
    currentCategory: null,
    filteredTransactions: [],
    chart: null,
    isOnline: navigator.onLine
};

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://jan204-20204.wykr.es/webhook/dashboard-wydatki',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
};

// Categories configuration
const CATEGORIES = {
    'Prywatne': { icon: '🏠', color: '#34C759' },
    'MT HUB': { icon: '🔧', color: '#007AFF' },
    'FHU': { icon: '⛽', color: '#FF2D92' }
};

// Debug mode
const DEBUG = true;

function debugLog(message, data = null) {
    if (DEBUG) {
        console.log(`🔍 DEBUG: ${message}`, data || '');
    }
}

// iOS Haptic Feedback
class HapticFeedback {
    static light() {
        if ('vibrate' in navigator) navigator.vibrate(10);
    }
    
    static medium() {
        if ('vibrate' in navigator) navigator.vibrate(20);
    }
    
    static success() {
        if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
    }
    
    static error() {
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50, 30, 50]);
    }
    static selection() {  // DODAJ TĘ METODĘ
        if ('vibrate' in navigator) navigator.vibrate(5);
    }
}

// NOWE: Funkcja do przełączania na pełnoekranowy widok transakcji
function toggleFullscreenTransactions(isTransactionView) {
    const mainContent = document.querySelector('.main-content');
    const appContainer = document.querySelector('.app-container');
    
    if (isTransactionView) {
        mainContent.classList.add('fullscreen-transactions');
        appContainer.classList.add('transaction-view-active');
    } else {
        mainContent.classList.remove('fullscreen-transactions');
        appContainer.classList.remove('transaction-view-active');
    }
}

// Status bar color management
function updateStatusBarColor() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    
    if (themeColorMeta) {
        if (isDarkMode) {
            themeColorMeta.setAttribute('content', '#1C1C1E');
        } else {
            themeColorMeta.setAttribute('content', '#F2F2F7');
        }
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    } catch (error) {
        debugLog('Date formatting error:', error);
        return dateString;
    }
}

function getMonthName(month) {
    const months = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return months[parseInt(month) - 1] || months[0];
}

// Loading States
function showLoading() {
    debugLog('Showing loading screen');
    const loading = document.getElementById('loading');
    const appContainer = document.getElementById('appContainer');
    if (loading) loading.classList.remove('hidden');
    if (appContainer) appContainer.style.display = 'none';
}

function hideLoading() {
    debugLog('Hiding loading screen');
    const loading = document.getElementById('loading');
    const appContainer = document.getElementById('appContainer');
    if (loading && appContainer) {
        loading.classList.add('hidden');
        appContainer.style.display = 'flex';
    }
}

function showError(message) {
    debugLog('Showing error:', message);
    HapticFeedback.error();
    const errorMessage = document.getElementById('errorMessage');
    const modal = document.getElementById('errorModal');
    if (errorMessage) errorMessage.textContent = message;
    if (modal) modal.classList.remove('hidden');
}

function hideError() {
    debugLog('Hiding error modal');
    const modal = document.getElementById('errorModal');
    if (modal) modal.classList.add('hidden');
}

// Data Fetching
async function fetchWithRetry(url, options, attempt = 1) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        debugLog(`Fetch attempt ${attempt} failed:`, error);
        if (attempt < API_CONFIG.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * attempt));
            return fetchWithRetry(url, options, attempt + 1);
        }
        throw error;
    }
}

async function fetchExpenseData(year, month) {
    const url = new URL(API_CONFIG.baseUrl);
    if (year) url.searchParams.set('year', year);
    if (month) url.searchParams.set('month', month);
    
    debugLog(`Fetching data from: ${url.toString()}`);
    
    try {
        const response = await fetchWithRetry(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            mode: 'cors'
        });
        
        const text = await response.text();
        if (!text.trim()) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        debugLog('Successfully received data:', data);
        return data;
    } catch (error) {
        debugLog('API Error:', error);
        showError(`Błąd połączenia: ${error.message}`);
        return generateEmptyData(year, month);
    }
}

// FIXED: Generate empty data with minimal amounts for chart visibility
function generateEmptyData(year, month) {
    debugLog(`Generating empty data for ${month}/${year}`);
    return {
        monthlyExpenses: 0,
        currentMonth: `${getMonthName(month)} ${year}`,
        expenseCategories: [
            { name: 'Prywatne', amount: 10, percentage: 33, transactionCount: 0, color: '#34C759' },
            { name: 'FHU', amount: 10, percentage: 33, transactionCount: 0, color: '#007AFF' },
            { name: 'MT HUB', amount: 10, percentage: 34, transactionCount: 0, color: '#FF2D92' }
        ],
        recentTransactions: []
    };
}

// UI Updates
function updateCategoryCards(data) {
    debugLog('Updating category cards with data:', data);
    
    // Initialize category totals
    const categoryTotals = {
        'Prywatne': { amount: 0, transactions: 0 },
        'MT HUB': { amount: 0, transactions: 0 },
        'FHU': { amount: 0, transactions: 0 }
    };
    
    // Calculate totals from expense categories
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
        data.expenseCategories.forEach(category => {
            if (categoryTotals[category.name]) {
                categoryTotals[category.name].amount = category.amount || 0;
                categoryTotals[category.name].transactions = category.transactionCount || 0;
            }
        });
    }
    
    // Update cards
    const updateCard = (selector, amount, transactions) => {
        const amountEl = document.querySelector(`${selector} .card-amount`);
        const transactionsEl = document.querySelector(`${selector} .card-subtitle`);
        if (amountEl && transactionsEl) {
            amountEl.textContent = formatCurrency(amount);
            transactionsEl.textContent = `${transactions} transakcji`;
        }
    };
    
    updateCard('.private-card', categoryTotals['Prywatne'].amount, categoryTotals['Prywatne'].transactions);
    updateCard('.mthub-card', categoryTotals['MT HUB'].amount, categoryTotals['MT HUB'].transactions);
    updateCard('.fhu-card', categoryTotals['FHU'].amount, categoryTotals['FHU'].transactions);
    
    // Update summary stats
    const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.amount, 0);
    const totalTransactions = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.transactions, 0);
    
    const totalExpensesEl = document.getElementById('totalExpenses');
    const transactionCountEl = document.getElementById('transactionCount');
    
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
    if (transactionCountEl) transactionCountEl.textContent = totalTransactions;
    
    // FIXED: Always try to update chart
    if (data.expenseCategories) {
        debugLog('Calling updateChart with categories:', data.expenseCategories);
        updateChart(data.expenseCategories);
    } else {
        debugLog('No expenseCategories found, using empty data');
        updateChart([]);
    }
}

// FIXED: Improved chart function with better error handling
function updateChart(categories) {
    debugLog('📊 Updating chart with categories:', categories);
    
    const ctx = document.getElementById('expenseChart');
    if (!ctx) {
        debugLog('❌ Canvas element not found!');
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        debugLog('❌ Chart.js not loaded!');
        showError('Chart.js nie został załadowany. Sprawdź połączenie internetowe.');
        return;
    }
    
    // Destroy previous chart
    if (appState.chart) {
        appState.chart.destroy();
        appState.chart = null;
        debugLog('Previous chart destroyed');
    }
    
    // Validate data
    if (!categories || !Array.isArray(categories)) {
        debugLog('❌ Invalid categories data:', categories);
        categories = [];
    }
    
    // Filter valid categories (amount > 0)
    const validCategories = categories.filter(cat => cat && cat.amount && cat.amount > 0);
    debugLog('Valid categories for chart:', validCategories);
    
    // Show container
    const chartContainer = ctx.parentElement;
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
    
    // If no valid data, show placeholder chart
    if (validCategories.length === 0) {
        debugLog('No valid data, showing placeholder');
        validCategories.push(
            { name: 'Brak danych', amount: 1, color: '#E5E5EA' }
        );
    }
    
    try {
        appState.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: validCategories.map(cat => cat.name),
                datasets: [{
                    data: validCategories.map(cat => cat.amount),
                    backgroundColor: validCategories.map(cat => cat.color || '#007AFF'),
                    borderWidth: 0,
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#007AFF',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                try {
                                    const label = context.label || '';
                                    const value = formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.parsed / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                } catch (error) {
                                    debugLog('Tooltip error:', error);
                                    return context.label || 'Brak danych';
                                }
                            }
                        }
                    }
                },
                cutout: '65%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeOutCubic'
                }
            }
        });
        
        debugLog('✅ Chart created successfully');
        
    } catch (error) {
        debugLog('❌ Chart creation failed:', error);
        showError('Nie można utworzyć wykresu. Spróbuj odświeżyć stronę.');
    }
}

function updateTransactionsList(transactions, category = null) {
    debugLog('Updating transactions list for category:', category);
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    // Filter transactions if category specified
    let filteredTransactions = transactions || [];
    if (category && category !== 'dashboard') {
        filteredTransactions = filteredTransactions.filter(t => t.category === category);
    }
    
    // Update category summary - jedna linia
    const categoryAmount = document.getElementById('categoryAmount');
    const categoryCount = document.getElementById('categoryCount');
    const categoryTitle = document.getElementById('categoryTitle');
    
    if (categoryAmount && categoryCount && categoryTitle) {
        const total = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const count = filteredTransactions.length;
        
        categoryAmount.textContent = formatCurrency(total);
        categoryCount.textContent = `${count} transakcji`;
        
        if (category && category !== 'dashboard') {
            categoryTitle.textContent = `${category} - wydatki`;
        } else {
            categoryTitle.textContent = 'Wszystkie wydatki';
        }
    }
    
    if (!filteredTransactions || filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-title">Brak transakcji</div>
                <div class="empty-subtitle">Nie znaleziono transakcji dla wybranego okresu</div>
            </div>
        `;
        return;
    }
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        try {
            return new Date(b.date) - new Date(a.date);
        } catch (error) {
            debugLog('Date sorting error:', error);
            return 0;
        }
    });
    
    container.innerHTML = sortedTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-description">${transaction.description || 'Bez opisu'}</div>
                <div class="transaction-meta">
                    <span>${formatDate(transaction.date)}</span>
                    <span>•</span>
                    <span>${transaction.category || 'Bez kategorii'}</span>
                </div>
            </div>
            <div class="transaction-amount">${formatCurrency(transaction.amount || 0)}</div>
        </div>
    `).join('');
}

// POPRAWIONE: Navigation & Views
function showDashboard() {


    debugLog('🏠 Showing dashboard');
    HapticFeedback.light();
    
    appState.currentView = 'dashboard';
    appState.currentCategory = null;
    
    // Update title
    const appTitle = document.getElementById('appTitle');
    if (appTitle) appTitle.textContent = 'Dashboard';
    
    // Switch views
    const dashboard = document.getElementById('dashboard');
    const categoryView = document.getElementById('categoryView');
    
    if (dashboard) dashboard.classList.remove('hidden');
    if (categoryView) categoryView.classList.add('hidden');
    
    // Hide search
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) searchContainer.classList.add('hidden');
    
    // Update tab bar
    updateTabBar('dashboard');
    
    // NOWE: Wyłącz pełnoekranowy widok
    toggleFullscreenTransactions(false);
}

function showCategoryView(category) {
    debugLog(`📊 Showing category: ${category}`);
    HapticFeedback.light();
    
    appState.currentView = 'category';
    appState.currentCategory = category;
    
    // Update title
    const appTitle = document.getElementById('appTitle');
    if (appTitle) appTitle.textContent = category;
    
    // Switch views
    const dashboard = document.getElementById('dashboard');
    const categoryView = document.getElementById('categoryView');
    
    if (dashboard) dashboard.classList.add('hidden');
    if (categoryView) categoryView.classList.remove('hidden');
    
    // Update transactions list for this category
    if (appState.currentData && appState.currentData.recentTransactions) {
        updateTransactionsList(appState.currentData.recentTransactions, category);
    }
    
    // Hide search initially
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) searchContainer.classList.add('hidden');
    
    // Update tab bar
    updateTabBar(category);
    
    // NOWE: Włącz pełnoekranowy widok
    toggleFullscreenTransactions(true);
}

// Tab Bar
function updateTabBar(activeItem) {
    const tabItems = document.querySelectorAll('.tab-bar-item');
    
    tabItems.forEach(item => {
        const view = item.getAttribute('data-view');
        const category = item.getAttribute('data-category');
        
        if ((view && view === activeItem) || (category && category === activeItem)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}
// ===============================
// ADD EXPENSE FUNCTIONALITY
// ===============================

// Form state management
const expenseFormState = {
    category: 'Prywatne',
    isPayment: false,
    isOther: true
};

// Show Add Expense Sheet
function showAddExpenseSheet() {
    console.log('💰 Opening add expense sheet');
    HapticFeedback.medium();
    
    const sheet = document.getElementById('addExpenseSheet');
    const backdrop = document.getElementById('addExpenseBackdrop');
    
    if (!sheet || !backdrop) return;
    
    // Reset form
    resetExpenseForm();
    
    // Show backdrop and sheet
    backdrop.classList.add('open');
    requestAnimationFrame(() => {
        sheet.classList.add('open');
    });
    
    // Update add button state
    const addBtn = document.getElementById('addExpenseTab');
    if (addBtn) {
        addBtn.classList.add('active');
    }
}

// Hide Add Expense Sheet
function hideAddExpenseSheet() {
    console.log('💰 Closing add expense sheet');
    HapticFeedback.light();
    
    const sheet = document.getElementById('addExpenseSheet');
    const backdrop = document.getElementById('addExpenseBackdrop');
    const addBtn = document.getElementById('addExpenseTab');
    
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (addBtn) addBtn.classList.remove('active');
}

// Reset expense form
function resetExpenseForm() {
    const form = document.getElementById('addExpenseForm');
    if (form) form.reset();
    
    // Set default date to today
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    // Reset to default state
    expenseFormState.category = 'Prywatne';
    expenseFormState.isPayment = false;
    expenseFormState.isOther = true;
    
    // Update UI
    updateExpenseFormUI();
}

// Update form UI based on selections
function updateExpenseFormUI() {
    const subcategoryGroup = document.getElementById('subcategoryGroup');
    const companyGroup = document.getElementById('companyGroup');
    const paymentTypeGroup = document.getElementById('paymentTypeGroup');
    const descriptionGroup = document.getElementById('descriptionGroup');
    
    // Show/hide based on category
    if (expenseFormState.category === 'Prywatne') {
        if (subcategoryGroup) subcategoryGroup.classList.remove('hidden');
        if (companyGroup) companyGroup.classList.add('hidden');
    } else {
        if (subcategoryGroup) subcategoryGroup.classList.add('hidden');
        if (companyGroup) companyGroup.classList.remove('hidden');
    }
    
    // Show/hide based on expense type
    if (expenseFormState.isPayment) {
        if (paymentTypeGroup) paymentTypeGroup.classList.remove('hidden');
        if (descriptionGroup) descriptionGroup.classList.add('hidden');
    } else {
        if (paymentTypeGroup) paymentTypeGroup.classList.add('hidden');
        if (descriptionGroup) descriptionGroup.classList.remove('hidden');
    }
}

// Submit expense
async function submitExpense(e) {
    e.preventDefault();
    console.log('📤 Submitting expense');
    HapticFeedback.medium();
    
    const submitBtn = document.querySelector('.submit-button');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    
    try {
        // Gather form data
        const formData = {
            category: expenseFormState.category,
            date: document.getElementById('expenseDate').value,
            amount: parseFloat(document.getElementById('amount').value),
            timestamp: new Date().toISOString()
        };
        
        // Add category-specific data
        if (expenseFormState.category === 'Prywatne') {
            formData.subcategory = document.getElementById('subcategory').value;
        } else {
            formData.company = document.getElementById('company').value;
        }
        
        // Add expense type data
        if (expenseFormState.isPayment) {
            formData.type = 'payment';
            formData.paymentType = document.getElementById('paymentType').value;
        } else {
            formData.type = 'other';
            formData.description = document.getElementById('description').value;
        }
        
        console.log('📊 Form data:', formData);
        
        // Send to webhook
        const response = await fetch('https://jan204-20204.wykr.es/webhook/dashboard-add-expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // Success feedback
        HapticFeedback.success();
        if (submitBtn) {
            submitBtn.classList.add('success');
            setTimeout(() => {
                submitBtn.classList.remove('success');
                submitBtn.disabled = false;
            }, 2000);
        }
        
        // Close sheet and refresh data
        setTimeout(() => {
            hideAddExpenseSheet();
            refreshData();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error submitting expense:', error);
        HapticFeedback.error();
        showError('Nie udało się dodać wydatku. Spróbuj ponownie.');
        
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

// Setup expense form listeners
function setupExpenseFormListeners() {
    console.log('💰 Setting up expense form listeners');
    
    // Category selection
    const categoryButtons = document.querySelectorAll('.segment-button');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            HapticFeedback.selection();
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            expenseFormState.category = btn.dataset.category;
            updateExpenseFormUI();
        });
    });
    
    // Expense type checkboxes
    const paymentCheckbox = document.getElementById('isPayment');
    const otherCheckbox = document.getElementById('isOther');
    
    if (paymentCheckbox) {
        paymentCheckbox.addEventListener('change', (e) => {
            HapticFeedback.selection();
            expenseFormState.isPayment = e.target.checked;
            if (e.target.checked && otherCheckbox) {
                otherCheckbox.checked = false;
                expenseFormState.isOther = false;
            }
            updateExpenseFormUI();
        });
    }
    
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', (e) => {
            HapticFeedback.selection();
            expenseFormState.isOther = e.target.checked;
            if (e.target.checked && paymentCheckbox) {
                paymentCheckbox.checked = false;
                expenseFormState.isPayment = false;
            }
            updateExpenseFormUI();
        });
    }
    
    // Form submission
    const form = document.getElementById('addExpenseForm');
    if (form) {
        form.addEventListener('submit', submitExpense);
    }
    
    // Close buttons
    const closeBtn = document.getElementById('closeAddExpense');
    const backdrop = document.getElementById('addExpenseBackdrop');
    const handle = document.getElementById('addExpenseHandle');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', hideAddExpenseSheet);
    }
    if (backdrop) {
        backdrop.addEventListener('click', hideAddExpenseSheet);
    }
    if (handle) {
        handle.addEventListener('click', hideAddExpenseSheet);
    }
}
// NOWE: Search functionality - ulepszone dla kafelka
function toggleSearch() {
    HapticFeedback.light();
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    
    if (searchContainer) {
        searchContainer.classList.toggle('hidden');
        
        if (!searchContainer.classList.contains('hidden')) {
            // Focus na input z opóźnieniem dla animacji
            setTimeout(() => {
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = ''; // Wyczyść poprzednie wyszukiwanie
                }
            }, 300);
        } else {
            // Przywróć oryginalną listę po zamknięciu
            if (appState.currentData && appState.currentData.recentTransactions) {
                updateTransactionsList(appState.currentData.recentTransactions, appState.currentCategory);
            }
        }
    }
}

function filterTransactions() {
    const searchInput = document.getElementById('searchInput');
    const searchResultsPreview = document.getElementById('searchResultsPreview');
    const searchResultsCount = document.getElementById('searchResultsCount');
    
    if (!searchInput || !appState.currentData || !appState.currentData.recentTransactions) return;
    
    const query = searchInput.value.toLowerCase().trim();
    let transactions = appState.currentData.recentTransactions;
    
    // Filter by category if in category view
    if (appState.currentCategory && appState.currentCategory !== 'dashboard') {
        transactions = transactions.filter(t => t.category === appState.currentCategory);
    }
    
    // Filter by search query
    if (query) {
        transactions = transactions.filter(t => 
            (t.description && t.description.toLowerCase().includes(query)) ||
            (t.category && t.category.toLowerCase().includes(query))
        );
    }
    
    // Update results preview
    if (searchResultsPreview && searchResultsCount) {
        searchResultsCount.textContent = transactions.length;
        searchResultsPreview.style.display = query ? 'block' : 'none';
    }
    
    // Update transactions list
    updateTransactionsList(transactions, appState.currentCategory);
}

// Data refresh
async function refreshData() {
    debugLog('🔄 Refreshing data...');
    HapticFeedback.medium();
    
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) {
        debugLog('❌ Date selectors not found');
        return;
    }
    
    const month = monthSelect.value;
    const year = yearSelect.value;
    
    debugLog(`Refreshing data for ${month}/${year}`);
    showLoading();
    
    try {
        const data = await fetchExpenseData(year, month);
        appState.currentData = data;
        
        // Update UI
        updateCategoryCards(data);
        
        // If we're in category view, update transactions
        if (appState.currentView === 'category' && data.recentTransactions) {
            updateTransactionsList(data.recentTransactions, appState.currentCategory);
        }
        
        HapticFeedback.success();
        debugLog('✅ Data refreshed successfully');
        
    } catch (error) {
        debugLog('❌ Failed to refresh data:', error);
        showError('Nie można odświeżyć danych. Sprawdź połączenie internetowe.');
        HapticFeedback.error();
    } finally {
        hideLoading();
    }
}

// Date change handler
function onDateChange() {
    debugLog('📅 Date changed');
    refreshData();
}

// Initialize app
function initializeApp() {
    debugLog('🚀 Initializing iOS PWA...');
    
    // Check critical dependencies
    if (typeof Chart === 'undefined') {
        debugLog('❌ Chart.js not available!');
        showError('Chart.js nie został załadowany. Odśwież stronę.');
        return;
    }
    
    // Status bar color initialization
    updateStatusBarColor();
    
    // Set current month/year
    const now = new Date();
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = String(now.getMonth() + 1).padStart(2, '0');
    }
    if (yearSelect) {
        yearSelect.value = String(now.getFullYear());
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial data load
    refreshData();
    
    debugLog('✅ App initialized');
}

// NOWE: Setup all event listeners
function setupEventListeners() {
    debugLog('Setting up event listeners...');
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
        debugLog('✅ Refresh button listener added');
    }
    
    // Date selectors
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.addEventListener('change', onDateChange);
        debugLog('✅ Month selector listener added');
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', onDateChange);
        debugLog('✅ Year selector listener added');
    }
    

    // Tab bar - MODIFIED
// Tab bar - POPRAWIONY KOD
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // KLUCZOWA POPRAWKA - Sprawdź czy to przycisk "Dodaj"
                if (item.id === 'addExpenseTab') {
                    console.log('🎯 Add expense button clicked');
                    showAddExpenseSheet();
                    return; // Ważne - przerwij dalsze wykonywanie
                }
                
                const view = item.getAttribute('data-view');
                const category = item.getAttribute('data-category');
                
                if (view === 'dashboard') {
                    showDashboard();
                } else if (category) {
                    showCategoryView(category);
                }
            });
        });
    setupExpenseFormListeners();    
    debugLog(`✅ ${tabItems.length} tab bar listeners added`);
    
    // Summary cards
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.getAttribute('data-category');
            if (category) {
                showCategoryView(category);
            }
        });
    });
    debugLog(`✅ ${summaryCards.length} summary card listeners added`);
    
    // Search button
    const searchToggle = document.getElementById('searchToggle');
    if (searchToggle) {
        searchToggle.addEventListener('click', toggleSearch);
        debugLog('✅ Search toggle listener added');
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterTransactions);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                toggleSearch();
            }
        });
        debugLog('✅ Search input listeners added');
    }
    
    // Error modal
    const errorModal = document.getElementById('errorModal');
    if (errorModal) {
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                hideError();
            }
        });
        debugLog('✅ Error modal listener added');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM Content Loaded - starting initialization');
    
    // Small delay to ensure all resources are loaded
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Dark mode status bar listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateStatusBarColor);

// Network status
window.addEventListener('online', () => {
    appState.isOnline = true;
    debugLog('🌐 Back online');
    refreshData();
});

window.addEventListener('offline', () => {
    appState.isOnline = false;
    debugLog('📱 Gone offline');
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                debugLog('✅ SW registered:', registration);
            })
            .catch(error => {
                debugLog('❌ SW registration failed:', error);
            });
    });
}

// Export functions for global access (needed for inline event handlers)
window.hideError = hideError;
window.refreshData = refreshData;
window.toggleSearch = toggleSearch;
window.showAddExpenseSheet = showAddExpenseSheet;  // DODAJ TĘ LINIĘ
window.hideAddExpenseSheet = hideAddExpenseSheet; 

// Global error handler
window.addEventListener('error', (event) => {
    debugLog('❌ Global error:', event.error);
    showError('Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.');
});

window.addEventListener('unhandledrejection', (event) => {
    debugLog('❌ Unhandled promise rejection:', event.reason);
    showError('Wystąpił błąd podczas ładowania danych.');
    event.preventDefault();
});