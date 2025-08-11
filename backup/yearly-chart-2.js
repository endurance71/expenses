// =================================
// YEARLY-CHART.JS - Roczny wykres wydatków - POPRAWIONY
// Wersja: 1.1.1 - FIXED percentage error
// =================================

class YearlyChart {
    constructor() {
        this.chart = null;
        this.yearlyData = null;
        this.currentYear = new Date().getFullYear();
        this.currentChartType = 'line'; // domyślnie liniowy
        this.isLoading = false;
    }

    // Pobierz dane za cały rok
    async fetchYearlyData(year) {
        console.log(`📅 [YearlyChart] Fetching yearly data for ${year}`);
        
        const monthlyData = [];
        
        // ✅ NOWE: Określ zakres miesięcy do pobrania
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() zwraca 0-11
        
        // Jeśli to aktualny rok, pobierz dane tylko do aktualnego miesiąca
        // Jeśli to przeszły rok, pobierz wszystkie 12 miesięcy
        const maxMonth = (year == currentYear) ? currentMonth : 12;
        const months = Array.from({length: maxMonth}, (_, i) => i + 1);
        
        console.log(`📊 [YearlyChart] Year ${year}: fetching months 1-${maxMonth} (current: ${currentMonth})`);
        
        // Pokaż progress
        this.updateProgress(0, maxMonth);
        
        for (const [index, month] of months.entries()) {
            try {
                const url = new URL(API_CONFIG.baseUrl);
                url.searchParams.set('year', year);
                url.searchParams.set('month', String(month).padStart(2, '0'));
                
                console.log(`📦 [YearlyChart] Fetching ${index + 1}/${maxMonth}: ${month}/${year}`);
                
                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const text = await response.text();
                    if (text.trim()) {
                        const data = JSON.parse(text);
                        monthlyData.push({
                            month: month,
                            monthName: getMonthName(String(month).padStart(2, '0')),
                            data: data
                        });
                        console.log(`✅ [YearlyChart] Month ${month}: ${data.expenseCategories?.length || 0} categories`);
                    } else {
                        console.warn(`⚠️ [YearlyChart] Empty response for ${month}/${year}`);
                        monthlyData.push({
                            month: month,
                            monthName: getMonthName(String(month).padStart(2, '0')),
                            data: this.generateEmptyMonthData()
                        });
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Update progress - ✅ POPRAWKA: Użyj maxMonth zamiast 12
                this.updateProgress(index + 1, maxMonth);
                
                // Małe opóźnienie żeby nie przeciążyć API
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.warn(`❌ [YearlyChart] Error fetching ${month}/${year}:`, error.message);
                monthlyData.push({
                    month: month,
                    monthName: getMonthName(String(month).padStart(2, '0')),
                    data: this.generateEmptyMonthData()
                });
                // ✅ POPRAWKA: Użyj maxMonth zamiast 12
                this.updateProgress(index + 1, maxMonth);
            }
        }
        
        console.log(`📊 [YearlyChart] Data collection complete: ${monthlyData.length} months (${maxMonth} requested)`);
        return monthlyData;
    }

    // ✅ POPRAWKA: Napraw funkcję updateProgress
    updateProgress(current, total) {
        const progressEl = document.getElementById('yearlyProgress');
        if (progressEl) {
            const percentage = Math.round((current / total) * 100);
            progressEl.textContent = `Ładowanie: ${current}/${total} miesięcy (${percentage}%)`;
        }
        
        // Update przycisku
        const loadButton = document.querySelector('#yearlyChartSection .yearly-load-button');
        if (loadButton && current < total) {
            const percentage = Math.round((current / total) * 100);
            loadButton.textContent = `Ładowanie... ${percentage}%`;
            loadButton.disabled = true;
        } else if (loadButton && current === total) {
            loadButton.textContent = 'Odśwież wykres';
            loadButton.disabled = false;
        }
    }

    // Generuj puste dane dla miesiąca
    generateEmptyMonthData() {
        return {
            monthlyExpenses: 0,
            expenseCategories: [
                { name: 'Prywatne', amount: 0, transactionCount: 0 },
                { name: 'MT HUB', amount: 0, transactionCount: 0 },
                { name: 'FHU', amount: 0, transactionCount: 0 }
            ]
        };
    }

    // Przygotuj dane do wykresu - POPRAWIONA WERSJA
    prepareChartData(yearlyData, chartType = 'line') {
        console.log(`🔧 [YearlyChart] Preparing ${chartType} chart data`);
        
        const months = yearlyData.map(item => item.monthName.substring(0, 3)); // Skróć nazwy
        const categories = ['Prywatne', 'MT HUB', 'FHU'];
        const colors = {
            'Prywatne': '#34C759',
            'MT HUB': '#007AFF', 
            'FHU': '#FF2D92'
        };

        const datasets = categories.map(category => {
            const data = yearlyData.map(monthData => {
                const categoryData = monthData.data.expenseCategories?.find(cat => cat.name === category);
                const amount = categoryData?.amount || 0;
                return amount;
            });

            console.log(`📈 [YearlyChart] ${category} data:`, data);
            
            // ✅ NOWE: Sprawdź czy są jakiekolwiek dane > 0 dla tej kategorii
            const hasData = data.some(value => value > 0);
            console.log(`📊 [YearlyChart] ${category} has data:`, hasData);

            if (chartType === 'line') {
                // Wykres liniowy z gradientem
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
                    // ✅ NOWE: Ukryj linię jeśli brak danych
                    hidden: !hasData
                };
            } else {
                // Wykres słupkowy
                return {
                    label: category,
                    data: data,
                    backgroundColor: colors[category],
                    borderColor: colors[category],
                    borderWidth: 0,
                    borderRadius: category === 'FHU' ? 0 : 6,
                    borderSkipped: false,
                    // ✅ NOWE: Ukryj serię jeśli brak danych
                    hidden: !hasData
                };
            }
        });

        // ✅ NOWE: Sprawdź czy w ogóle są jakieś dane
        const totalDataPoints = datasets.reduce((sum, dataset) => {
            return sum + dataset.data.reduce((dataSum, value) => dataSum + value, 0);
        }, 0);
        
        console.log(`📊 [YearlyChart] Total data points value:`, totalDataPoints);
        
        // ✅ NOWE: Jeśli brak danych, dodaj placeholder
        if (totalDataPoints === 0) {
            console.log(`⚠️ [YearlyChart] No data found, adding placeholder`);
            datasets.push({
                label: 'Brak danych',
                data: Array(months.length).fill(1), // ✅ POPRAWIONE: Dopasuj do liczby miesięcy
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
        gradient.addColorStop(0, color + '40'); // 25% przezroczystość
        gradient.addColorStop(1, color + '05'); // 2% przezroczystość
        console.log(`🎨 [YearlyChart] Created gradient for ${color}`);
        return gradient;
    }

    // Utwórz wykres - POPRAWIONA WERSJA
    createChart(canvasId, yearlyData, chartType = 'line') {
        console.log(`📊 [YearlyChart] Creating ${chartType} chart`);
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`❌ [YearlyChart] Canvas ${canvasId} not found`);
            // ✅ NOWE: Spróbuj ponownie po krótkiej chwili
            setTimeout(() => {
                console.log(`🔄 [YearlyChart] Retrying chart creation for ${canvasId}`);
                const retryCtx = document.getElementById(canvasId);
                if (retryCtx) {
                    this.createChart(canvasId, yearlyData, chartType);
                } else {
                    console.error(`❌ [YearlyChart] Canvas ${canvasId} still not found after retry`);
                    this.showError(null, `Nie można znaleźć elementu wykresu: ${canvasId}`);
                }
            }, 500);
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error('❌ [YearlyChart] Chart.js not loaded');
            this.showError(ctx, 'Chart.js nie został załadowany');
            return;
        }

        // Zniszcz poprzedni wykres
        if (this.chart) {
            console.log('🗑️ [YearlyChart] Destroying previous chart');
            this.chart.destroy();
            this.chart = null;
        }

        const chartData = this.prepareChartData(yearlyData, chartType);
        this.currentChartType = chartType;

        try {
            const isStacked = chartType === 'bar';
            
            // ✅ NOWE: Sprawdź czy są jakiekolwiek rzeczywiste dane
            const realData = chartData.datasets.filter(dataset => 
                dataset.label !== 'Brak danych' && 
                dataset.data.some(value => value > 0)
            );
            
            const hasRealData = realData.length > 0;
            console.log(`📊 [YearlyChart] Chart has real data:`, hasRealData);
            
            // ✅ NOWE: Określ tytuł z zakresem dat
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
                            text: titleText, // ✅ NOWE: Używaj dynamicznego tytułu
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
                                // ✅ NOWE: Filtruj ukryte datasety z legendy
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
                            // ✅ NOWE: Ukryj tooltip dla placeholder data
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
                                    // ✅ NOWE: Nie pokazuj wartości dla placeholder data
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

    // Pokaż loading - POPRAWIONA WERSJA
    showLoading(ctx) {
        console.log('⏳ [YearlyChart] Showing loading state');
        
        // ✅ NOWE: Znajdź kontener - może to być canvas lub jego parent
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
        } else if (typeof ctx === 'string') {
            // Jeśli to string ID, znajdź element
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
                    <div id="yearlyProgress" style="font-size: 15px; opacity: 0.8;">Przygotowywanie...</div>
                </div>
            </div>
        `;
    }

    // Pokaż błąd - POPRAWIONA WERSJA
    showError(ctx, message) {
        console.error(`❌ [YearlyChart] Showing error: ${message}`);
        
        // ✅ NOWE: Znajdź kontener
        let container = ctx;
        if (ctx && ctx.parentElement) {
            container = ctx.parentElement;
        } else if (typeof ctx === 'string') {
            const element = document.getElementById(ctx);
            container = element ? element.parentElement : null;
        }
        
        if (!container) {
            // Jeśli nie możemy znaleźć kontenera, spróbuj znaleźć go po ID sekcji
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
        } else {
            console.error('❌ [YearlyChart] Could not find container for error display');
        }
    }

    // Główna funkcja aktualizacji - POPRAWIONA WERSJA
    async updateYearlyChart(canvasId, year = null) {
        if (this.isLoading) {
            console.warn('⚠️ [YearlyChart] Already loading, skipping request');
            return;
        }

        this.isLoading = true;
        
        if (!year) year = this.currentYear;
        this.currentYear = year;

        console.log(`🔄 [YearlyChart] Starting update for year ${year}`);

        // ✅ NOWE: Sprawdź, czy element canvas istnieje przed rozpoczęciem
        let ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.warn(`⚠️ [YearlyChart] Canvas ${canvasId} not found, waiting...`);
            // Poczekaj chwilę i spróbuj ponownie
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
            // Pobierz dane za cały rok
            this.yearlyData = await this.fetchYearlyData(year);
            
            // ✅ NOWE: Upewnij się, że canvas nadal istnieje i odtwórz go jeśli potrzeba
            ctx = document.getElementById(canvasId);
            if (!ctx) {
                console.warn(`⚠️ [YearlyChart] Canvas disappeared, recreating...`);
                // Odtwórz canvas w kontenerze
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

            console.log('✅ [YearlyChart] Update completed successfully');

        } catch (error) {
            console.error('❌ [YearlyChart] Update failed:', error);
            this.showError(ctx, 'Błąd podczas ładowania danych rocznych: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    // Oblicz statystyki roczne - POPRAWIONA WERSJA
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
            monthsWithData: 0 // ✅ NOWE: Liczba miesięcy z danymi
        };

        let monthlyTotals = [];

        // Oblicz sumy
        this.yearlyData.forEach(monthData => {
            let monthTotal = 0;
            let hasDataThisMonth = false; // ✅ NOWE
            
            if (monthData.data.expenseCategories) {
                monthData.data.expenseCategories.forEach(cat => {
                    const amount = cat.amount || 0;
                    if (amount > 0) { // ✅ NOWE: Tylko jeśli większe od 0
                        hasDataThisMonth = true;
                        stats.categoryTotals[cat.name] += amount;
                        stats.totalExpenses += amount;
                        monthTotal += amount;
                    }
                });
            }

            if (hasDataThisMonth) {
                stats.monthsWithData++; // ✅ NOWE
            }

            monthlyTotals.push({
                month: monthData.monthName,
                total: monthTotal,
                hasData: hasDataThisMonth // ✅ NOWE
            });
        });

        // ✅ NOWE: Oblicz średnie miesięczne tylko dla miesięcy z danymi
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const maxMonthsInYear = (this.currentYear == currentYear) ? (currentDate.getMonth() + 1) : 12;
        const divisor = stats.monthsWithData > 0 ? stats.monthsWithData : maxMonthsInYear;
        
        Object.keys(stats.categoryTotals).forEach(category => {
            stats.monthlyAverages[category] = Math.round(stats.categoryTotals[category] / divisor);
        });

        // ✅ NOWE: Znajdź najwyższy i najniższy miesiąc (tylko te z danymi)
        const monthsWithData = monthlyTotals.filter(m => m.hasData && m.total > 0);
        
        if (monthsWithData.length > 0) {
            monthsWithData.sort((a, b) => b.total - a.total);
            stats.highestMonth = monthsWithData[0];
            stats.lowestMonth = monthsWithData[monthsWithData.length - 1];
        } else {
            // Jeśli brak danych, użyj placeholder
            stats.highestMonth = { month: 'Brak danych', total: 0 };
            stats.lowestMonth = { month: 'Brak danych', total: 0 };
        }

        console.log('📈 [YearlyChart] Stats calculated:', {
            total: stats.totalExpenses,
            monthsWithData: stats.monthsWithData, // ✅ NOWE
            highest: stats.highestMonth,
            lowest: stats.lowestMonth
        });

        return stats;
    }

    // Aktualizuj statystyki roczne - POPRAWIONA WERSJA
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
            // ✅ NOWE: Średnia na podstawie rzeczywistej liczby miesięcy w roku
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const maxMonthsInYear = (this.currentYear == currentYear) ? (currentDate.getMonth() + 1) : 12;
            const divisor = stats.monthsWithData > 0 ? stats.monthsWithData : maxMonthsInYear;
            
            const avgMonthly = Math.round(stats.totalExpenses / divisor);
            const formatted = formatCurrency ? formatCurrency(avgMonthly) : `${avgMonthly} zł`;
            elements.avgMonthlyExpenses.textContent = formatted;
        }
        
        if (elements.highestMonthExpenses) {
            // ✅ NOWE: Sprawdź czy są dane
            if (stats.highestMonth.total > 0) {
                const amount = formatCurrency ? formatCurrency(stats.highestMonth.total) : `${stats.highestMonth.total} zł`;
                elements.highestMonthExpenses.textContent = `${stats.highestMonth.month}: ${amount}`;
            } else {
                elements.highestMonthExpenses.textContent = 'Brak danych';
            }
        }
        
        if (elements.lowestMonthExpenses) {
            // ✅ NOWE: Sprawdź czy są dane
            if (stats.lowestMonth.total > 0) {
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
            }, index * 200); // Stopniowe pojawianie się
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
    
    // Sprawdź, czy canvas istnieje
    const canvas = document.getElementById('yearlyExpenseChart');
    console.log('🔍 [Global] Canvas check:', canvas ? 'Found' : 'Not found');
    
    // Sprawdź, czy kontener istnieje
    const container = document.querySelector('#yearlyChartSection .yearly-chart-container');
    console.log('🔍 [Global] Container check:', container ? 'Found' : 'Not found');
    
    const yearSelect = document.getElementById('yearSelect');
    const year = yearSelect ? yearSelect.value : new Date().getFullYear();
    console.log('🔍 [Global] Selected year:', year);
    
    yearlyChart.updateYearlyChart('yearlyExpenseChart', year);
};

// Auto-cleanup przy zamknięciu strony
window.addEventListener('beforeunload', () => {
    yearlyChart.destroy();
});

// Export dla modułów (jeśli używane)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { YearlyChart, yearlyChart };
}

console.log('📊 [YearlyChart] Module loaded successfully - Version 1.1.1');