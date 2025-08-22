// =================================
// RECEIPT-VIEWER.JS - Receipt Image Viewer
// Version: 1.0.0
// =================================

window.ReceiptViewer = {
    // Initialize receipt viewer
    init() {
        Utils.debugLog('Initializing Receipt Viewer');
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Global click handler for view receipt buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-receipt-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const viewBtn = e.target.closest('.view-receipt-btn');
                const imageUrl = viewBtn.dataset.imageUrl;
                const description = viewBtn.dataset.description;
                
                if (imageUrl) {
                    this.showReceipt(imageUrl, description);
                }
            }
            
            // Close receipt modal
            if (e.target.closest('.receipt-close') || e.target.closest('.receipt-backdrop')) {
                e.preventDefault();
                e.stopPropagation();
                this.hideReceipt();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideReceipt();
            }
        });
    },
    
    // Show receipt image
    showReceipt(imageUrl, description = 'Paragon') {
        Utils.debugLog('📸 Showing receipt:', imageUrl);
        
        if (window.HapticManager) {
            window.HapticManager.light();
        }
        
        // Remove existing modal
        this.hideReceipt();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'receipt-modal';
        modal.id = 'receiptModal';
        
        // Optimize image URL for Cloudinary
        const optimizedUrl = this.optimizeImageUrl(imageUrl);
        
        modal.innerHTML = `
            <div class="receipt-backdrop"></div>
            <div class="receipt-content">
                <div class="receipt-header">
                    <h3 class="receipt-title">${description}</h3>
                    <button class="receipt-close" aria-label="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="receipt-image-container">
                    <img src="${optimizedUrl}" 
                         alt="${description}" 
                         class="receipt-image"
                         loading="lazy">
                    <div class="receipt-loading">
                        <div class="receipt-spinner"></div>
                        <span>Ładowanie...</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup image loading
        const img = modal.querySelector('.receipt-image');
        const loading = modal.querySelector('.receipt-loading');
        
        img.onload = () => {
            loading.style.display = 'none';
            img.style.opacity = '1';
        };
        
        img.onerror = () => {
            loading.innerHTML = '<span>❌ Błąd ładowania obrazu</span>';
        };
        
        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('open');
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
    },
    
    // Hide receipt modal
    hideReceipt() {
        const modal = document.getElementById('receiptModal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    },
    
    // Optimize Cloudinary image URL
    optimizeImageUrl(url) {
        if (!url || !url.includes('cloudinary.com')) {
            return url;
        }
        
        // Add Cloudinary transformations for mobile optimization
        const transformations = [
            'f_auto',      // Auto format (WebP when supported)
            'q_auto',      // Auto quality
            'w_800',       // Max width 800px
            'h_1200',      // Max height 1200px
            'c_limit'      // Don't upscale
        ].join(',');
        
        return url.replace('/upload/', `/upload/${transformations}/`);
    },
    
    // Download image
    async downloadImage(imageUrl, description) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${description.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            if (window.HapticManager) {
                window.HapticManager.success();
            }
        } catch (error) {
            console.error('Download error:', error);
            Utils.showError('Nie udało się pobrać obrazu');
        }
    },
    
    // Share image
    async shareImage(imageUrl, description) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: description,
                    text: `Paragon: ${description}`,
                    url: imageUrl
                });
                
                if (window.HapticManager) {
                    window.HapticManager.success();
                }
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback - copy URL to clipboard
            navigator.clipboard.writeText(imageUrl).then(() => {
                Utils.showSuccess('Link do obrazu skopiowany!');
                if (window.HapticManager) {
                    window.HapticManager.success();
                }
            });
        }
    },
    
    // Create view receipt button HTML
    createViewReceiptButton(transaction) {
        if (!transaction.receipt_image_url) {
            return '';
        }
        
        return `
            <button class="view-receipt-btn" 
                    data-image-url="${transaction.receipt_image_url}"
                    data-description="${transaction.description || 'Paragon'}"
                    aria-label="Pokaż paragon"
                    title="Pokaż paragon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12c0 1-4 6-9 6s-9-5-9-6 4-6 9-6 9 5 9 6z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </button>
        `;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ReceiptViewer;
}