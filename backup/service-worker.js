// =================================
// SERVICE WORKER dla iOS PWA - FIXED
// Version: 1.0.3
// =================================

const CACHE_NAME = 'dashboard-wydatki-v1.0.3';
const CACHE_VERSION = '1.0.3';

// Files to cache - FIXED NAMES
const urlsToCache = [
    '/',
    '/dashboard.html',
    '/manifest.json',
    // CSS Files
    '/css/main.css',
    //'/css/dashboard.css',
    '/css/yearly-chart.css',
    // JavaScript Files
    '/js/config.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/haptic.js',
    '/js/yearly-chart.js',
    '/js/expense-form.js',
    '/js/dashboard.js',
    '/js/app.js',
    // External Dependencies
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
];

// API endpoints to bypass cache
const API_ENDPOINTS = [
    'jan204-20204.wykr.es',
    'webhook',
    'dashboard-wydatki',
    'dashboard-add-expense'
];

// =================================
// INSTALL EVENT
// =================================
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ Cache opened:', CACHE_NAME);
                
                // Cache each resource with error handling
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn(`⚠️ Failed to cache ${url}:`, error.message);
                            return Promise.resolve();
                        });
                    })
                );
            })
            .then((results) => {
                const failed = results.filter(result => result.status === 'rejected');
                if (failed.length > 0) {
                    console.warn(`⚠️ ${failed.length} resources failed to cache`);
                }
                console.log('✅ Cache installation completed');
            })
            .catch((error) => {
                console.error('❌ Cache installation failed:', error);
            })
    );
    
    // Force immediate activation
    self.skipWaiting();
});

// =================================
// ACTIVATE EVENT
// =================================
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker activating...', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName !== CACHE_NAME && cacheName.startsWith('dashboard-wydatki-')) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated successfully');
            })
            .catch((error) => {
                console.error('❌ Service Worker activation failed:', error);
            })
    );
    
    // Take control of all pages immediately
    self.clients.claim();
});

// =================================
// FETCH EVENT
// =================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip browser extensions
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
        return;
    }
    
    // Handle API calls - bypass cache
    const isApiCall = API_ENDPOINTS.some(endpoint => event.request.url.includes(endpoint));
    if (isApiCall) {
        console.log('🌐 Bypassing cache for API call:', url.pathname);
        event.respondWith(
            fetch(event.request)
                .catch(error => {
                    console.error('❌ API call failed:', error);
                    return new Response(
                        JSON.stringify({ 
                            error: 'Network unavailable',
                            message: 'Sprawdź połączenie internetowe',
                            timestamp: new Date().toISOString()
                        }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }
    
    // Cache-first strategy for app resources
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('📦 Serving from cache:', url.pathname);
                    
                    // Update cache in background for critical resources
                    if (shouldUpdateInBackground(url.pathname)) {
                        updateCacheInBackground(event.request);
                    }
                    
                    return cachedResponse;
                }
                
                // Fetch from network
                console.log('🌐 Fetching from network:', url.pathname);
                return fetchAndCache(event.request);
            })
            .catch((error) => {
                console.error('❌ Fetch failed for:', url.pathname, error);
                return getOfflineFallback(event.request);
            })
    );
});

// =================================
// HELPER FUNCTIONS
// =================================

// Check if resource should be updated in background
function shouldUpdateInBackground(pathname) {
    const criticalResources = ['.js', '.css', '.html'];
    return criticalResources.some(ext => pathname.endsWith(ext));
}

// Update cache in background
function updateCacheInBackground(request) {
    fetch(request)
        .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, response.clone()))
                    .catch(error => console.warn('⚠️ Background cache update failed:', error));
            }
        })
        .catch(() => {}); // Silent fail for background updates
}

// Fetch and cache response
function fetchAndCache(request) {
    return fetch(request)
        .then((response) => {
            // Only cache successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
            }
            
            // Cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
                .then((cache) => {
                    cache.put(request, responseToCache);
                })
                .catch(error => {
                    console.warn('⚠️ Failed to cache response:', error);
                });
                
            return response;
        });
}

// Get offline fallback
function getOfflineFallback(request) {
    if (request.destination === 'document') {
        return caches.match('/dashboard.html')
            .then(fallback => {
                if (fallback) {
                    console.log('📄 Serving offline fallback');
                    return fallback;
                }
                
                // Return offline page
                return new Response(
                    generateOfflinePage(),
                    { 
                        headers: { 'Content-Type': 'text/html' },
                        status: 503
                    }
                );
            });
    }
    
    // For other resources, return empty response
    return new Response('', { status: 404 });
}

// Generate offline page HTML
function generateOfflinePage() {
    return `<!DOCTYPE html>
    <html lang="pl">
    <head>
        <title>Offline - Wydatki</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                text-align: center; 
                padding: 50px 20px; 
                background: #F2F2F7;
                color: #000;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .offline-container { 
                max-width: 400px;
                padding: 40px 20px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .offline-icon {
                font-size: 64px;
                margin-bottom: 24px;
            }
            h1 {
                color: #000;
                margin-bottom: 16px;
                font-size: 28px;
            }
            .offline-message {
                color: #666;
                font-size: 17px;
                line-height: 1.5;
                margin-bottom: 32px;
            }
            .retry-btn { 
                background: #007AFF; 
                color: white; 
                border: none; 
                padding: 14px 32px; 
                border-radius: 12px; 
                cursor: pointer; 
                font-size: 17px;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            .retry-btn:hover {
                background: #0051D0;
                transform: scale(1.05);
            }
            @media (prefers-color-scheme: dark) {
                body { background: #000; }
                .offline-container { 
                    background: #1C1C1E;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                h1 { color: #fff; }
                .offline-message { color: #999; }
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>Dashboard Wydatków</h1>
            <div class="offline-message">
                <strong>Brak połączenia internetowego</strong><br><br>
                Sprawdź połączenie Wi-Fi lub mobilne i spróbuj ponownie
            </div>
            <button class="retry-btn" onclick="location.reload()">Spróbuj ponownie</button>
        </div>
    </body>
    </html>`;
}

// =================================
// MESSAGE HANDLING
// =================================
self.addEventListener('message', (event) => {
    console.log('💬 Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            timestamp: new Date().toISOString()
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('🗑️ Cache cleared on request');
                event.ports[0].postMessage({ 
                    success: true,
                    message: 'Cache cleared successfully'
                });
            }).catch(error => {
                console.error('❌ Failed to clear cache:', error);
                event.ports[0].postMessage({ 
                    success: false,
                    error: error.message
                });
            })
        );
    }
});

// =================================
// ERROR HANDLING
// =================================
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection in SW:', event.reason);
    event.preventDefault();
});

console.log('🚀 Service Worker loaded successfully', CACHE_VERSION);