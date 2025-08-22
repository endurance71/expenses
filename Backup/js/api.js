// =================================
// API.JS - API Service dla wszystkich żądań
// =================================

class APIService {
    constructor() {
        this.config = window.APP_CONFIG.API;
        this.baseUrl = this.config.BASE_URL;
    }
    
    // Generic fetch with retry logic
    async fetchWithRetry(url, options = {}, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    ...options.headers
                },
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            window.Utils.debugLog(`Fetch attempt ${attempt} failed:`, error);
            
            if (attempt < this.config.RETRY_ATTEMPTS && error.name !== 'AbortError') {
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.RETRY_DELAY * attempt)
                );
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            
            throw error;
        }
    }
    
    // Fetch monthly expense data
    async fetchExpenseData(year, month) {
        const url = new URL(this.baseUrl + this.config.ENDPOINTS.DASHBOARD);
        if (year) url.searchParams.set('year', year);
        if (month) url.searchParams.set('month', month);
        
        window.Utils.debugLog(`Fetching expense data: ${url.toString()}`);
        
        try {
            const response = await this.fetchWithRetry(url.toString());
            const text = await response.text();
            
            if (!text.trim()) {
                throw new Error('Empty response from server');
            }
            
            const data = JSON.parse(text);
            window.Utils.debugLog('Successfully received expense data:', data);
            return data;
            
        } catch (error) {
            window.Utils.debugLog('API Error:', error);
            window.Utils.showError(`Nie można pobrać danych: ${error.message}`);
            return window.Utils.generateEmptyData(year, month);
        }
    }
    
    // Fetch yearly data
    async fetchYearlyData(year) {
        const url = new URL(this.baseUrl + this.config.ENDPOINTS.YEARLY);
        url.searchParams.set('year', year);
        
        window.Utils.debugLog(`Fetching yearly data: ${url.toString()}`);
        
        try {
            const response = await this.fetchWithRetry(url.toString());
            const text = await response.text();
            
            if (!text.trim()) {
                throw new Error('Empty response from server');
            }
            
            const data = JSON.parse(text);
            window.Utils.debugLog('Successfully received yearly data:', data);
            
            // Check if data is in correct format
            if (data.year && data.months && Array.isArray(data.months)) {
                return data.months;
            } else {
                throw new Error('Invalid data format from API');
            }
            
        } catch (error) {
            window.Utils.debugLog('Yearly API Error:', error);
            // Return empty year data
            return this.generateEmptyYearData(year);
        }
    }
    
    // Add new expense
    async addExpense(expenseData) {
        const url = this.baseUrl + this.config.ENDPOINTS.ADD_EXPENSE;
        
        window.Utils.debugLog('Adding expense:', expenseData);
        
        try {
            const response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            });
            
            const result = await response.json();
            window.Utils.debugLog('Expense added successfully:', result);
            return result;
            
        } catch (error) {
            window.Utils.debugLog('Add expense error:', error);
            throw error;
        }
    }
    
    // Delete expense
    async deleteExpense(deleteData) {
        const url = this.baseUrl + this.config.ENDPOINTS.DELETE_EXPENSE;
        
        // Obsłuż zarówno stary format (string/number) jak i nowy (obiekt)
        let payload;
        if (typeof deleteData === 'object') {
            payload = deleteData;
        } else {
            // Stary format - konwertuj na obiekt
            payload = {
                id: deleteData,
                timestamp: deleteData
            };
        }
        
        window.Utils.debugLog('Deleting expense with payload:', payload);
        
        try {
            const response = await this.fetchWithRetry(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            window.Utils.debugLog('Expense deleted successfully:', result);
            return result;
            
        } catch (error) {
            window.Utils.debugLog('Delete expense error:', error);
            throw error;
        }
    }
    
    // Generate empty year data
    generateEmptyYearData(year) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const maxMonth = (year == currentYear) ? (currentDate.getMonth() + 1) : 12;
        
        const monthNames = [
            'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
            'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
        ];
        
        const emptyData = [];
        for (let month = 1; month <= maxMonth; month++) {
            emptyData.push({
                month: month,
                monthName: monthNames[month - 1],
                data: {
                    monthlyExpenses: 0,
                    expenseCategories: Object.keys(window.APP_CONFIG.CATEGORIES).map(name => ({
                        name: name,
                        amount: 0,
                        transactionCount: 0
                    }))
                }
            });
        }
        
        return emptyData;
    }
}

// Create global instance
window.APIService = new APIService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}