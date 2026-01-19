# PWA Implementation Specifications

## 1. Enhanced Service Worker Implementation

### File: `/frontend/public/service-worker-v2.js`

\`\`\`javascript
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'mdrrmo-dashboard-v2';
const OFFLINE_CACHE_NAME = 'mdrrmo-offline-v2';
const API_CACHE_NAME = 'mdrrmo-api-v2';
const IMAGE_CACHE_NAME = 'mdrrmo-images-v2';
const TILE_CACHE_NAME = 'mdrrmo-tiles-v2';

// Critical assets for offline functionality
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/sheets/',
  '/api/drive/folder/',
  '/api/cache/',
  '/api/sync/',
];

// Map tile providers to cache
const TILE_PROVIDERS = [
  'tile.openstreetmap.org',
  'api.mapbox.com',
  'tiles.stadiamaps.com',
  'basemaps.cartocdn.com',
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Opened main cache');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      caches.open(OFFLINE_CACHE_NAME).then((cache) => {
        console.log('Opened offline cache');
        return cache.add('/offline.html');
      }),
      self.skipWaiting()
    ]).catch((error) => {
      console.error('Failed to cache critical assets:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE_NAME && 
              cacheName !== API_CACHE_NAME &&
              cacheName !== IMAGE_CACHE_NAME &&
              cacheName !== TILE_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Map tiles - Cache First with Network Fallback
  if (isTileRequest(request)) {
    event.respondWith(handleTileRequest(request));
    return;
  }

  // Strategy 2: Images - Cache First with Network Update
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Strategy 3: API calls - Network First with Cache Fallback
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Strategy 4: Static assets - Cache First with Network Update
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Strategy 5: Navigation requests - Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(request).catch(() => caches.match(request)).catch(() => null)
  );
});

// Background sync for data operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('Background sync triggered');
    event.waitUntil(syncDataOperations());
  } else if (event.tag === 'sync-tiles') {
    console.log('Tile sync triggered');
    event.waitUntil(syncTileCache());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from MDRRMO',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'mdrrmo-notification',
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MDRRMO Notification', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/').then((client) => {
        if (client) client.focus();
      })
    );
  } else {
    event.waitUntil(
      clients.openWindow('/').then((client) => {
        if (client) client.focus();
      })
    );
  }
});

// Message handling from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncDataOperations());
  } else if (event.data && event.data.type === 'CACHE_TILES') {
    event.waitUntil(cacheTiles(event.data.tiles));
  }
});

// Helper functions

function isTileRequest(request) {
  return TILE_PROVIDERS.some(provider => request.url.includes(provider));
}

function isImageRequest(request) {
  return request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
}

function isApiRequest(request) {
  return API_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
}

function isStaticAsset(request) {
  return request.url.match(/\.(css|js|woff|woff2|ttf|eot)$/i);
}

async function handleTileRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(TILE_CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.warn('Tile fetch failed, serving offline placeholder:', error);
    return caches.match('/offline-tile.png') || new Response('Offline Tile', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone();
        caches.open(IMAGE_CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
    }).catch(() => {
      // Ignore background fetch errors
    });
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(IMAGE_CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.warn('Image fetch failed:', error);
    return new Response('Image not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.warn('API fetch failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline - data not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background for critical assets
    if (CRITICAL_ASSETS.includes(request.url)) {
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
    }
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.warn('Static asset fetch failed:', error);
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.warn('Navigation fetch failed, serving offline page:', error);
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline - page not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function syncDataOperations() {
  try {
    // Get queued operations from IndexedDB
    const operations = await getQueuedOperations();
    
    for (const operation of operations) {
      try {
        const response = await fetch('/api/sync/operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation)
        });
        
        if (response.ok) {
          await removeQueuedOperation(operation.id);
        }
      } catch (error) {
        console.error('Sync operation failed:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncTileCache() {
  try {
    // Preload tiles for frequently accessed areas
    const areas = await getFrequentlyAccessedAreas();
    
    for (const area of areas) {
      await preloadTilesForArea(area);
    }
  } catch (error) {
    console.error('Tile sync failed:', error);
  }
}

async function cacheTiles(tiles) {
  try {
    for (const tile of tiles) {
      const response = await fetch(tile.url);
      if (response.ok) {
        const blob = await response.blob();
        const cache = await caches.open(TILE_CACHE_NAME);
        cache.put(tile.request, new Response(blob));
      }
    }
  } catch (error) {
    console.error('Tile caching failed:', error);
  }
}

// Utility functions for IndexedDB operations (would be implemented in service worker)
async function getQueuedOperations() {
  // Implementation would use IndexedDB in service worker context
  return [];
}

async function removeQueuedOperation(id) {
  // Implementation would use IndexedDB in service worker context
}

async function getFrequentlyAccessedAreas() {
  // Implementation would use IndexedDB in service worker context
  return [];
}

async function preloadTilesForArea(area) {
  // Implementation would use IndexedDB in service worker context
}
\`\`\`

## 2. PWA Manifest Implementation

### File: `/frontend/public/manifest.json`

\`\`\`json
{
  "name": "MDRRMO Pio Duran Dashboard",
  "short_name": "MDRRMO Dashboard",
  "description": "Disaster Risk Reduction and Management Office Dashboard for Pio Duran",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#009688",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities", "maps", "government"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/maps.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/interactive-map.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "Maps",
      "short_name": "Maps",
      "description": "View interactive maps and data",
      "url": "/maps",
      "icons": [{ "src": "/icons/map-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "View main dashboard",
      "url": "/",
      "icons": [{ "src": "/icons/dashboard-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Reports",
      "short_name": "Reports",
      "description": "View data reports",
      "url": "/reports",
      "icons": [{ "src": "/icons/reports-icon.png", "sizes": "96x96" }]
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false,
  "edge_side_panel": {
    "preferred_width": 400
  },
  "launch_handler": {
    "client_mode": "navigate-existing"
  }
}
\`\`\`

## 3. Offline Fallback Page

### File: `/frontend/public/offline.html`

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#009688" />
    <title>MDRRMO Pio Duran - Offline</title>
    <style>
        :root {
            --primary-color: #009688;
            --secondary-color: #00796b;
            --text-color: #333;
            --bg-color: #f5f5f5;
            --card-bg: #ffffff;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }

        .offline-container {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: var(--shadow);
            max-width: 600px;
            width: 100%;
        }

        .offline-icon {
            font-size: 64px;
            color: var(--primary-color);
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: var(--primary-color);
        }

        p {
            font-size: 16px;
            line-height: 1.6;
            color: #666;
            margin-bottom: 30px;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 30px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            background-color: #dc3545;
            border-radius: 50%;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .actions {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background-color: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background-color: var(--secondary-color);
            transform: translateY(-2px);
        }

        .btn-secondary {
            background-color: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
        }

        .btn-secondary:hover {
            background-color: #e9ecef;
            transform: translateY(-2px);
        }

        .features {
            margin-top: 30px;
            text-align: left;
        }

        .features h3 {
            font-size: 18px;
            margin-bottom: 15px;
            color: var(--primary-color);
        }

        .feature-list {
            list-style: none;
        }

        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .feature-list li:last-child {
            border-bottom: none;
        }

        .feature-icon {
            color: var(--primary-color);
            font-size: 18px;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e9ecef;
            border-radius: 4px;
            margin-top: 20px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background-color: var(--primary-color);
            width: 0%;
            transition: width 0.3s ease;
        }

        @media (max-width: 480px) {
            .offline-container {
                padding: 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .actions {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>You're Offline</h1>
        <p>The MDRRMO Pio Duran Dashboard is currently unavailable because you're not connected to the internet.</p>
        
        <div class="status-indicator">
            <div class="status-dot"></div>
            <span>Connection Status: Offline</span>
        </div>

        <div class="actions">
            <button class="btn btn-primary" onclick="window.location.reload()">
                Try Again
            </button>
            <button class="btn btn-secondary" onclick="checkConnection()">
                Check Connection
            </button>
        </div>

        <div class="features">
            <h3>Available Offline Features:</h3>
            <ul class="feature-list">
                <li><span class="feature-icon">🗺️</span> View cached maps and tiles</li>
                <li><span class="feature-icon">📊</span> Access previously loaded data</li>
                <li><span class="feature-icon">📸</span> View cached images and documents</li>
                <li><span class="feature-icon">💾</span> Continue working with local data</li>
            </ul>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" id="connectionProgress"></div>
        </div>
    </div>

    <script>
        // Check connection status
        function checkConnection() {
            const progress = document.getElementById('connectionProgress');
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-indicator span');
            
            progress.style.width = '0%';
            statusDot.style.backgroundColor = '#ffc107';
            statusText.textContent = 'Checking connection...';
            
            // Simulate connection check
            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += 10;
                progress.style.width = progressValue + '%';
                
                if (progressValue >= 100) {
                    clearInterval(interval);
                    if (navigator.onLine) {
                        statusDot.style.backgroundColor = '#28a745';
                        statusText.textContent = 'Connection Status: Online';
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        statusDot.style.backgroundColor = '#dc3545';
                        statusText.textContent = 'Connection Status: Offline';
                    }
                }
            }, 100);
        }

        // Listen for online/offline events
        window.addEventListener('online', () => {
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-indicator span');
            statusDot.style.backgroundColor = '#28a745';
            statusText.textContent = 'Connection Status: Online';
            
            // Auto-reload after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        });

        window.addEventListener('offline', () => {
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-indicator span');
            statusDot.style.backgroundColor = '#dc3545';
            statusText.textContent = 'Connection Status: Offline';
        });

        // Initial check
        if (navigator.onLine) {
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-indicator span');
            statusDot.style.backgroundColor = '#28a745';
            statusText.textContent = 'Connection Status: Online';
        }
    </script>
</body>
</html>
\`\`\`

This comprehensive specification provides the foundation for implementing advanced PWA features. The next steps would be to create the remaining components including the offline data management system, connection status indicators, and PWA installation prompts.
