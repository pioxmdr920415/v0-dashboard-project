import React, { useState, useEffect } from 'react';
import { useMapProvider } from './MapProviderManager';
import { getCacheStats, clearAllCache, clearProviderCache, setMaxCacheSize, DEFAULT_CACHE_SIZE_CONFIG } from '../services/tileCacheService';
import { Settings, Database, Trash2, Download, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const MapSettingsPanel = ({ isOpen, onClose }) => {
  const { 
    activeProvider, 
    currentProviderConfig,
    offlineMode, 
    cacheSize, 
    preloadEnabled,
    switchProvider,
    toggleOfflineMode,
    updateCacheSize,
    togglePreload,
    availableProviders 
  } = useMapProvider();

  const [cacheStats, setCacheStats] = useState({ tileCount: 0, totalSize: 0, maxSize: DEFAULT_CACHE_SIZE_CONFIG });
  const [isClearing, setIsClearing] = useState(false);
  const [localCacheSize, setLocalCacheSize] = useState(cacheSize);

  useEffect(() => {
    if (isOpen) {
      loadCacheStats();
    }
  }, [isOpen]);

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
    setLocalCacheSize(stats.maxSize);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllCache();
      await loadCacheStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCacheSizeChange = async (e) => {
    const newSize = parseInt(e.target.value, 10);
    setLocalCacheSize(newSize);
  };

  const handleApplyCacheSize = async () => {
    await updateCacheSize(localCacheSize);
    await setMaxCacheSize(localCacheSize);
    await loadCacheStats();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900">Map Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-gray-500 text-xl">&times;</span>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Map Provider
            </label>
            <select
              value={activeProvider}
              onChange={(e) => switchProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {availableProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} {provider.isFree ? '(Free)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {currentProviderConfig.attribution?.replace(/<[^>]*>/g, '')}
            </p>
          </div>

          {/* Offline Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {offlineMode ? (
                <CloudOff className="w-5 h-5 text-orange-500" />
              ) : (
                <Cloud className="w-5 h-5 text-teal-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Offline Mode</p>
                <p className="text-xs text-gray-500">
                  Use cached tiles when offline
                </p>
              </div>
            </div>
            <button
              onClick={toggleOfflineMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                offlineMode ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  offlineMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preload Tiles Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Preload Tiles</p>
                <p className="text-xs text-gray-500">
                  Automatically cache nearby tiles
                </p>
              </div>
            </div>
            <button
              onClick={togglePreload}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preloadEnabled ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preloadEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Cache Size Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Max Cache Size
              </label>
              <span className="text-sm text-gray-500">{formatBytes(localCacheSize)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={localCacheSize / (1024 * 1024)}
              onChange={handleCacheSizeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10 MB</span>
              <span>500 MB</span>
            </div>
            <button
              onClick={handleApplyCacheSize}
              disabled={localCacheSize === cacheSize}
              className="mt-2 w-full px-3 py-1.5 text-sm text-teal-600 border border-teal-500 rounded-md hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Cache Size
            </button>
          </div>

          {/* Cache Statistics */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Cache Usage</span>
              <RefreshCw 
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                onClick={loadCacheStats}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tiles cached:</span>
                <span className="text-gray-900">{cacheStats.tileCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Used space:</span>
                <span className="text-gray-900">{formatBytes(cacheStats.totalSize)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Available:</span>
                <span className="text-gray-900">{formatBytes(cacheStats.maxSize - cacheStats.totalSize)}</span>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((cacheStats.totalSize / cacheStats.maxSize) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Clear Cache Button */}
          <button
            onClick={handleClearCache}
            disabled={isClearing || cacheStats.tileCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-500 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Clearing...' : 'Clear All Cache'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSettingsPanel;
