// =================================
// HAPTIC.JS - iOS Haptic Feedback Manager
// =================================

window.HapticManager = {
    // Check if haptic feedback is supported
    isSupported() {
        return 'vibrate' in navigator && window.APP_CONFIG.UI.HAPTIC_ENABLED;
    },
    
    // Light haptic feedback
    light() {
        if (this.isSupported()) {
            navigator.vibrate(10);
        }
    },
    
    // Medium haptic feedback
    medium() {
        if (this.isSupported()) {
            navigator.vibrate(20);
        }
    },
    
    // Heavy haptic feedback
    heavy() {
        if (this.isSupported()) {
            navigator.vibrate(30);
        }
    },
    
    // Success pattern
    success() {
        if (this.isSupported()) {
            navigator.vibrate([10, 50, 10]);
        }
    },
    
    // Error pattern
    error() {
        if (this.isSupported()) {
            navigator.vibrate([50, 30, 50, 30, 50]);
        }
    },
    
    // Selection feedback
    selection() {
        if (this.isSupported()) {
            navigator.vibrate(5);
        }
    },
    
    // Warning pattern
    warning() {
        if (this.isSupported()) {
            navigator.vibrate([30, 50, 30]);
        }
    },
    
    // Custom pattern
    custom(pattern) {
        if (this.isSupported() && Array.isArray(pattern)) {
            navigator.vibrate(pattern);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.HapticManager;
}