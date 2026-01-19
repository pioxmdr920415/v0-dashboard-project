import { useEffect, useRef, useCallback } from 'react';
import { useMapProvider } from '../components/MapProviderManager';
import { 
  getTile, 
  saveTile, 
  hasTile, 
  getTilesInBounds, 
  enforceCacheLimit 
} from '../services/tileCacheService';
import { getProviderById } from '../config/mapProviders';

// Custom hook for tile preloading
export const useTilePreloading = (map, providerId, enabled = true) => {
  const { preloadEnabled, offlineMode } = useMapProvider();
  const preloadQueueRef = useRef([]);
  const isPreloadingRef = useRef(false);
  const lastBoundsRef = useRef(null);
  const lastZoomRef = useRef(null);

  // Generate tile URL
  const getTileUrl = useCallback((provider, z, x, y) => {
    const providerConfig = getProviderById(provider);
    if (!providerConfig) return null;

    let url = providerConfig.url;
    url = url.replace('{z}', z);
    url = url.replace('{x}', x);
    url = url.replace('{y}', y);

    if (providerConfig.subdomains && providerConfig.subdomains.length > 0) {
      const subdomain = providerConfig.subdomains[Math.floor(Math.random() * providerConfig.subdomains.length)];
      url = url.replace('{s}', subdomain);
    }

    if (providerConfig.requiresApiKey && providerConfig.apiKeyEnv) {
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (apiKey) {
        url = url.replace('{accessToken}', apiKey);
      }
    }

    return url;
  }, []);

  // Preload a single tile
  const preloadTile = useCallback(async (provider, z, x, y) => {
    if (!enabled || !preloadEnabled) return;

    // Check if tile is already cached
    const cached = await hasTile(provider, z, x, y);
    if (cached) return;

    const url = getTileUrl(provider, z, x, y);
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const blob = await response.blob();
      await saveTile(provider, z, x, y, blob);
      
      // Enforce cache limit
      await enforceCacheLimit();
    } catch (error) {
      // Silently fail for preloading
    }
  }, [enabled, preloadEnabled, getTileUrl]);

  // Preload tiles in bounds
  const preloadTilesInBounds = useCallback(async (bounds, zoom) => {
    if (!enabled || !preloadEnabled || !zoom) return;

    const provider = providerId;
    const maxZoom = 16; // Preload up to zoom 16
    const minZoom = Math.max(zoom - 2, 1);

    for (let z = minZoom; z <= Math.min(zoom + 1, maxZoom); z++) {
      const tiles = await getTilesInBounds(provider, z, bounds);
      
      for (const tile of tiles) {
        preloadQueueRef.current.push(tile);
      }
    }
  }, [enabled, preloadEnabled, providerId]);

  // Process preload queue
  const processQueue = useCallback(async () => {
    if (isPreloadingRef.current || preloadQueueRef.current.length === 0) return;

    isPreloadingRef.current = true;
    const queue = [...preloadQueueRef.current];
    preloadQueueRef.current = [];

    // Process up to 10 tiles at a time
    const batch = queue.slice(0, 10);
    
    await Promise.all(
      batch.map(tile => preloadTile(tile.provider, tile.z, tile.x, tile.y))
    );

    isPreloadingRef.current = false;

    // Continue processing if more tiles
    if (preloadQueueRef.current.length > 0) {
      setTimeout(processQueue, 100);
    }
  }, [preloadTile]);

  // Handle map move/zoom events
  useEffect(() => {
    if (!map || !enabled) return;

    const handleMoveEnd = async () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      const boundsArray = [
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
      ];

      // Only preload if bounds or zoom changed significantly
      const boundsChanged = !lastBoundsRef.current || 
        Math.abs(lastBoundsRef.current[0] - boundsArray[0]) > 0.01 ||
        Math.abs(lastBoundsRef.current[2] - boundsArray[2]) > 0.01;
      
      const zoomChanged = lastZoomRef.current !== zoom;

      if (boundsChanged || zoomChanged) {
        lastBoundsRef.current = boundsArray;
        lastZoomRef.current = zoom;
        await preloadTilesInBounds(boundsArray, zoom);
        processQueue();
      }
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, enabled, preloadTilesInBounds, processQueue]);

  // Get tile from cache or fetch
  const getTileWithCache = useCallback(async (z, x, y) => {
    const provider = providerId;

    // Try cache first
    const cached = await getTile(provider, z, x, y);
    if (cached) {
      return URL.createObjectURL(cached);
    }

    // If offline mode, return null
    if (offlineMode) {
      return null;
    }

    // Fetch and cache
    const url = getTileUrl(provider, z, x, y);
    if (!url) return null;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();
      await saveTile(provider, z, x, y, blob);
      await enforceCacheLimit();

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching tile:', error);
      return null;
    }
  }, [providerId, offlineMode, getTileUrl]);

  // Preload specific area (for programmatic preloading)
  const preloadArea = useCallback(async (center, radius, minZoom = 10, maxZoom = 16) => {
    if (!enabled || !preloadEnabled) return;

    const [lat, lng] = center;
    const bounds = [
      lat - radius,
      lng - radius,
      lat + radius,
      lng + radius
    ];

    for (let z = minZoom; z <= maxZoom; z++) {
      const tiles = await getTilesInBounds(providerId, z, bounds);
      for (const tile of tiles) {
        preloadQueueRef.current.push(tile);
      }
    }

    processQueue();
  }, [enabled, preloadEnabled, providerId, processQueue]);

  return {
    getTileWithCache,
    preloadArea,
    preloadTile,
  };
};

export default useTilePreloading;
