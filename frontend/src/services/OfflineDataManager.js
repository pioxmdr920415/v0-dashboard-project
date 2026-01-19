import { showToast } from '../utils/api';

class OfflineDataManager {
  constructor() {
    this.dbName = 'mdrrmo-offline-v1';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    
    this.init();
    this.setupEventListeners();
  }

  async init() {
    try {
      this.db = await this.openDatabase();
      await this.createTables();
      console.log('[OfflineDataManager] Initialized successfully');
    } catch (error) {
      console.error('[OfflineDataManager] Initialization failed:', error);
    }
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createTables(db);
      };
    });
  }

  createTables(db = this.db) {
    if (!db.objectStoreNames.contains('documents')) {
      const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
      documentsStore.createIndex('name', 'name', { unique: false });
      documentsStore.createIndex('type', 'type', { unique: false });
      documentsStore.createIndex('createdAt', 'createdAt', { unique: false });
      documentsStore.createIndex('modifiedAt', 'modifiedAt', { unique: false });
    }

    if (!db.objectStoreNames.contains('maps')) {
      const mapsStore = db.createObjectStore('maps', { keyPath: 'id' });
      mapsStore.createIndex('coordinates', 'coordinates', { unique: false });
      mapsStore.createIndex('zoom', 'zoom', { unique: false });
      mapsStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    if (!db.objectStoreNames.contains('notifications')) {
      const notificationsStore = db.createObjectStore('notifications', { keyPath: 'id' });
      notificationsStore.createIndex('read', 'read', { unique: false });
      notificationsStore.createIndex('timestamp', 'timestamp', { unique: false });
      notificationsStore.createIndex('priority', 'priority', { unique: false });
    }

    if (!db.objectStoreNames.contains('settings')) {
      const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
    }

    if (!db.objectStoreNames.contains('sync_queue')) {
      const syncQueueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      syncQueueStore.createIndex('type', 'type', { unique: false });
      syncQueueStore.createIndex('priority', 'priority', { unique: false });
      syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    if (!db.objectStoreNames.contains('cache')) {
      const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
      cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      cacheStore.createIndex('createdAt', 'createdAt', { unique: false });
    }
  }

  // Documents Management
  async saveDocument(document) {
    try {
      const tx = this.db.transaction(['documents'], 'readwrite');
      const store = tx.objectStore('documents');
      
      const doc = {
        ...document,
        id: document.id || Date.now().toString(),
        offline: true,
        modifiedAt: new Date().toISOString()
      };

      await store.put(doc);
      await tx.complete;
      
      showToast('Document saved offline', 'success');
      return doc;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to save document:', error);
      throw error;
    }
  }

  async getDocument(id) {
    try {
      const tx = this.db.transaction(['documents'], 'readonly');
      const store = tx.objectStore('documents');
      return await store.get(id);
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get document:', error);
      throw error;
    }
  }

  async getDocuments(filter = {}) {
    try {
      const tx = this.db.transaction(['documents'], 'readonly');
      const store = tx.objectStore('documents');
      const index = store.index(filter.index || 'modifiedAt');
      
      const range = filter.range || null;
      const direction = filter.direction || 'prev';
      
      const request = index.openCursor(range, direction);
      const results = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get documents:', error);
      throw error;
    }
  }

  async deleteDocument(id) {
    try {
      const tx = this.db.transaction(['documents'], 'readwrite');
      const store = tx.objectStore('documents');
      await store.delete(id);
      await tx.complete;
      return true;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to delete document:', error);
      throw error;
    }
  }

  // Maps Management
  async saveMapData(mapData) {
    try {
      const tx = this.db.transaction(['maps'], 'readwrite');
      const store = tx.objectStore('maps');
      
      const map = {
        ...mapData,
        id: mapData.id || Date.now().toString(),
        timestamp: new Date().toISOString()
      };

      await store.put(map);
      await tx.complete;
      return map;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to save map data:', error);
      throw error;
    }
  }

  async getMapData(id) {
    try {
      const tx = this.db.transaction(['maps'], 'readonly');
      const store = tx.objectStore('maps');
      return await store.get(id);
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get map data:', error);
      throw error;
    }
  }

  // Notifications Management
  async saveNotification(notification) {
    try {
      const tx = this.db.transaction(['notifications'], 'readwrite');
      const store = tx.objectStore('notifications');
      
      const notif = {
        ...notification,
        id: notification.id || Date.now().toString(),
        read: notification.read || false,
        timestamp: notification.timestamp || new Date().toISOString()
      };

      await store.put(notif);
      await tx.complete;
      return notif;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to save notification:', error);
      throw error;
    }
  }

  async getNotifications(filter = {}) {
    try {
      const tx = this.db.transaction(['notifications'], 'readonly');
      const store = tx.objectStore('notifications');
      const index = store.index(filter.index || 'timestamp');
      
      const range = filter.range || null;
      const direction = filter.direction || 'prev';
      
      const request = index.openCursor(range, direction);
      const results = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get notifications:', error);
      throw error;
    }
  }

  async markNotificationRead(id) {
    try {
      const tx = this.db.transaction(['notifications'], 'readwrite');
      const store = tx.objectStore('notifications');
      const notification = await store.get(id);
      
      if (notification) {
        notification.read = true;
        await store.put(notification);
        await tx.complete;
      }
      
      return notification;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Settings Management
  async saveSetting(key, value) {
    try {
      const tx = this.db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      
      await store.put({ key, value, updatedAt: new Date().toISOString() });
      await tx.complete;
      return value;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to save setting:', error);
      throw error;
    }
  }

  async getSetting(key) {
    try {
      const tx = this.db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const result = await store.get(key);
      return result ? result.value : null;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get setting:', error);
      throw error;
    }
  }

  // Cache Management
  async setCache(key, value, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const tx = this.db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      
      await store.put({
        key,
        value,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl).toISOString()
      });
      await tx.complete;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to set cache:', error);
      throw error;
    }
  }

  async getCache(key) {
    try {
      const tx = this.db.transaction(['cache'], 'readonly');
      const store = tx.objectStore('cache');
      const item = await store.get(key);
      
      if (item) {
        const now = new Date();
        const expiresAt = new Date(item.expiresAt);
        
        if (now < expiresAt) {
          return item.value;
        } else {
          // Remove expired item
          await this.deleteCache(key);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get cache:', error);
      throw error;
    }
  }

  async deleteCache(key) {
    try {
      const tx = this.db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      await store.delete(key);
      await tx.complete;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to delete cache:', error);
      throw error;
    }
  }

  // Sync Queue Management
  async addToSyncQueue(operation) {
    try {
      const tx = this.db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      
      const queueItem = {
        ...operation,
        type: operation.type,
        priority: operation.priority || 'normal',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
      };

      await store.add(queueItem);
      await tx.complete;
      
      // If online, try to sync immediately
      if (this.isOnline) {
        this.processOfflineQueue();
      }
      
      return queueItem;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to add to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueue() {
    try {
      const tx = this.db.transaction(['sync_queue'], 'readonly');
      const store = tx.objectStore('sync_queue');
      
      const request = store.openCursor();
      const results = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get sync queue:', error);
      throw error;
    }
  }

  async removeFromSyncQueue(id) {
    try {
      const tx = this.db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      await store.delete(id);
      await tx.complete;
    } catch (error) {
      console.error('[OfflineDataManager] Failed to remove from sync queue:', error);
      throw error;
    }
  }

  async processOfflineQueue() {
    if (!this.isOnline) return;

    try {
      const queue = await this.getSyncQueue();
      
      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await this.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('[OfflineDataManager] Failed to process sync item:', item.id, error);
          
          // Increment retry count
          if (item.retryCount < 3) {
            item.retryCount++;
            item.nextRetry = new Date(Date.now() + (item.retryCount * 60000)).toISOString();
            
            const tx = this.db.transaction(['sync_queue'], 'readwrite');
            const store = tx.objectStore('sync_queue');
            await store.put(item);
            await tx.complete;
          } else {
            // Max retries exceeded, remove from queue
            await this.removeFromSyncQueue(item.id);
            
            // Notify user
            showToast(`Failed to sync ${item.type} after 3 attempts`, 'error');
          }
        }
      }
    } catch (error) {
      console.error('[OfflineDataManager] Failed to process sync queue:', error);
    }
  }

  async processSyncItem(item) {
    switch (item.type) {
      case 'document-upload':
        return await this.uploadDocument(item.data);
      case 'map-tile-request':
        return await this.cacheMapTile(item.data);
      case 'notification-read':
        return await this.markNotificationRead(item.data.id);
      case 'data-update':
        return await this.updateData(item.data);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  async uploadDocument(data) {
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

  async cacheMapTile(data) {
    const response = await fetch(data.url);
    if (!response.ok) {
      throw new Error('Map tile fetch failed');
    }
    
    // Cache the tile in service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active.postMessage({
        type: 'CACHE_MAP_TILE',
        data: { url: data.url, response: response }
      });
    }
    
    return { success: true };
  }

  async updateData(data) {
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

  // Utility Methods
  async clearAllData() {
    try {
      const tx = this.db.transaction([
        'documents', 'maps', 'notifications', 
        'settings', 'sync_queue', 'cache'
      ], 'readwrite');
      
      await Promise.all([
        tx.objectStore('documents').clear(),
        tx.objectStore('maps').clear(),
        tx.objectStore('notifications').clear(),
        tx.objectStore('settings').clear(),
        tx.objectStore('sync_queue').clear(),
        tx.objectStore('cache').clear()
      ]);
      
      await tx.complete;
      showToast('Offline data cleared', 'success');
    } catch (error) {
      console.error('[OfflineDataManager] Failed to clear data:', error);
      throw error;
    }
  }

  async getStorageInfo() {
    try {
      const tx = this.db.transaction([
        'documents', 'maps', 'notifications', 
        'settings', 'sync_queue', 'cache'
      ], 'readonly');
      
      const counts = await Promise.all([
        tx.objectStore('documents').count(),
        tx.objectStore('maps').count(),
        tx.objectStore('notifications').count(),
        tx.objectStore('settings').count(),
        tx.objectStore('sync_queue').count(),
        tx.objectStore('cache').count()
      ]);
      
      return {
        documents: counts[0],
        maps: counts[1],
        notifications: counts[2],
        settings: counts[3],
        syncQueue: counts[4],
        cache: counts[5]
      };
    } catch (error) {
      console.error('[OfflineDataManager] Failed to get storage info:', error);
      throw error;
    }
  }
}

// Create singleton instance
const offlineDataManager = new OfflineDataManager();

export default offlineDataManager;
