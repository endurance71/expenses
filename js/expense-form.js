// =================================
// EXPENSE-FORM.JS - Expense Form Manager (FIXED)
// Version: 1.0.4
// =================================

window.ExpenseFormManager = {
    // Form state
    formState: {
        category: 'Prywatne',
        isPayment: false,
        isOther: true
    },
    
    // Initialize form
    init() {
        Utils.debugLog('Initializing Expense Form Manager');
        this.setupEventListeners();
        this.resetForm();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Category selection
        const categoryButtons = document.querySelectorAll('.segment-button');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                HapticManager.selection();
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.formState.category = btn.dataset.category;
                this.updateFormUI();
            });
        });
        
        // Expense type checkboxes
        const paymentCheckbox = document.getElementById('isPayment');
        const otherCheckbox = document.getElementById('isOther');
        
        if (paymentCheckbox) {
            paymentCheckbox.addEventListener('change', (e) => {
                HapticManager.selection();
                this.formState.isPayment = e.target.checked;
                if (e.target.checked && otherCheckbox) {
                    otherCheckbox.checked = false;
                    this.formState.isOther = false;
                }
                this.updateFormUI();
            });
        }
        
        if (otherCheckbox) {
            otherCheckbox.addEventListener('change', (e) => {
                HapticManager.selection();
                this.formState.isOther = e.target.checked;
                if (e.target.checked && paymentCheckbox) {
                    paymentCheckbox.checked = false;
                    this.formState.isPayment = false;
                }
                this.updateFormUI();
            });
        }
        
        // Form submission
        const form = document.getElementById('addExpenseForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Close buttons
        const closeBtn = document.getElementById('closeAddExpense');
        const backdrop = document.getElementById('addExpenseBackdrop');
        const handle = document.getElementById('addExpenseHandle');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        if (backdrop) {
            backdrop.addEventListener('click', () => this.hide());
        }
        if (handle) {
            handle.addEventListener('click', () => this.hide());
        }
    },
    
    // Show form
    show() {
        Utils.debugLog('💰 Opening add expense sheet');
        HapticManager.medium();
        
        const sheet = document.getElementById('addExpenseSheet');
        const backdrop = document.getElementById('addExpenseBackdrop');
        
        if (!sheet || !backdrop) return;
        
        // Close any open category sheets first
        if (window.DashboardManager) {
            window.DashboardManager.hideBottomSheet();
            window.DashboardManager.activeSheet = 'expense';
        }
        
        // Lock body scroll
        if (window.DashboardManager) {
            window.DashboardManager.lockBodyScroll();
        }
        
        // Reset form
        this.resetForm();
        
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
        
        // Update all tab items
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            if (item.id !== 'addExpenseTab') {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            }
        });
    },
    
    // Hide form
    hide() {
        Utils.debugLog('💰 Closing add expense sheet');
        HapticManager.light();
        
        const sheet = document.getElementById('addExpenseSheet');
        const backdrop = document.getElementById('addExpenseBackdrop');
        const addBtn = document.getElementById('addExpenseTab');
        
        if (sheet) sheet.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        if (addBtn) addBtn.classList.remove('active');
        
        // Unlock body scroll
        if (window.DashboardManager) {
            window.DashboardManager.unlockBodyScroll();
            window.DashboardManager.activeSheet = null;
        }
        
        // Return to dashboard if no other sheet is active
        if (window.DashboardManager && !window.DashboardManager.activeSheet) {
            window.DashboardManager.updateTabBar('dashboard');
        }
    },
    
    // Toggle form (for add button click when already open)
    toggle() {
        const sheet = document.getElementById('addExpenseSheet');
        if (sheet && sheet.classList.contains('open')) {
            this.hide();
        } else {
            this.show();
        }
    },
    
    // Reset form
    resetForm() {
        const form = document.getElementById('addExpenseForm');
        if (form) form.reset();
        
        // Set default date to today
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        
        // Reset to default state
        this.formState.category = 'Prywatne';
        this.formState.isPayment = false;
        this.formState.isOther = true;
        
        // Update UI
        this.updateFormUI();
    },
    
    // Update form UI based on selections
    updateFormUI() {
        const subcategoryGroup = document.getElementById('subcategoryGroup');
        const companyGroup = document.getElementById('companyGroup');
        const paymentTypeGroup = document.getElementById('paymentTypeGroup');
        const descriptionGroup = document.getElementById('descriptionGroup');
        
        // Show/hide based on category
        if (this.formState.category === 'Prywatne') {
            if (subcategoryGroup) subcategoryGroup.classList.remove('hidden');
            if (companyGroup) companyGroup.classList.add('hidden');
        } else {
            if (subcategoryGroup) subcategoryGroup.classList.add('hidden');
            if (companyGroup) companyGroup.classList.remove('hidden');
        }
        
        // Show/hide based on expense type
        if (this.formState.isPayment) {
            if (paymentTypeGroup) paymentTypeGroup.classList.remove('hidden');
            if (descriptionGroup) descriptionGroup.classList.add('hidden');
        } else {
            if (paymentTypeGroup) paymentTypeGroup.classList.add('hidden');
            if (descriptionGroup) descriptionGroup.classList.remove('hidden');
        }
    },
    
    // Handle form submission
    async handleSubmit(e) {
        e.preventDefault();
        Utils.debugLog('📤 Submitting expense');
        HapticManager.medium();
        
        const submitBtn = document.querySelector('.submit-button');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        
        try {
            // Validate form
            if (!this.validateForm()) {
                throw new Error('Proszę wypełnić wszystkie wymagane pola');
            }
            
            // Gather form data
            const formData = this.gatherFormData();
            
            Utils.debugLog('📊 Form data:', formData);
            
            // Send to API
            const result = await window.APIService.addExpense(formData);
            
            // Success feedback
            HapticManager.success();
            if (submitBtn) {
                submitBtn.classList.add('success');
                setTimeout(() => {
                    submitBtn.classList.remove('success');
                    submitBtn.disabled = false;
                }, 2000);
            }
            
            // Close sheet and refresh data
            setTimeout(() => {
                this.hide();
                if (window.WydatkiApp) {
                    window.WydatkiApp.refreshData();
                }
            }, 1500);
            
        } catch (error) {
            Utils.debugLog('❌ Error submitting expense:', error);
            HapticManager.error();
            Utils.showError(error.message || 'Nie udało się dodać wydatku. Spróbuj ponownie.');
            
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    },
    
    // Validate form
    validateForm() {
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('expenseDate').value;
        
        if (!amount || parseFloat(amount) <= 0) {
            Utils.showError('Proszę podać prawidłową kwotę');
            return false;
        }
        
        if (!date) {
            Utils.showError('Proszę wybrać datę');
            return false;
        }
        
        // Validate category-specific fields
        if (this.formState.category === 'Prywatne') {
            const subcategory = document.getElementById('subcategory').value;
            if (!subcategory || subcategory.trim() === '') {
                Utils.showError('Proszę podać subkategorię');
                return false;
            }
        } else {
            const company = document.getElementById('company').value;
            if (!company) {
                Utils.showError('Proszę wybrać firmę');
                return false;
            }
        }
        
        // Validate expense type fields
        if (this.formState.isPayment) {
            const paymentType = document.getElementById('paymentType').value;
            if (!paymentType) {
                Utils.showError('Proszę wybrać typ opłaty');
                return false;
            }
        } else {
            const description = document.getElementById('description').value;
            if (!description || description.trim() === '') {
                Utils.showError('Proszę podać opis wydatku');
                return false;
            }
        }
        
        return true;
    },
    
    // Gather form data
    gatherFormData() {
        const formData = {
            category: this.formState.category,
            date: document.getElementById('expenseDate').value,
            amount: parseFloat(document.getElementById('amount').value),
            timestamp: new Date().toISOString()
        };
        
        // Add category-specific data
        if (this.formState.category === 'Prywatne') {
            formData.subcategory = document.getElementById('subcategory').value.trim();
        } else {
            formData.company = document.getElementById('company').value;
            formData.category = formData.company; // Use company as category for business expenses
        }
        
        // Add expense type data
        if (this.formState.isPayment) {
            formData.type = 'payment';
            formData.paymentType = document.getElementById('paymentType').value;
            formData.description = `Opłata ${formData.paymentType}`;
        } else {
            formData.type = 'other';
            formData.description = document.getElementById('description').value.trim();
        }
        
        return formData;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExpenseFormManager;
}