// Advanced PWA Service Worker with comprehensive offline support
const CACHE_NAME = 'mdrrmo-pwa-v1.2.0';
const DATA_CACHE_NAME = 'mdrrmo-data-v1.2.0';
const OFFLINE_CACHE_NAME = 'mdrrmo-offline-v1.2.0';

// Core application files to cache for offline functionality
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/service-worker.js',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should be cached for offline access
const API_CACHE_RULES = {
  // Static data that rarely changes
  '/api/static/': {
    strategy: 'cache-first',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 50
  },
  
  // User data and settings
  '/api/user/': {
    strategy: 'network-first',
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 100
  },
  
  // Map tiles and imagery
  '/api/maps/tiles/': {
    strategy: 'cache-first',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 1000
  },
  
  // Documents and media
  '/api/documents/': {
    strategy: 'cache-first',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 200
  },
  
  // Real-time data
  '/api/notifications/': {
    strategy: 'network-only',
    maxAge: 5 * 60 * 1000 // 5 minutes
  }
};

// Background sync queue for offline operations
const BACKGROUND_SYNC_QUEUE = 'background-sync-queue';

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Core assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache core assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName !== CACHE_NAME && 
              cacheName !== DATA_CACHE_NAME && 
              cacheName !== OFFLINE_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests with intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.origin === location.origin) {
    // Same-origin requests
    event.respondWith(handleAppRequest(request));
  } else if (url.origin.startsWith('https://maps.googleapis.com') || 
             url.origin.startsWith('https://api.mapbox.com') ||
             url.origin.startsWith('https://tile.openstreetmap.org')) {
    // Map provider requests
    event.respondWith(handleMapRequest(request));
  } else {
    // External requests
    event.respondWith(handleExternalRequest(request));
  }
});

// Handle application requests with intelligent caching
async function handleAppRequest(request) {
  const url = new URL(request.url);
  
  // Check if this is an API request
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }
  
  // Handle static assets
  try {
    const response = await caches.match(request);
    if (response) {
      return response;
    }
    
    // Network fallback for static assets
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, serving offline fallback');
    return caches.match('/offline.html');
  }
}

// Handle API requests with different strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Find matching cache rule
  let cacheRule = null;
  for (const [pattern, rule] of Object.entries(API_CACHE_RULES)) {
    if (url.pathname.startsWith(pattern)) {
      cacheRule = rule;
      break;
    }
  }
  
  // Default cache rule for unmatched APIs
  if (!cacheRule) {
    cacheRule = {
      strategy: 'network-first',
      maxAge: 10 * 60 * 1000, // 10 minutes
      maxEntries: 50
    };
  }
  
  switch (cacheRule.strategy) {
    case 'cache-first':
      return handleCacheFirst(request, cacheRule);
    case 'network-first':
      return handleNetworkFirst(request, cacheRule);
    case 'network-only':
      return handleNetworkOnly(request);
    default:
      return handleNetworkFirst(request, cacheRule);
  }
}

// Cache-first strategy: try cache first, then network
async function handleCacheFirst(request, rule) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is still valid
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      const now = Date.now();
      
      if (!cacheTime || (now - parseInt(cacheTime)) < rule.maxAge) {
        return cachedResponse;
      }
    }
    
    // Fetch from network and update cache
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE_NAME);
      const responseClone = networkResponse.clone();
      
      // Add cache timestamp
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
      await cleanupCache(cache, rule.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy: try network first, then cache
async function handleNetworkFirst(request, rule) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE_NAME);
      const responseClone = networkResponse.clone();
      
      // Add cache timestamp
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
      await cleanupCache(cache, rule.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-only strategy: always try network first
async function handleNetworkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Handle map requests with special caching
async function handleMapRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('', { status: 503 });
  }
}

// Handle external requests
async function handleExternalRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('', { status: 503 });
  }
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_QUEUE) {
    event.waitUntil(processBackgroundSync());
  }
});

