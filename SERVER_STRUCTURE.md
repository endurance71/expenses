# 📁 STRUKTURA SERWERA - Expenses App

## 🎯 **Główne pliki do wrzucenia:**

```
/var/www/html/expenses/
├── 📄 dashboard.html              # Główna strona aplikacji
├── 🤖 service-worker.js           # Service worker dla PWA
│
├── 📁 js/                         # Skrypty JavaScript
│   ├── api.js                     # API service (Supabase)
│   ├── app.js                     # Główna aplikacja
│   ├── config.js                  # Konfiguracja
│   ├── dashboard.js               # Logika dashboard
│   ├── expense-delete.js          # Usuwanie wydatków + przyciski 📸
│   ├── expense-form.js            # Formularz wydatków
│   ├── haptic.js                  # Wibracje iOS
│   ├── receipt-viewer.js          # ⭐ NOWY: Viewer zdjęć paragonów
│   ├── utils.js                   # Utilities
│   └── yearly-chart.js            # Wykresy roczne
│
├── 📁 css/                        # Style CSS
│   ├── main.css                   # ⭐ ZAKTUALIZOWANY: Style + receipt modal
│   ├── dashboard.css              # Dashboard specific styles
│   ├── reset.css                  # CSS reset
│   ├── styles.css                 # Base styles
│   ├── yearly-chart.css           # Chart styles
│   └── 📁 themes/                 # Tematy kolorystyczne
│       ├── green-white.css
│       ├── grey-white.css
│       ├── indigo-white.css
│       ├── red-white.css
│       ├── white-blue.css
│       ├── white-grey.css
│       ├── white-indigo.css
│       ├── white-red.css
│       └── yellow-black.css
│
└── 📁 assets/                     # Zasoby (jeśli istnieją)
    └── icons/                     # Ikony PWA
        ├── icon-192.png
        └── icon-512.png
```

## ⚠️ **PLIKI DO WYKLUCZENIA (nie wrzucać):**

```
❌ Backup/                         # Folder z kopiami zapasowymi
❌ n8n/                           # Pliki konfiguracyjne n8n
❌ SupaBase/                      # Pliki SQL/konfiguracyjne
❌ debug-receipt-viewer.js        # Plik debugowy
❌ *.md files                     # Dokumentacja
❌ database-migration.sql         # SQL - już wykonany
❌ .DS_Store                      # Pliki systemowe macOS
```

## 🔧 **Uprawnienia serwera:**

```bash
# Ustaw właściciela
sudo chown -R www-data:www-data /var/www/html/expenses/

# Ustaw uprawnienia
sudo find /var/www/html/expenses/ -type d -exec chmod 755 {} \;
sudo find /var/www/html/expenses/ -type f -exec chmod 644 {} \;
```

## 🌐 **Konfiguracja Nginx/Apache:**

### Nginx:
```nginx
location /expenses {
    try_files $uri $uri/ /expenses/dashboard.html;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # No cache for HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### Apache (.htaccess):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ dashboard.html [L]

# Cache static assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>

# No cache for HTML
<FilesMatch "\.html$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
</FilesMatch>
```

## 🚀 **Szybki Deploy Script:**

```bash
#!/bin/bash
# deploy.sh

# Kopiuj tylko potrzebne pliki
rsync -av --exclude='Backup/' \
          --exclude='n8n/' \
          --exclude='SupaBase/' \
          --exclude='*.md' \
          --exclude='debug-*.js' \
          --exclude='.DS_Store' \
          . /var/www/html/expenses/

# Ustaw uprawnienia
sudo chown -R www-data:www-data /var/www/html/expenses/
sudo find /var/www/html/expenses/ -type d -exec chmod 755 {} \;
sudo find /var/www/html/expenses/ -type f -exec chmod 644 {} \;

echo "✅ Deploy complete!"
```

## 📋 **Checklist po deploy:**

- [ ] Sprawdź czy `dashboard.html` się ładuje
- [ ] Sprawdź Console (F12) - czy brak błędów 404
- [ ] Sprawdź czy API łączy się z Supabase
- [ ] Wyślij zdjęcie przez Telegram
- [ ] Sprawdź czy pojawił się przycisk 📸
- [ ] Przetestuj kliknięcie na przycisk 📸

## 🎯 **Problem z brakiem przycisków:**

Jeśli nadal brak przycisków 📸, sprawdź:

1. **Console błędy:** F12 → Console
2. **Network:** Czy API zwraca dane z `receipt_image_url`?
3. **Cache:** Wyczyść cache przeglądarki (Ctrl+F5)
4. **Struktura danych:** Czy `createActionButtons()` jest wywoływany?