-- Sprawdź czy kolumna receipt_image_url istnieje
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'detailed_expenses'
AND column_name = 'receipt_image_url';

-- Jeśli zwróci 0 wierszy, uruchom:
ALTER TABLE detailed_expenses 
ADD COLUMN receipt_image_url TEXT;