// Process background sync queue
async function processBackgroundSync() {
  try {
    const queue = await getBackgroundSyncQueue();
    
    for (const item of queue) {
      try {
        await processSyncItem(item);
        await removeFromBackgroundSyncQueue(item.id);
      } catch (error) {
        console.error('[SW] Failed to sync item:', item.id, error);
        
        // Retry logic
        if (item.retryCount < 3) {
          item.retryCount++;
          item.nextRetry = Date.now() + (item.retryCount * 60000); // Exponential backoff
          await updateBackgroundSyncQueueItem(item);
        } else {
          // Max retries exceeded, remove from queue
          await removeFromBackgroundSyncQueue(item.id);
          
          // Notify user of failure
          self.registration.showNotification('Sync Failed', {
            body: `Failed to sync ${item.type}. Please check your connection.`,
            icon: '/icons/icon-192x192.png',
            tag: 'sync-failure'
          });
        }
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Process individual sync items
async function processSyncItem(item) {
  switch (item.type) {
    case 'document-upload':
      return await uploadDocument(item.data);
    case 'map-tile-request':
      return await cacheMapTile(item.data);
    case 'notification-read':
      return await markNotificationRead(item.data);
    case 'data-update':
      return await updateData(item.data);
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
}

// Upload document
async function uploadDocument(data) {
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Document upload failed');
  }
  
  return response.json();
}

// Cache map tile
async function cacheMapTile(data) {
  const response = await fetch(data.url);
  if (!response.ok) {
    throw new Error('Map tile fetch failed');
  }
  
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  cache.put(data.url, response);
  
  return { success: true };
}

// Mark notification as read
async function markNotificationRead(data) {
  const response = await fetch(`/api/notifications/${data.id}/read`, {
    method: 'PUT'
  });
  
  if (!response.ok) {
    throw new Error('Notification update failed');
  }
  
  return response.json();
}

// Update data
async function updateData(data) {
  const response = await fetch(data.url, {
    method: data.method || 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data.payload)
  });
  
  if (!response.ok) {
    throw new Error('Data update failed');
  }
  
  return response.json();
}

// Background sync queue management
async function getBackgroundSyncQueue() {
  const cache = await caches.open(DATA_CACHE_NAME);
  const response = await cache.match('/background-sync-queue');
  
  if (!response) {
    return [];
  }
  
  const data = await response.json();
  return data.queue || [];
}

async function updateBackgroundSyncQueue(queue) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const response = new Response(JSON.stringify({ queue }), {
    headers: { 'Content-Type': 'application/json' }
  });
  cache.put('/background-sync-queue', response);
}

async function addToBackgroundSyncQueue(item) {
  const queue = await getBackgroundSyncQueue();
  item.id = Date.now().toString();
  item.retryCount = 0;
  item.createdAt = Date.now();
  item.nextRetry = Date.now();
  
  queue.push(item);
  await updateBackgroundSyncQueue(queue);
  
  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.sync.register(BACKGROUND_SYNC_QUEUE);
    });
  }
}

async function removeFromBackgroundSyncQueue(id) {
  const queue = await getBackgroundSyncQueue();
  const updatedQueue = queue.filter(item => item.id !== id);
  await updateBackgroundSyncQueue(updatedQueue);
}

async function updateBackgroundSyncQueueItem(item) {
  const queue = await getBackgroundSyncQueue();
  const index = queue.findIndex(q => q.id === item.id);
  if (index !== -1) {
    queue[index] = item;
    await updateBackgroundSyncQueue(queue);
  }
}

// Cache cleanup utility
async function cleanupCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const deleteCount = keys.length - maxEntries;
    const keysToDelete = keys.slice(0, deleteCount);
    
    for (const key of keysToDelete) {
      await cache.delete(key);
    }
  }
}

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let payload = { title: 'MDRRMO Pio Duran', body: 'New notification' };
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload.body = event.data.text();
    }
  }
  
  const options = {
    body: payload.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.tag || 'default',
    data: payload.data || {},
    actions: payload.actions || [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'ADD_TO_SYNC_QUEUE':
      addToBackgroundSyncQueue(data);
      break;
    case 'GET_SYNC_STATUS':
      getBackgroundSyncQueue().then(queue => {
        event.ports[0].postMessage({
          pending: queue.length,
          hasPending: queue.length > 0
        });
      });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Utility function to clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}
