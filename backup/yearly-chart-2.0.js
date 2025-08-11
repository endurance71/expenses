// =================================
// YEARLY-CHART.JS - Roczny wykres wydatków - FIXED FOR NEW API
// Wersja: 2.0.0 - Dostosowany do nowego API endpoint
// =================================

class YearlyChart {
    constructor() {
        this.chart = null;
        this.yearlyData = null;
        this.currentYear = new Date().getFullYear();
        this.currentChartType = 'line'; // domyślnie liniowy
        this.isLoading = false;
    }

    // NOWE: Pobierz dane za cały rok z nowego API endpoint
    async fetchYearlyData(year) {
        console.log(`📅 [YearlyChart] Fetching yearly data for ${year} from new API`);
        
        try {
            // Użyj nowego endpointu który zwraca dane za cały rok
            const url = new URL('https://jan204-20204.wykr.es/webhook/dashboard-wydatki-yearly');
            url.searchParams.set('year', year);
            
            console.log(`🌐 [YearlyChart] Requesting: ${url.toString()}`);
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            if (!text.trim()) {
                throw new Error('Empty response from server');
            }
            
            const data = JSON.parse(text);
            console.log('✅ [YearlyChart] Received yearly data:', data);
            
            // Sprawdź czy dane są w nowym formacie
            if (data.year && data.months && Array.isArray(data.months)) {
                console.log(`📊 [YearlyChart] Processing ${data.months.length} months of data`);
                return data.months; // Zwróć tablicę miesięcy
            } else {
                throw new Error('Invalid data format from API');
            }
            
        } catch (error) {
            console.error('❌ [YearlyChart] Error fetching yearly data:', error);
            
            // Fallback - generuj puste dane
            return this.generateEmptyYearData(year);
        }
    }

