// Debug script - wklej w Console przeglądarki na serwerze

console.log('=== RECEIPT VIEWER DEBUG ===');

// Sprawdź czy componenty są załadowane
console.log('ReceiptViewer:', window.ReceiptViewer ? '✅' : '❌');
console.log('ExpenseDeleteManager:', window.ExpenseDeleteManager ? '✅' : '❌');

// Sprawdź przykładowe dane
const sampleTransaction = {
    id: 1,
    description: "Test receipt",
    receipt_image_url: "https://example.com/test.jpg"
};

console.log('Sample button HTML:');
if (window.ReceiptViewer) {
    console.log(window.ReceiptViewer.createViewReceiptButton(sampleTransaction));
} else {
    console.log('❌ ReceiptViewer not available');
}

// Sprawdź czy są transakcje z receipt_image_url
console.log('Current transactions with receipts:', 
    document.querySelectorAll('.view-receipt-btn').length);

console.log('=== END DEBUG ===');