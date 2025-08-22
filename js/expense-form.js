// =================================
// EXPENSE-FORM.JS - Expense Form Manager
// Version: 1.0.4 - FIXED
// =================================

window.ExpenseFormManager = {
    // Form state
    formState: {
        category: 'Prywatne',
        isPayment: false,
        isOther: true
    },
    
    // Payment types configuration
    paymentTypes: {
        'Prywatne': [
            'Mieszkanie',
            'Prąd', 
            'Internet',
            'Telefon',
            'Ubezpieczenie',
            'Subskrypcje'
        ],
        'Firmowe': [
            'ZUS',
            'PIT',
            'VAT',
            'Księgowość',
            'Leasing',
            'Telefon',
            'Biuro'
        ]
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
                window.HapticManager && window.HapticManager.selection();
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.formState.category = btn.dataset.category;
                this.updateFormUI();
                this.updatePaymentTypes();
            });
        });
        
        // Expense type checkboxes
        const paymentCheckbox = document.getElementById('isPayment');
        const otherCheckbox = document.getElementById('isOther');
        
        if (paymentCheckbox) {
            paymentCheckbox.addEventListener('change', (e) => {
                window.HapticManager && window.HapticManager.selection();
                this.formState.isPayment = e.target.checked;
                if (e.target.checked && otherCheckbox) {
                    otherCheckbox.checked = false;
                    this.formState.isOther = false;
                }
                this.updateFormUI();
                this.updatePaymentTypes();
            });
        }
        
        if (otherCheckbox) {
            otherCheckbox.addEventListener('change', (e) => {
                window.HapticManager && window.HapticManager.selection();
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
    
    // Update payment types based on category
    updatePaymentTypes() {
        const paymentTypeSelect = document.getElementById('paymentType');
        if (!paymentTypeSelect) return;
        
        // Clear existing options
        paymentTypeSelect.innerHTML = '';
        
        // Get appropriate payment types
        const category = this.formState.category === 'Firmowe' ? 'Firmowe' : 'Prywatne';
        const types = this.paymentTypes[category];
        
        // Add options
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            paymentTypeSelect.appendChild(option);
        });
    },
    
    // Show form
    show() {
        Utils.debugLog('💰 Opening add expense sheet');
        window.HapticManager && window.HapticManager.medium();
        
        const sheet = document.getElementById('addExpenseSheet');
        const backdrop = document.getElementById('addExpenseBackdrop');
        
        if (!sheet || !backdrop) return;
        
        // Reset form
        this.resetForm();
        
        // Prevent body scroll when sheet is open - iOS PWA friendly
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        // Store scroll position for restoration
        this._savedScrollY = window.scrollY;
        
        // Show backdrop and sheet
        backdrop.classList.add('open');
        backdrop.style.background = 'rgba(0, 0, 0, 0.4)';
        backdrop.style.backdropFilter = 'blur(10px)';
        backdrop.style.webkitBackdropFilter = 'blur(10px)';
        
        requestAnimationFrame(() => {
            sheet.classList.add('open');
        });
        
        // Update add button state
        const addBtn = document.getElementById('addExpenseTab');
        if (addBtn) {
            addBtn.classList.add('active');
        }
    },
    
    // Hide form
    hide() {
        Utils.debugLog('💰 Closing add expense sheet');
        window.HapticManager && window.HapticManager.light();
        
        const sheet = document.getElementById('addExpenseSheet');
        const backdrop = document.getElementById('addExpenseBackdrop');
        const addBtn = document.getElementById('addExpenseTab');
        
        // Restore body scroll - iOS PWA friendly
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        // Restore scroll position if needed
        if (this._savedScrollY !== undefined) {
            window.scrollTo(0, this._savedScrollY);
            this._savedScrollY = undefined;
        }
        
        if (sheet) sheet.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        if (addBtn) addBtn.classList.remove('active');
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
        this.updatePaymentTypes();
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
        window.HapticManager && window.HapticManager.medium();
        
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
            
            if (window.Utils && window.Utils.debugLog) {
                window.Utils.debugLog('📊 Form data:', formData);
            }
            
            // Send to API
            if (!window.APIService) {
                throw new Error('API Service not available');
            }
            const result = await window.APIService.addExpense(formData);
            
            // Success feedback
            if (window.HapticManager) {
                window.HapticManager.success();
            }
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
            if (window.Utils && window.Utils.debugLog) {
                window.Utils.debugLog('❌ Error submitting expense:', error);
            }
            if (window.HapticManager) {
                window.HapticManager.error();
            }
            if (window.Utils && window.Utils.showError) {
                window.Utils.showError(error.message || 'Nie udało się dodać wydatku. Spróbuj ponownie.');
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
    },
    
    // Validate form
    validateForm() {
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('expenseDate').value;
        
        // Replace comma with dot for parsing
        const normalizedAmount = amount.replace(',', '.');
        
        if (!amount || parseFloat(normalizedAmount) <= 0) {
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
        // Normalize amount (replace comma with dot)
        const rawAmount = document.getElementById('amount').value;
        const normalizedAmount = rawAmount.replace(',', '.');
        
        const formData = {
            category: this.formState.category,
            date: document.getElementById('expenseDate').value,
            amount: parseFloat(normalizedAmount),
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