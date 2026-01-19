import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MAP_PROVIDERS, getProviderById, getFreeProviders } from '../config/mapProviders';

// Create context for map provider management
const MapProviderContext = createContext(null);

// Provider for the context
export const useMapProvider = () => {
  const context = useContext(MapProviderContext);
  if (!context) {
    throw new Error('useMapProvider must be used within a MapProviderManager');
  }
  return context;
};

// Main component for managing map providers
const MapProviderManager = ({ children, defaultProvider = 'openstreetmap' }) => {
  const [activeProvider, setActiveProvider] = useState(() => {
    const saved = localStorage.getItem('activeMapProvider');
    return saved && MAP_PROVIDERS[saved] ? saved : defaultProvider;
  });

  const [offlineMode, setOfflineMode] = useState(() => {
    const saved = localStorage.getItem('offlineMode');
    return saved === 'true';
  });

  const [cacheSize, setCacheSize] = useState(() => {
    const saved = localStorage.getItem('mapCacheSize');
    return saved ? parseInt(saved, 10) : 100 * 1024 * 1024; // 100 MB default
  });

  const [preloadEnabled, setPreloadEnabled] = useState(() => {
    const saved = localStorage.getItem('preloadEnabled');
    return saved !== 'false'; // Default to true
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('activeMapProvider', activeProvider);
  }, [activeProvider]);

  useEffect(() => {
    localStorage.setItem('offlineMode', offlineMode.toString());
  }, [offlineMode]);

  useEffect(() => {
    localStorage.setItem('mapCacheSize', cacheSize.toString());
  }, [cacheSize]);

  useEffect(() => {
    localStorage.setItem('preloadEnabled', preloadEnabled.toString());
  }, [preloadEnabled]);

  // Get current provider config
  const currentProviderConfig = getProviderById(activeProvider);

  // Get available providers (filtered by API key availability for premium providers)
  const availableProviders = React.useMemo(() => {
    return Object.values(MAP_PROVIDERS).filter(provider => {
      if (provider.isFree) return true;
      // For premium providers, check if API key is available
      if (provider.requiresApiKey) {
        return !!provider.apiKeyEnv && process.env[provider.apiKeyEnv];
      }
      return true;
    });
  }, []);

  // Switch provider
  const switchProvider = useCallback((providerId) => {
    if (MAP_PROVIDERS[providerId]) {
      setActiveProvider(providerId);
    }
  }, []);

  // Toggle offline mode
  const toggleOfflineMode = useCallback(() => {
    setOfflineMode(prev => !prev);
  }, []);

  // Set cache size
  const updateCacheSize = useCallback((size) => {
    setCacheSize(size);
  }, []);

  // Toggle preload
  const togglePreload = useCallback(() => {
    setPreloadEnabled(prev => !prev);
  }, []);

  // Value object for context
  const value = {
    // State
    activeProvider,
    offlineMode,
    cacheSize,
    preloadEnabled,
    
    // Computed
    currentProviderConfig,
    availableProviders,
    freeProviders: getFreeProviders(),
    
    // Actions
    switchProvider,
    toggleOfflineMode,
    updateCacheSize,
    togglePreload,
  };

  return (
    <MapProviderContext.Provider value={value}>
      {children}
    </MapProviderContext.Provider>
  );
};

// Hook to get tile URL with provider-specific processing
export const useTileUrl = (providerId) => {
  const { currentProviderConfig } = useMapProvider();
  
  const getTileUrl = React.useCallback((z, x, y) => {
    const provider = providerId ? getProviderById(providerId) : currentProviderConfig;
    
    if (!provider) return null;
    
    let url = provider.url;
    
    // Replace placeholders
    url = url.replace('{z}', z);
    url = url.replace('{x}', x);
    url = url.replace('{y}', y);
    
    // Handle subdomains
    if (provider.subdomains && provider.subdomains.length > 0) {
      const subdomain = provider.subdomains[Math.floor(Math.random() * provider.subdomains.length)];
      url = url.replace('{s}', subdomain);
    }
    
    // Handle API key placeholders
    if (provider.requiresApiKey && provider.apiKeyEnv) {
      const apiKey = process.env[provider.apiKeyEnv];
      if (apiKey) {
        url = url.replace('{accessToken}', apiKey);
      }
    }
    
    return url;
  }, [providerId, currentProviderConfig]);

  return getTileUrl;
};

// Hook to check if provider is available
export const useProviderAvailability = (providerId) => {
  const { availableProviders } = useMapProvider();
  
  return React.useMemo(() => {
    return availableProviders.some(p => p.id === providerId);
  }, [providerId, availableProviders]);
};

// Provider selector dropdown component
export const ProviderSelector = ({ className = '' }) => {
  const { activeProvider, currentProviderConfig, availableProviders, switchProvider } = useMapProvider();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">Map Provider:</label>
      <select
        value={activeProvider}
        onChange={(e) => switchProvider(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {availableProviders.map(provider => (
          <option key={provider.id} value={provider.id}>
            {provider.name} {provider.isFree ? '(Free)' : ''}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        {currentProviderConfig.attribution?.replace(/<[^>]*>/g, '').slice(0, 50)}...
      </span>
    </div>
  );
};

export default MapProviderManager;