    // Generuj puste dane dla całego roku
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
                    expenseCategories: [
                        { name: 'Prywatne', amount: 0, transactionCount: 0 },
                        { name: 'MT HUB', amount: 0, transactionCount: 0 },
                        { name: 'FHU', amount: 0, transactionCount: 0 }
                    ]
                }
            });
        }
        
        return emptyData;
    }

    // Przygotuj dane do wykresu - DOSTOSOWANE DO NOWEGO FORMATU
    prepareChartData(yearlyData, chartType = 'line') {
        console.log(`🔧 [YearlyChart] Preparing ${chartType} chart data`);
        
        const months = yearlyData.map(item => item.monthName ? item.monthName.substring(0, 3) : `M${item.month}`);
        const categories = ['Prywatne', 'MT HUB', 'FHU'];
        const colors = {
            'Prywatne': '#34C759',
            'MT HUB': '#007AFF', 
            'FHU': '#FF2D92'
        };

        const datasets = categories.map(category => {
            const data = yearlyData.map(monthData => {
                // Sprawdź czy dane są w strukturze data.expenseCategories
                const categoryData = monthData.data?.expenseCategories?.find(cat => cat.name === category);
                return categoryData?.amount || 0;
            });

            console.log(`📈 [YearlyChart] ${category} data:`, data);
            
            const hasData = data.some(value => value > 0);
            console.log(`📊 [YearlyChart] ${category} has data:`, hasData);

            if (chartType === 'line') {
                return {
                    label: category,
                    data: data,
                    borderColor: colors[category],
                    backgroundColor: hasData ? this.createGradient(colors[category]) : 'transparent',
                    borderWidth: hasData ? 3 : 1,
                    fill: hasData,
                    tension: 0.4,
                    pointBackgroundColor: colors[category],
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: hasData ? 6 : 3,
                    pointHoverRadius: hasData ? 8 : 5,
                    pointHoverBackgroundColor: colors[category],
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    hidden: !hasData
                };
            } else {
                return {
                    label: category,
                    data: data,
                    backgroundColor: colors[category],
                    borderColor: colors[category],
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    hidden: !hasData
                };
            }
        });

        // Sprawdź czy są jakiekolwiek dane
        const totalDataPoints = datasets.reduce((sum, dataset) => {
            return sum + dataset.data.reduce((dataSum, value) => dataSum + value, 0);
        }, 0);
        
        console.log(`📊 [YearlyChart] Total data points value:`, totalDataPoints);
        
        if (totalDataPoints === 0) {
            console.log(`⚠️ [YearlyChart] No data found, adding placeholder`);
            datasets.push({
                label: 'Brak danych',
                data: Array(months.length).fill(1),
                backgroundColor: '#E5E5EA',
                borderColor: '#E5E5EA',
                borderWidth: 1
            });
        }

        return {
            labels: months,
            datasets: datasets
        };
    }

    // Utwórz gradient
    createGradient(color) {
        const canvas = document.getElementById('yearlyExpenseChart');
        if (!canvas) {
            console.warn('⚠️ [YearlyChart] Canvas not found for gradient creation');
            return color;
        }
        
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '05');
        return gradient;
    }

    // Utwórz wykres
    createChart(canvasId, yearlyData, chartType = 'line') {
        console.log(`📊 [YearlyChart] Creating ${chartType} chart`);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`❌ [YearlyChart] Canvas ${canvasId} not found`);
            setTimeout(() => {
                const retryCtx = document.getElementById(canvasId);
                if (retryCtx) {
                    this.createChart(canvasId, yearlyData, chartType);
                }
            }, 500);
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error('❌ [YearlyChart] Chart.js not loaded');
            this.showError(ctx, 'Chart.js nie został załadowany');
            return;
        }

        if (this.chart) {
            console.log('🗑️ [YearlyChart] Destroying previous chart');
            this.chart.destroy();
            this.chart = null;
        }

        const chartData = this.prepareChartData(yearlyData, chartType);
        this.currentChartType = chartType;

        try {
            const isStacked = chartType === 'bar';
            
            const realData = chartData.datasets.filter(dataset => 
                dataset.label !== 'Brak danych' && 
                dataset.data.some(value => value > 0)
            );
            
            const hasRealData = realData.length > 0;
            console.log(`📊 [YearlyChart] Chart has real data:`, hasRealData);
            
            // Tytuł wykresu
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            
            let titleText;
            if (hasRealData) {
                if (this.currentYear == currentYear) {
                    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
                    titleText = `Wydatki ${this.currentYear} (Sty - ${monthNames[currentMonth - 1]})`;
                } else {
                    titleText = `Wydatki w roku ${this.currentYear}`;
                }
            } else {
                titleText = `Brak danych za rok ${this.currentYear}`;
            }
            
            this.chart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: titleText,
                            font: { size: 18, weight: '600' },
                            color: getComputedStyle(document.documentElement).getPropertyValue('--label') || '#000',
                            padding: 20
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 14, weight: '500' },
                                color: getComputedStyle(document.documentElement).getPropertyValue('--label') || '#000',
                                padding: 15,
                                filter: function(legendItem, chartData) {
                                    const dataset = chartData.datasets[legendItem.datasetIndex];
                                    return !dataset.hidden;
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 8,
                            padding: 12,
                            displayColors: true,
                            filter: function(tooltipItem) {
                                return tooltipItem.dataset.label !== 'Brak danych';
                            },
                            callbacks: {
                                title: function(context) {
                                    const monthNames = [
                                        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                                        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
                                    ];
                                    const monthIndex = context[0].dataIndex;
                                    return monthNames[monthIndex] || context[0].label;
                                },
                                label: function(context) {
                                    const label = context.dataset.label;
                                    const value = formatCurrency ? formatCurrency(context.parsed.y) : `${context.parsed.y} zł`;
                                    return `${label}: ${value}`;
                                },
                                footer: function(context) {
                                    const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                                    const totalFormatted = formatCurrency ? formatCurrency(total) : `${total} zł`;
                                    return `Razem: ${totalFormatted}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: isStacked,
                            grid: {
                                display: chartType === 'line',
                                color: getComputedStyle(document.documentElement).getPropertyValue('--separator') || 'rgba(0,0,0,0.1)',
                                lineWidth: 0.5
                            },
                            ticks: {
                                font: { size: 12, weight: '500' },
                                color: getComputedStyle(document.documentElement).getPropertyValue('--secondary-label') || '#666'
                            }
                        },
                        y: {
                            stacked: isStacked,
                            beginAtZero: true,
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--separator') || 'rgba(0,0,0,0.1)',
                                lineWidth: 0.5
                            },
                            ticks: {
                                font: { size: 12 },
                                color: getComputedStyle(document.documentElement).getPropertyValue('--secondary-label') || '#666',
                                callback: function(value) {
                                    if (!hasRealData && value <= 1) return '';
                                    return formatCurrency ? formatCurrency(value) : `${value} zł`;
                                }
                            }
                        }
                    },
                    animation: {
                        duration: chartType === 'line' ? 1500 : 1000,
                        easing: 'easeOutCubic'
                    },
                    elements: {
                        line: {
                            borderJoinStyle: 'round'
                        }
                    }
                }
            });

            console.log('✅ [YearlyChart] Chart created successfully');

        } catch (error) {
            console.error('❌ [YearlyChart] Failed to create chart:', error);
            this.showError(ctx, 'Nie można utworzyć wykresu rocznego: ' + error.message);
        }
    }

    // Przełącz typ wykresu
    switchChartType(type) {
        console.log(`🔄 [YearlyChart] Switching to ${type} chart`);
        
        if (!this.yearlyData) {
            console.warn('⚠️ [YearlyChart] No data available for chart type switch');
            return;
        }
        
        this.currentChartType = type;
        this.createChart('yearlyExpenseChart', this.yearlyData, type);
        
        // Update przycisków
        document.querySelectorAll('.chart-type-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-type="${type}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Pokaż loading
    showLoading(ctx) {
        console.log('⏳ [YearlyChart] Showing loading state');
        
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
        } else if (typeof ctx === 'string') {
            const element = document.getElementById(ctx);
            container = element ? element.parentElement : null;
        }
        
        if (!container) {
            console.warn('⚠️ [YearlyChart] Container not found for loading state');
            return;
        }
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 400px; color: var(--secondary-label);">
                <div style="text-align: center;">
                    <div class="loading-spinner" style="width: 32px; height: 32px; border: 3px solid var(--quaternary-system-fill); border-top: 3px solid var(--ios-blue); border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                    <div style="font-size: 17px; font-weight: 500; margin-bottom: 4px;">Ładowanie danych rocznych...</div>
                    <div id="yearlyProgress" style="font-size: 15px; opacity: 0.8;">Pobieranie danych z API...</div>
                </div>
            </div>
        `;
    }

    // Pokaż błąd
    showError(ctx, message) {
        console.error(`❌ [YearlyChart] Showing error: ${message}`);
        
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
        } else if (typeof ctx === 'string') {
            const element = document.getElementById(ctx);
            container = element ? element.parentElement : null;
        }
        
        if (!container) {
            container = document.querySelector('#yearlyChartSection .yearly-chart-container');
        }
        
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px; color: var(--secondary-label);">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <div style="font-size: 17px; font-weight: 500; margin-bottom: 8px;">${message}</div>
                        <button onclick="loadYearlyChart()" style="background: var(--ios-blue); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            Spróbuj ponownie
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Główna funkcja aktualizacji - UPROSZCZONA DLA NOWEGO API
    async updateYearlyChart(canvasId, year = null) {
        if (this.isLoading) {
            console.warn('⚠️ [YearlyChart] Already loading, skipping request');
            return;
        }

        this.isLoading = true;
        
        if (!year) year = this.currentYear;
        this.currentYear = year;

        console.log(`🔄 [YearlyChart] Starting update for year ${year}`);

        let ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.warn(`⚠️ [YearlyChart] Canvas ${canvasId} not found, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            ctx = document.getElementById(canvasId);
            
            if (!ctx) {
                console.error(`❌ [YearlyChart] Canvas ${canvasId} still not found after wait`);
                this.isLoading = false;
                return;
            }
        }

        // Pokaż loading
        this.showLoading(ctx);

        try {
            // Pobierz dane za cały rok z nowego API
            this.yearlyData = await this.fetchYearlyData(year);
            
            // Upewnij się, że canvas nadal istnieje
            ctx = document.getElementById(canvasId);
            if (!ctx) {
                console.warn(`⚠️ [YearlyChart] Canvas disappeared, recreating...`);
                const container = document.querySelector('#yearlyChartSection .yearly-chart-container');
                if (container) {
                    container.innerHTML = `<canvas id="${canvasId}" role="img" aria-label="Wykres roczny wydatków według kategorii"></canvas>`;
                    ctx = document.getElementById(canvasId);
                }
                
                if (!ctx) {
                    throw new Error(`Nie można odtworzyć elementu canvas: ${canvasId}`);
                }
            }
            
            // Utwórz wykres
            this.createChart(canvasId, this.yearlyData, this.currentChartType);

            // Pokaż statystyki
            const stats = this.calculateYearlyStats();
            if (stats) {
                this.updateYearlyStats(stats);
            }

            // Update przycisku
            const loadButton = document.querySelector('#yearlyChartSection .yearly-load-button');
            if (loadButton) {
                loadButton.textContent = 'Odśwież wykres';
                loadButton.disabled = false;
            }

            console.log('✅ [YearlyChart] Update completed successfully');

        } catch (error) {
            console.error('❌ [YearlyChart] Update failed:', error);
            this.showError(ctx, 'Błąd podczas ładowania danych rocznych: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    // Oblicz statystyki roczne - DOSTOSOWANE DO NOWEGO FORMATU
    calculateYearlyStats() {
        if (!this.yearlyData) {
            console.warn('⚠️ [YearlyChart] No data for stats calculation');
            return null;
        }

        console.log('📊 [YearlyChart] Calculating yearly statistics');

        const stats = {
            totalExpenses: 0,
            categoryTotals: { 'Prywatne': 0, 'MT HUB': 0, 'FHU': 0 },
            monthlyAverages: { 'Prywatne': 0, 'MT HUB': 0, 'FHU': 0 },
            highestMonth: null,
            lowestMonth: null,
            monthsWithData: 0
        };

        let monthlyTotals = [];

        // Oblicz sumy - dostosowane do nowego formatu
        this.yearlyData.forEach(monthData => {
            let monthTotal = 0;
            let hasDataThisMonth = false;
            
            if (monthData.data && monthData.data.expenseCategories) {
                monthData.data.expenseCategories.forEach(cat => {
                    const amount = cat.amount || 0;
                    if (amount > 0) {
                        hasDataThisMonth = true;
                        if (stats.categoryTotals[cat.name] !== undefined) {
                            stats.categoryTotals[cat.name] += amount;
                        }
                        stats.totalExpenses += amount;
                        monthTotal += amount;
                    }
                });
            }

            if (hasDataThisMonth) {
                stats.monthsWithData++;
            }

            monthlyTotals.push({
                month: monthData.monthName,
                total: monthTotal,
                hasData: hasDataThisMonth
            });
        });

        // Oblicz średnie miesięczne
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const maxMonthsInYear = (this.currentYear == currentYear) ? (currentDate.getMonth() + 1) : 12;
        const divisor = stats.monthsWithData > 0 ? stats.monthsWithData : maxMonthsInYear;
        
        Object.keys(stats.categoryTotals).forEach(category => {
            stats.monthlyAverages[category] = Math.round(stats.categoryTotals[category] / divisor);
        });

        // Znajdź najwyższy i najniższy miesiąc
        const monthsWithData = monthlyTotals.filter(m => m.hasData && m.total > 0);
        
        if (monthsWithData.length > 0) {
            monthsWithData.sort((a, b) => b.total - a.total);
            stats.highestMonth = monthsWithData[0];
            stats.lowestMonth = monthsWithData[monthsWithData.length - 1];
        } else {
            stats.highestMonth = { month: 'Brak danych', total: 0 };
            stats.lowestMonth = { month: 'Brak danych', total: 0 };
        }

        console.log('📈 [YearlyChart] Stats calculated:', {
            total: stats.totalExpenses,
            monthsWithData: stats.monthsWithData,
            highest: stats.highestMonth,
            lowest: stats.lowestMonth
        });

        return stats;
    }

    // Aktualizuj statystyki roczne
    updateYearlyStats(stats) {
        console.log('📊 [YearlyChart] Updating stats UI');
        
        const elements = {
            totalYearlyExpenses: document.getElementById('totalYearlyExpenses'),
            avgMonthlyExpenses: document.getElementById('avgMonthlyExpenses'),
            highestMonthExpenses: document.getElementById('highestMonthExpenses'),
            lowestMonthExpenses: document.getElementById('lowestMonthExpenses')
        };

        if (elements.totalYearlyExpenses) {
            const formatted = formatCurrency ? formatCurrency(stats.totalExpenses) : `${stats.totalExpenses} zł`;
            elements.totalYearlyExpenses.textContent = formatted;
        }
        
        if (elements.avgMonthlyExpenses) {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const maxMonthsInYear = (this.currentYear == currentYear) ? (currentDate.getMonth() + 1) : 12;
            const divisor = stats.monthsWithData > 0 ? stats.monthsWithData : maxMonthsInYear;
            
            const avgMonthly = Math.round(stats.totalExpenses / divisor);
            const formatted = formatCurrency ? formatCurrency(avgMonthly) : `${avgMonthly} zł`;
            elements.avgMonthlyExpenses.textContent = formatted;
        }
        
        if (elements.highestMonthExpenses) {
            if (stats.highestMonth && stats.highestMonth.total > 0) {
                const amount = formatCurrency ? formatCurrency(stats.highestMonth.total) : `${stats.highestMonth.total} zł`;
                elements.highestMonthExpenses.textContent = `${stats.highestMonth.month}: ${amount}`;
            } else {
                elements.highestMonthExpenses.textContent = 'Brak danych';
            }
        }
        
        if (elements.lowestMonthExpenses) {
            if (stats.lowestMonth && stats.lowestMonth.total > 0) {
                const amount = formatCurrency ? formatCurrency(stats.lowestMonth.total) : `${stats.lowestMonth.total} zł`;
                elements.lowestMonthExpenses.textContent = `${stats.lowestMonth.month}: ${amount}`;
            } else {
                elements.lowestMonthExpenses.textContent = 'Brak danych';
            }
        }

        // Pokaż sekcje ze statystykami z animacją
        const statsCards = document.querySelectorAll('.yearly-stats-card');
        statsCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.display = 'grid';
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                });
            }, index * 200);
        });
    }

    // Wyczyść wykres
    destroy() {
        console.log('🗑️ [YearlyChart] Destroying chart instance');
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.yearlyData = null;
        this.isLoading = false;
    }
}

// =================================
// GLOBALNE FUNKCJE I INSTANCJA
// =================================

// Globalna instancja
const yearlyChart = new YearlyChart();

// Funkcje globalne dla HTML onclick
window.yearlyChart = yearlyChart;

window.switchYearlyChartType = function(type) {
    console.log(`🔄 [Global] Switching chart type to: ${type}`);
    yearlyChart.switchChartType(type);
};

window.loadYearlyChart = function() {
    console.log('🔄 [Global] Loading yearly chart...');
    
    const canvas = document.getElementById('yearlyExpenseChart');
    console.log('🔍 [Global] Canvas check:', canvas ? 'Found' : 'Not found');
    
    const container = document.querySelector('#yearlyChartSection .yearly-chart-container');
    console.log('🔍 [Global] Container check:', container ? 'Found' : 'Not found');
    
    const yearSelect = document.getElementById('yearSelect');
    const year = yearSelect ? yearSelect.value : new Date().getFullYear();
    console.log('🔍 [Global] Selected year:', year);
    
    yearlyChart.updateYearlyChart('yearlyExpenseChart', year);
};

// Auto-load przy załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Page loaded - auto-loading chart...');
    setTimeout(() => {
        loadYearlyChart();
    }, 500);
});

// Auto-cleanup przy zamknięciu strony
window.addEventListener('beforeunload', () => {
    yearlyChart.destroy();
});

// Export dla modułów (jeśli używane)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { YearlyChart, yearlyChart };
}

console.log('📊 [YearlyChart] Module loaded successfully - Version 2.0.0');