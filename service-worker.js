// =================================
// SERVICE WORKER dla iOS PWA - FIXED
// Zoptymalizowany dla Safari/iPhone
// =================================

const CACHE_NAME = 'dashboard-wydatki-v1.0.2';
const CACHE_VERSION = '1.0.2';

// FIXED: Tylko rzeczywiście istniejące pliki
const urlsToCache = [
    '/dashboard.html',
    '/dashboard-styles-pwa.css',
    '/dashboard-script-4.js',
    '/yealrly-chart.2.0.js',
    '/yealrly-chart-styles.css',
    '/manifest.json',
    '/icon-180.png',
    // REMOVED: Usunięto referencje do nieistniejących plików ikon
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js' // FIXED: Zsynchronizowano z HTML
];

// API endpoints to bypass cache
const API_ENDPOINTS = [
    'jan204-20204.wykr.es',
    'n8n.wykr.es',
    'webhook'
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
                
                // IMPROVED: Better error handling for each resource
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn(`⚠️ Failed to cache ${url}:`, error.message);
                            // Don't fail the entire installation for one resource
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
// FETCH EVENT - FIXED
// =================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        console.log('⏭️ Skipping non-GET request:', event.request.method, url.pathname);
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
        return;
    }
    
    // FIXED: Bypass API calls - COMPLETE BLOCK with proper return
    const isApiCall = API_ENDPOINTS.some(endpoint => event.request.url.includes(endpoint));
    if (isApiCall) {
        console.log('🌐 Bypassing cache for API call:', event.request.url);
        
        event.respondWith(
            Promise.race([
                fetch(event.request).catch(error => {
                    console.error('❌ API call failed:', error);
                    // Return meaningful error response
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
                }),
                // Timeout after 10 seconds
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API timeout')), 10000)
                )
            ]).catch(error => {
                console.error('❌ API request timed out or failed:', error);
                return new Response(
                    JSON.stringify({ 
                        error: 'Request timeout',
                        message: 'Żądanie przekroczyło limit czasu',
                        timestamp: new Date().toISOString()
                    }),
                    {
                        status: 408,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
        );
        return; // FIXED: Added proper return
    }
    
    // Cache-first strategy for app resources
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('📦 Serving from cache:', url.pathname);
                    
                    // IMPROVED: Background update for critical resources
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
                
                // IMPROVED: Better offline fallbacks
                return getOfflineFallback(event.request);
            })
    );
});

// HELPER: Check if resource should be updated in background
function shouldUpdateInBackground(pathname) {
    const criticalResources = ['.js', '.css', '.html'];
    return criticalResources.some(ext => pathname.endsWith(ext));
}

// HELPER: Update cache in background
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

// HELPER: Fetch and cache response
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

// HELPER: Get offline fallback
function getOfflineFallback(request) {
    if (request.destination === 'document') {
        return caches.match('/dashboard.html')
            .then(fallback => {
                if (fallback) {
                    console.log('📄 Serving offline fallback');
                    return fallback;
                }
                
                // IMPROVED: Better offline page
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

// HELPER: Generate offline page HTML
function generateOfflinePage() {
    return `<!DOCTYPE html>
    <html lang="pl">
    <head>
        <title>Offline - Wydatki</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <style>
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
            .offline { 
                color: #666; 
                max-width: 400px;
            }
            .retry-btn { 
                background: #007AFF; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 8px; 
                margin-top: 20px;
                cursor: pointer; 
                font-size: 16px;
                font-weight: 600;
            }
            .offline-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
            h1 {
                color: #000;
                margin-bottom: 10px;
            }
            @media (prefers-color-scheme: dark) {
                body { background: #000; color: #fff; }
                h1 { color: #fff; }
                .offline { color: #999; }
            }
        </style>
    </head>
    <body>
        <div class="offline-icon">📱</div>
        <h1>Dashboard Wydatków</h1>
        <div class="offline">
            <p><strong>Brak połączenia internetowego</strong></p>
            <p>Sprawdź połączenie Wi-Fi lub mobilne i spróbuj ponownie</p>
        </div>
        <button class="retry-btn" onclick="location.reload()">Spróbuj ponownie</button>
    </body>
    </html>`;
}

// =================================
// BACKGROUND SYNC
// =================================
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            Promise.resolve().then(() => {
                console.log('✅ Background sync completed');
                // Notify clients that sync completed
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SYNC_COMPLETE',
                            timestamp: new Date().toISOString()
                        });
                    });
                });
            })
        );
    }
});

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
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.keys();
            }).then(keys => {
                event.ports[0].postMessage({
                    cacheSize: keys.length,
                    cachedUrls: keys.map(req => req.url),
                    version: CACHE_VERSION
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
    
    // Notify clients about error
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_ERROR',
                error: event.error.message,
                timestamp: new Date().toISOString()
            });
        });
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection in SW:', event.reason);
    
    // Prevent default to avoid console spam
    event.preventDefault();
    
    // Notify clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_PROMISE_REJECTION',
                reason: event.reason,
                timestamp: new Date().toISOString()
            });
        });
    });
});

// =================================
// iOS SPECIFIC OPTIMIZATIONS
// =================================

// Handle iOS-specific PWA navigation issues
self.addEventListener('fetch', (event) => {
    // Fix for iOS standalone mode navigation
    if (event.request.mode === 'navigate' && 
        event.request.destination === 'document') {
        
        const url = new URL(event.request.url);
        
        // Redirect to dashboard.html for any navigation request
        if (url.pathname === '/' || url.pathname === '/index.html') {
            event.respondWith(
                caches.match('/dashboard.html').then(response => {
                    return response || fetch('/dashboard.html').catch(() => {
                        return new Response(generateOfflinePage(), {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
                })
            );
        }
    }
});

// Prevent iOS from sleeping the service worker
let keepAliveInterval;

function startKeepAlive() {
    if (keepAliveInterval) return;
    
    keepAliveInterval = setInterval(() => {
        console.log('🔄 SW keepalive:', new Date().toISOString());
        
        // Ping all clients to keep connections alive
        self.clients.matchAll().then(clients => {
            if (clients.length === 0) {
                // No clients, can stop keepalive
                stopKeepAlive();
            }
        });
    }, 30000); // 30 seconds
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('⏹️ SW keepalive stopped');
    }
}

// Start keepalive when SW becomes active
self.addEventListener('activate', startKeepAlive);

// Monitor client connections
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLIENT_CONNECTED') {
        startKeepAlive();
    }
});

// =================================
// PERFORMANCE MONITORING
// =================================
let performanceData = {
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    errors: 0
};

function updatePerformanceMetrics(type) {
    performanceData[type] = (performanceData[type] || 0) + 1;
    
    // Send metrics to clients every 100 requests
    const totalRequests = performanceData.cacheHits + performanceData.cacheMisses + performanceData.networkRequests;
    if (totalRequests % 100 === 0) {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'PERFORMANCE_METRICS',
                    data: performanceData,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }
}

// Update fetch event to include performance tracking
const originalFetchHandler = self.onfetch;
self.addEventListener('fetch', (event) => {
    // Track performance
    const url = new URL(event.request.url);
    if (!API_ENDPOINTS.some(endpoint => url.href.includes(endpoint))) {
        updatePerformanceMetrics('networkRequests');
    }
});

console.log('🚀 Service Worker script loaded successfully', CACHE_VERSION);
console.log('📊 Performance tracking enabled');
console.log('🔧 iOS optimizations active');