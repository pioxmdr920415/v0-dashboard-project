// Tile Cache Service for offline map tiles
// Uses IndexedDB to store map tiles

const DB_NAME = 'MapTileCache';
const DB_VERSION = 1;
const STORE_NAME = 'tiles';
const METADATA_STORE = 'metadata';

let dbInstance = null;

// Default cache settings
const DEFAULT_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_ZOOM = 14;
const MIN_ZOOM = 1;
const MAX_ZOOM = 18;

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open MapTileCache IndexedDB'));
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create tiles store with compound index for efficient lookups
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const tileStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        tileStore.createIndex('provider', 'provider', { unique: false });
        tileStore.createIndex('zoom', 'zoom', { unique: false });
        tileStore.createIndex('provider_zoom', ['provider', 'zoom'], { unique: false });
        tileStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
};

// Generate unique tile ID
const generateTileId = (provider, z, x, y) => {
  return `${provider}_${z}_${x}_${y}`;
};

// Get tile from cache
export const getTile = async (provider, z, x, y) => {
  try {
    const db = await openDB();
    const id = generateTileId(provider, z, x, y);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          // Update last accessed time
          const tile = { ...request.result, lastAccessed: new Date().toISOString() };
          const updateTx = db.transaction([STORE_NAME], 'readwrite');
          updateTx.objectStore(STORE_NAME).put(tile);
          resolve(tile.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting tile from cache:', error);
    return null;
  }
};

// Save tile to cache
export const saveTile = async (provider, z, x, y, blob) => {
  try {
    const db = await openDB();
    const id = generateTileId(provider, z, x, y);

    const tile = {
      id,
      provider,
      z,
      x,
      y,
      blob,
      timestamp: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(tile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch (error) {
    console.error('Error saving tile to cache:', error);
    return false;
  }
};

// Save multiple tiles in batch
export const saveTiles = async (tiles) => {
  try {
    const db = await openDB();

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const tile of tiles) {
      const id = generateTileId(tile.provider, tile.z, tile.x, tile.y);
      store.put({
        id,
        provider: tile.provider,
        z: tile.z,
        x: tile.x,
        y: tile.y,
        blob: tile.blob,
        timestamp: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving tiles batch:', error);
    return false;
  }
};

// Check if tile exists in cache
export const hasTile = async (provider, z, x, y) => {
  try {
    const db = await openDB();
    const id = generateTileId(provider, z, x, y);

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    return false;
  }
};

// Get cache statistics
export const getCacheStats = async () => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readonly');
      const tileStore = transaction.objectStore(STORE_NAME);
      const metaStore = transaction.objectStore(METADATA_STORE);

      let tileCount = 0;
      let totalSize = 0;
      const providerStats = {};

      const tilesRequest = tileStore.openCursor();
      tilesRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const tile = cursor.value;
          tileCount++;
          const size = tile.blob?.size || 0;
          totalSize += size;

          if (!providerStats[tile.provider]) {
            providerStats[tile.provider] = { count: 0, size: 0 };
          }
          providerStats[tile.provider].count++;
          providerStats[tile.provider].size += size;

          cursor.continue();
        } else {
          // Get max cache size from metadata
          const maxSizeRequest = metaStore.get('maxCacheSize');
          maxSizeRequest.onsuccess = () => {
            resolve({
              tileCount,
              totalSize,
              maxSize: maxSizeRequest.result?.value || DEFAULT_CACHE_SIZE,
              providerStats,
            });
          };
        }
      };

      tilesRequest.onerror = () => reject(tilesRequest.error);
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      tileCount: 0,
      totalSize: 0,
      maxSize: DEFAULT_CACHE_SIZE,
      providerStats: {},
    };
  }
};

// Set max cache size
export const setMaxCacheSize = async (size) => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put({ key: 'maxCacheSize', value: size });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error setting max cache size:', error);
    return false;
  }
};

// Clear cache for a specific provider
export const clearProviderCache = async (provider) => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('provider');
      const request = index.openCursor(IDBKeyRange.only(provider));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing provider cache:', error);
    return false;
  }
};

// Clear all cache
export const clearAllCache = async () => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
};

// Get tiles in bounds for a provider and zoom level
export const getTilesInBounds = async (provider, z, bounds) => {
  try {
    const [minLat, minLng, maxLat, maxLng] = bounds;
    
    // Calculate tile coordinates
    const minX = Math.floor((minLng + 180) / 360 * Math.pow(2, z));
    const maxX = Math.floor((maxLng + 180) / 360 * Math.pow(2, z));
    const minY = Math.floor((1 - Math.log(Math.tan(Math.PI / 4 + maxLat * Math.PI / 360)) / Math.PI) / 2 * Math.pow(2, z));
    const maxY = Math.floor((1 - Math.log(Math.tan(Math.PI / 4 + minLat * Math.PI / 360)) / Math.PI) / 2 * Math.pow(2, z));

    const tiles = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ provider, z, x, y });
      }
    }

    return tiles;
  } catch (error) {
    console.error('Error calculating tiles in bounds:', error);
    return [];
  }
};

// Enforce cache size limit by removing oldest tiles
export const enforceCacheLimit = async () => {
  try {
    const stats = await getCacheStats();
    if (stats.totalSize <= stats.maxSize) return true;

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('lastAccessed');
      const request = index.openCursor();

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && stats.totalSize > stats.maxSize) {
          const tile = cursor.value;
          stats.totalSize -= tile.blob?.size || 0;
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve({ success: true, deletedCount });
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error enforcing cache limit:', error);
    return false;
  }
};

// Get frequently accessed tiles for preloading
export const getFrequentlyAccessedTiles = async (provider, limit = 50) => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('provider');
      const request = index.openCursor(IDBKeyRange.only(provider));

      const tiles = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && tiles.length < limit) {
          const tile = cursor.value;
          tiles.push({
            provider: tile.provider,
            z: tile.z,
            x: tile.x,
            y: tile.y,
            accessCount: tile.accessCount || 1,
          });
          cursor.continue();
        } else {
          // Sort by access count descending
          tiles.sort((a, b) => b.accessCount - a.accessCount);
          resolve(tiles);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting frequently accessed tiles:', error);
    return [];
  }
};

// Increment access count for a tile
export const incrementTileAccessCount = async (provider, z, x, y) => {
  try {
    const db = await openDB();
    const id = generateTileId(provider, z, x, y);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          const tile = request.result;
          tile.accessCount = (tile.accessCount || 0) + 1;
          tile.lastAccessed = new Date().toISOString();
          store.put(tile);
        }
        resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error incrementing tile access count:', error);
    return false;
  }
};

export const DEFAULT_CACHE_SIZE_CONFIG = DEFAULT_CACHE_SIZE;
export const DEFAULT_MAX_ZOOM_CONFIG = DEFAULT_MAX_ZOOM;
