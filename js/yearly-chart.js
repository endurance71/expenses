// =================================
// YEARLY-CHART.JS - Roczny wykres wydatków
// Version: 2.0.1 - FIXED
// =================================

window.YearlyChartManager = {
    // Chart state
    chart: null,
    yearlyData: null,
    currentYear: new Date().getFullYear(),
    currentChartType: 'line',
    isLoading: false,
    
    // Initialize
    init() {
        Utils.debugLog('Initializing Yearly Chart Manager');
        // Auto-load chart after delay
        setTimeout(() => {
            this.loadChart();
        }, 500);
    },
    
    // Check if chart is visible
    isVisible() {
        const section = document.getElementById('yearlyChartSection');
        return section && !section.classList.contains('hidden');
    },
    
    // Load chart
    async loadChart() {
        if (this.isLoading) {
            Utils.debugLog('Already loading yearly chart');
            return;
        }
        
        const yearSelect = document.getElementById('yearSelect');
        const year = yearSelect ? yearSelect.value : this.currentYear;
        
        await this.updateYearlyChart('yearlyExpenseChart', year);
    },
    
    // Fetch yearly data
    async fetchYearlyData(year) {
        Utils.debugLog(`📅 Fetching yearly data for ${year}`);
        
        try {
            const data = await window.APIService.fetchYearlyData(year);
            Utils.debugLog('✅ Received yearly data:', data);
            return data;
        } catch (error) {
            Utils.debugLog('❌ Error fetching yearly data:', error);
            return this.generateEmptyYearData(year);
        }
    },
    
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
                    expenseCategories: Object.keys(APP_CONFIG.CATEGORIES).map(name => ({
                        name: name,
                        amount: 0,
                        transactionCount: 0
                    }))
                }
            });
        }
        
        return emptyData;
    },
    
    // Prepare chart data
    prepareChartData(yearlyData, chartType = 'line') {
        Utils.debugLog(`🔧 Preparing ${chartType} chart data`);
        
        const months = yearlyData.map(item => 
            item.monthName ? item.monthName.substring(0, 3) : `M${item.month}`
        );
        
        const categories = Object.keys(APP_CONFIG.CATEGORIES);
        const datasets = [];
        
        categories.forEach(category => {
            const categoryConfig = APP_CONFIG.CATEGORIES[category];
            const data = yearlyData.map(monthData => {
                if (monthData.data && monthData.data.expenseCategories) {
                    const categoryData = monthData.data.expenseCategories.find(cat => cat.name === category);
                    return categoryData?.amount || 0;
                }
                return 0;
            });
            
            const hasData = data.some(value => value > 0);
            
            if (chartType === 'line') {
                datasets.push({
                    label: category,
                    data: data,
                    borderColor: categoryConfig.color,
                    backgroundColor: hasData ? this.createGradient(categoryConfig.color) : 'transparent',
                    borderWidth: hasData ? 3 : 1,
                    fill: hasData,
                    tension: 0.4,
                    pointBackgroundColor: categoryConfig.color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: hasData ? 6 : 3,
                    pointHoverRadius: hasData ? 8 : 5,
                    pointHoverBackgroundColor: categoryConfig.color,
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    hidden: !hasData
                });
            } else {
                datasets.push({
                    label: category,
                    data: data,
                    backgroundColor: categoryConfig.color,
                    borderColor: categoryConfig.color,
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                    hidden: !hasData
                });
            }
        });
        
        // Check if there's any data
        const totalDataPoints = datasets.reduce((sum, dataset) => {
            return sum + dataset.data.reduce((dataSum, value) => dataSum + value, 0);
        }, 0);
        
        if (totalDataPoints === 0) {
            Utils.debugLog('⚠️ No data found, adding placeholder');
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
    },
    
    // Create gradient
    createGradient(color) {
        const canvas = document.getElementById('yearlyExpenseChart');
        if (!canvas) return color;
        
        const ctx = canvas.getContext('2d');
        try {
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color + '05');
            return gradient;
        } catch (error) {
            return color;
        }
    },
    
    // Create chart
    createChart(canvasId, yearlyData, chartType = 'line') {
        Utils.debugLog(`📊 Creating ${chartType} chart`);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            Utils.debugLog(`❌ Canvas ${canvasId} not found`);
            return;
        }
        
        if (typeof Chart === 'undefined') {
            Utils.debugLog('❌ Chart.js not loaded');
            Utils.showError('Chart.js nie został załadowany');
            return;
        }
        
        // Destroy previous chart
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        const chartData = this.prepareChartData(yearlyData, chartType);
        this.currentChartType = chartType;
        
        try {
            const isStacked = chartType === 'bar';
            const hasRealData = chartData.datasets.some(dataset => 
                dataset.label !== 'Brak danych' && 
                dataset.data.some(value => value > 0)
            );
            
            // Title
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
                                    const value = Utils.formatCurrency(context.parsed.y);
                                    return `${label}: ${value}`;
                                },
                                footer: function(context) {
                                    const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                                    return `Razem: ${Utils.formatCurrency(total)}`;
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
                                    return Utils.formatCurrency(value);
                                }
                            }
                        }
                    },
                    animation: {
                        duration: chartType === 'line' ? 1500 : 1000,
                        easing: 'easeOutCubic'
                    }
                }
            });
            
            Utils.debugLog('✅ Chart created successfully');
            
        } catch (error) {
            Utils.debugLog('❌ Failed to create chart:', error);
            this.showError(ctx, 'Nie można utworzyć wykresu: ' + error.message);
        }
    },
    
    // Switch chart type
    switchChartType(type) {
        Utils.debugLog(`🔄 Switching to ${type} chart`);
        
        if (!this.yearlyData) {
            Utils.debugLog('⚠️ No data available for chart type switch');
            return;
        }
        
        this.currentChartType = type;
        this.createChart('yearlyExpenseChart', this.yearlyData, type);
        
        // Update buttons
        document.querySelectorAll('.chart-type-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`[data-type="${type}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        HapticManager.selection();
    },
    
    // Show loading
    showLoading(ctx) {
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
        }
        
        if (!container) return;
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 400px; color: var(--secondary-label);">
                <div style="text-align: center;">
                    <div class="loading-spinner" style="width: 32px; height: 32px; border: 3px solid var(--quaternary-system-fill); border-top: 3px solid var(--ios-blue); border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                    <div style="font-size: 17px; font-weight: 500;">Ładowanie danych rocznych...</div>
                </div>
            </div>
        `;
    },
    
    // Show error
    showError(ctx, message) {
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
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
                        <button onclick="YearlyChartManager.loadChart()" style="background: var(--ios-blue); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            Spróbuj ponownie
                        </button>
                    </div>
                </div>
            `;
        }
    },
    
    // Main update function
    async updateYearlyChart(canvasId, year = null) {
        if (this.isLoading) {
            Utils.debugLog('⚠️ Already loading, skipping request');
            return;
        }
        
        this.isLoading = true;
        
        if (!year) year = this.currentYear;
        this.currentYear = year;
        
        Utils.debugLog(`🔄 Starting update for year ${year}`);
        
        let ctx = document.getElementById(canvasId);
        if (!ctx) {
            Utils.debugLog(`❌ Canvas ${canvasId} not found`);
            this.isLoading = false;
            return;
        }
        
        // Show loading
        this.showLoading(ctx);
        
        try {
            // Fetch yearly data
            this.yearlyData = await this.fetchYearlyData(year);
            
            // Ensure canvas still exists
            ctx = document.getElementById(canvasId);
            if (!ctx) {
                const container = document.querySelector('#yearlyChartSection .yearly-chart-container');
                if (container) {
                    container.innerHTML = `<canvas id="${canvasId}" role="img" aria-label="Wykres roczny wydatków według kategorii"></canvas>`;
                    ctx = document.getElementById(canvasId);
                }
                
                if (!ctx) {
                    throw new Error(`Cannot create canvas: ${canvasId}`);
                }
            }
            
            // Create chart
            this.createChart(canvasId, this.yearlyData, this.currentChartType);
            
            // Calculate and show stats
            const stats = this.calculateYearlyStats();
            if (stats) {
                this.updateYearlyStats(stats);
            }
            
            // Update button
            const loadButton = document.getElementById('loadYearlyChartBtn');
            if (loadButton) {
                loadButton.textContent = 'Odśwież wykres';
                loadButton.disabled = false;
            }
            
            Utils.debugLog('✅ Update completed successfully');
            
        } catch (error) {
            Utils.debugLog('❌ Update failed:', error);
            this.showError(ctx, 'Błąd podczas ładowania danych: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    },
    
    // Calculate yearly stats
    calculateYearlyStats() {
        if (!this.yearlyData) return null;
        
        const stats = {
            totalExpenses: 0,
            categoryTotals: {},
            monthlyAverages: {},
            highestMonth: null,
            lowestMonth: null,
            monthsWithData: 0
        };
        
        // Initialize category totals
        Object.keys(APP_CONFIG.CATEGORIES).forEach(category => {
            stats.categoryTotals[category] = 0;
            stats.monthlyAverages[category] = 0;
        });
        
        let monthlyTotals = [];
        
        // Calculate totals
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
        
        // Calculate averages
        const divisor = stats.monthsWithData > 0 ? stats.monthsWithData : 12;
        Object.keys(stats.categoryTotals).forEach(category => {
            stats.monthlyAverages[category] = Math.round(stats.categoryTotals[category] / divisor);
        });
        
        // Find highest and lowest month
        const monthsWithData = monthlyTotals.filter(m => m.hasData && m.total > 0);
        
        if (monthsWithData.length > 0) {
            monthsWithData.sort((a, b) => b.total - a.total);
            stats.highestMonth = monthsWithData[0];
            stats.lowestMonth = monthsWithData[monthsWithData.length - 1];
        } else {
            stats.highestMonth = { month: 'Brak danych', total: 0 };
            stats.lowestMonth = { month: 'Brak danych', total: 0 };
        }
        
        return stats;
    },
    
    // Update yearly stats UI
    updateYearlyStats(stats) {
        const elements = {
            totalYearlyExpenses: document.getElementById('totalYearlyExpenses'),
            avgMonthlyExpenses: document.getElementById('avgMonthlyExpenses'),
            highestMonthExpenses: document.getElementById('highestMonthExpenses'),
            lowestMonthExpenses: document.getElementById('lowestMonthExpenses')
        };
        
        if (elements.totalYearlyExpenses) {
            elements.totalYearlyExpenses.textContent = Utils.formatCurrency(stats.totalExpenses);
        }
        
        if (elements.avgMonthlyExpenses) {
            const avgMonthly = Math.round(stats.totalExpenses / (stats.monthsWithData || 12));
            elements.avgMonthlyExpenses.textContent = Utils.formatCurrency(avgMonthly);
        }
        
        if (elements.highestMonthExpenses) {
            if (stats.highestMonth && stats.highestMonth.total > 0) {
                elements.highestMonthExpenses.textContent = 
                    `${stats.highestMonth.month}: ${Utils.formatCurrency(stats.highestMonth.total)}`;
            } else {
                elements.highestMonthExpenses.textContent = 'Brak danych';
            }
        }
        
        if (elements.lowestMonthExpenses) {
            if (stats.lowestMonth && stats.lowestMonth.total > 0) {
                elements.lowestMonthExpenses.textContent = 
                    `${stats.lowestMonth.month}: ${Utils.formatCurrency(stats.lowestMonth.total)}`;
            } else {
                elements.lowestMonthExpenses.textContent = 'Brak danych';
            }
        }
        
        // Show stats cards with animation
        const statsCards = document.querySelectorAll('.yearly-stats-card');
        statsCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.display = 'grid';
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                });
            }, index * 200);
        });
    },
    
    // Refresh chart
    async refresh() {
        const yearSelect = document.getElementById('yearSelect');
        const year = yearSelect ? yearSelect.value : this.currentYear;
        await this.updateYearlyChart('yearlyExpenseChart', year);
    },
    
    // Destroy chart
    destroy() {
        Utils.debugLog('🗑️ Destroying yearly chart');
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.yearlyData = null;
        this.isLoading = false;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.YearlyChartManager;
}