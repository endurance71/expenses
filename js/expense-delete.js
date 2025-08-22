// =================================
// EXPENSE-DELETE.JS - Expense Delete Manager
// Version: 1.0.0
// =================================

window.ExpenseDeleteManager = {
    // Delete state
    deleteState: {
        pendingDelete: null,
        confirmationTimeout: null
    },
    
    // Initialize delete manager
    init() {
        Utils.debugLog('Initializing Expense Delete Manager');
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Global click handler for delete buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-expense-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const deleteBtn = e.target.closest('.delete-expense-btn');
                const transactionId = deleteBtn.dataset.transactionId;
                const supabaseId = deleteBtn.dataset.supabaseId;
                const timestamp = deleteBtn.dataset.timestamp;
                const description = deleteBtn.dataset.description;
                
                // Przygotuj obiekt z wszystkimi dostępnymi identyfikatorami
                const deleteInfo = {
                    id: transactionId,
                    supabaseId: supabaseId || null,
                    timestamp: timestamp || null,
                    description: description || 'Nieznany wydatek'
                };
                
                if (transactionId) {
                    this.showDeleteConfirmation(deleteInfo);
                }
            }
            
            // Handle confirmation buttons
            if (e.target.closest('.confirm-delete-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.confirmDelete();
            }
            
            if (e.target.closest('.cancel-delete-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.cancelDelete();
            }
        });
        
        // ESC key to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.deleteState.pendingDelete) {
                this.cancelDelete();
            }
        });
    },
    
    // Show delete confirmation  
    showDeleteConfirmation(deleteInfo) {
        // Obsłuż zarówno nowy format (obiekt) jak i stary (osobne parametry)
        let transactionData;
        if (typeof deleteInfo === 'object') {
            transactionData = deleteInfo;
        } else {
            // Stary format - pierwszy argument to ID, drugi to opis
            transactionData = {
                id: deleteInfo,
                description: arguments[1] || 'Nieznany wydatek',
                supabaseId: null,
                timestamp: null
            };
        }
        
        Utils.debugLog(`🗑️ Showing delete confirmation for transaction:`, transactionData);
        
        if (window.HapticManager) {
            window.HapticManager.warning();
        }
        
        this.deleteState.pendingDelete = transactionData;
        
        // Create confirmation modal
        this.createConfirmationModal();
        
        // Auto-cancel after 10 seconds
        this.deleteState.confirmationTimeout = setTimeout(() => {
            this.cancelDelete();
        }, 10000);
    },
    
    // Create confirmation modal
    createConfirmationModal() {
        // Remove existing modal if any
        this.removeConfirmationModal();
        
        const modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        modal.id = 'deleteConfirmationModal';
        
        modal.innerHTML = `
            <div class="delete-confirmation-backdrop"></div>
            <div class="delete-confirmation-content">
                <div class="delete-confirmation-header">
                    <div class="delete-confirmation-icon">🗑️</div>
                    <h3 class="delete-confirmation-title">Usuń wydatek</h3>
                </div>
                <div class="delete-confirmation-body">
                    <p class="delete-confirmation-text">
                        Czy na pewno chcesz usunąć wydatek?
                    </p>
                    <p class="delete-confirmation-description">
                        "${this.deleteState.pendingDelete.description}"
                    </p>
                    <p class="delete-confirmation-warning">
                        Tej operacji nie można cofnąć.
                    </p>
                </div>
                <div class="delete-confirmation-actions">
                    <button class="cancel-delete-btn" type="button">
                        <span>Anuluj</span>
                    </button>
                    <button class="confirm-delete-btn" type="button">
                        <span>Usuń</span>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('open');
            // Add haptic feedback animation
            if (window.HapticManager) {
                modal.classList.add('haptic-light');
                setTimeout(() => modal.classList.remove('haptic-light'), 100);
            }
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
    },
    
    // Remove confirmation modal
    removeConfirmationModal() {
        const modal = document.getElementById('deleteConfirmationModal');
        if (modal) {
            modal.remove();
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    },
    
    // Confirm delete
    async confirmDelete() {
        if (!this.deleteState.pendingDelete) return;
        
        Utils.debugLog(`🗑️ Confirming delete for transaction: ${this.deleteState.pendingDelete.id}`);
        
        if (window.HapticManager) {
            window.HapticManager.medium();
        }
        
        // Update button state
        const confirmBtn = document.querySelector('.confirm-delete-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('loading');
        }
        
        try {
            // Call API to delete
            if (!window.APIService) {
                throw new Error('API Service not available');
            }
            
            // Przygotuj dane do API - wyślij wszystkie dostępne identyfikatory
            const deletePayload = {
                id: this.deleteState.pendingDelete.supabaseId || this.deleteState.pendingDelete.id,
                timestamp: this.deleteState.pendingDelete.timestamp,
                created_at: this.deleteState.pendingDelete.timestamp
            };
            
            const result = await window.APIService.deleteExpense(deletePayload);
            
            // Success feedback
            if (window.HapticManager) {
                window.HapticManager.success();
            }
            
            Utils.debugLog('✅ Expense deleted successfully');
            
            // Close modal
            this.cancelDelete();
            
            // Refresh data
            if (window.WydatkiApp) {
                setTimeout(() => {
                    window.WydatkiApp.refreshData();
                }, 300);
            }
            
        } catch (error) {
            Utils.debugLog('❌ Error deleting expense:', error);
            
            if (window.HapticManager) {
                window.HapticManager.error();
            }
            
            if (window.Utils && window.Utils.showError) {
                window.Utils.showError(error.message || 'Nie udało się usunąć wydatku. Spróbuj ponownie.');
            }
            
            // Reset button
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('loading');
            }
        }
    },
    
    // Cancel delete
    cancelDelete() {
        Utils.debugLog('🚫 Cancelling delete operation');
        
        if (window.HapticManager) {
            window.HapticManager.light();
            // Add haptic animation to modal
            const modal = document.getElementById('deleteConfirmationModal');
            if (modal) {
                modal.classList.add('haptic-light');
                setTimeout(() => modal.classList.remove('haptic-light'), 100);
            }
        }
        
        // Clear timeout
        if (this.deleteState.confirmationTimeout) {
            clearTimeout(this.deleteState.confirmationTimeout);
            this.deleteState.confirmationTimeout = null;
        }
        
        // Clear pending delete
        this.deleteState.pendingDelete = null;
        
        // Remove modal
        this.removeConfirmationModal();
    },
    
    // Create delete button HTML
    createDeleteButton(transaction) {
        // Obsłuż różne formaty inputu
        let transactionId, description, supabaseId, timestamp;
        
        if (typeof transaction === 'object') {
            // Nowy format - cały obiekt transakcji
            transactionId = transaction.id || transaction.supabaseId || transaction.timestamp;
            description = transaction.description || 'Nieznany wydatek';
            supabaseId = transaction.supabaseId || transaction.id;
            timestamp = transaction.timestamp || transaction.created_at;
        } else {
            // Stary format - tylko ID i opis jako osobne parametry
            transactionId = arguments[0];
            description = arguments[1] || 'Nieznany wydatek';
            supabaseId = null;
            timestamp = null;
        }
        
        return `
            <button class="delete-expense-btn" 
                    data-transaction-id="${transactionId}" 
                    data-supabase-id="${supabaseId || ''}"
                    data-timestamp="${timestamp || ''}"
                    data-description="${description}"
                    aria-label="Usuń wydatek"
                    title="Usuń wydatek">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;
    },
    
    // Create action buttons container (view + delete)
    createActionButtons(transaction) {
        const viewBtn = window.ReceiptViewer ? 
            window.ReceiptViewer.createViewReceiptButton(transaction) : '';
        const deleteBtn = this.createDeleteButton(transaction);
        
        return `
            <div class="transaction-actions">
                ${viewBtn}
                ${deleteBtn}
            </div>
        `;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ExpenseDeleteManager;
}