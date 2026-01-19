# PWA Components Implementation Specifications

## 4. Offline Data Management System

### File: `/frontend/src/services/OfflineDataManager.js`

\`\`\`javascript
// Offline Data Management Service
import { saveSheetToIndexedDB, getSheetFromIndexedDB } from '../utils/indexedDB';
import { saveDriveFolderToIndexedDB, getDriveFolderFromIndexedDB } from '../utils/indexedDB';
import { saveMetadataToIndexedDB, getMetadataFromIndexedDB } from '../utils/indexedDB';

class OfflineDataManager {
  constructor() {
    this.operationQueue = [];
    this.syncInProgress = false;
    this.maxQueueSize = 1000;
    this.conflictResolutionStrategy = 'server_wins'; // 'client_wins', 'merge', 'manual'
  }

  // Initialize offline data management
  async initialize() {
    try {
      // Load operation queue from IndexedDB
      const queue = await getMetadataFromIndexedDB('operation_queue');
      if (queue) {
        this.operationQueue = queue.value || [];
      }
      
      // Set up background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-data');
        });
      }
    } catch (error) {
      console.error('Failed to initialize offline data manager:', error);
    }
  }

  // Queue an operation for offline execution
  async queueOperation(operation) {
    const operationData = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type: operation.type,
      data: operation.data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    // Add to local queue
    this.operationQueue.push(operationData);
    
    // Keep queue size manageable
    if (this.operationQueue.length > this.maxQueueSize) {
      this.operationQueue = this.operationQueue.slice(-this.maxQueueSize);
    }

    // Save to IndexedDB
    await saveMetadataToIndexedDB('operation_queue', this.operationQueue);

    // Try immediate sync if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return operationData.id;
  }

  // Process queued operations
  async processQueue() {
    if (this.syncInProgress || this.operationQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      const operations = [...this.operationQueue];
      
      for (const operation of operations) {
        try {
          await this.executeOperation(operation);
          // Remove from queue on success
          this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
        } catch (error) {
          console.error('Operation failed:', operation.id, error);
          operation.retryCount++;
          operation.status = 'failed';
          
          if (operation.retryCount >= 3) {
            // Remove after 3 failed attempts
            this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
          }
        }
      }

      // Save updated queue
      await saveMetadataToIndexedDB('operation_queue', this.operationQueue);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Execute a single operation
  async executeOperation(operation) {
    switch (operation.type) {
      case 'UPDATE_SHEET':
        return this.executeSheetUpdate(operation);
      case 'UPDATE_DRIVE_FOLDER':
        return this.executeDriveFolderUpdate(operation);
      case 'CREATE_DOCUMENT':
        return this.executeDocumentCreate(operation);
      case 'UPDATE_DOCUMENT':
        return this.executeDocumentUpdate(operation);
      case 'DELETE_DOCUMENT':
        return this.executeDocumentDelete(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Execute sheet update operation
  async executeSheetUpdate(operation) {
    const { sheetName, data, timestamp } = operation.data;
    
    try {
      // Check for conflicts
      const serverData = await this.fetchSheetFromServer(sheetName);
      const localData = await getSheetFromIndexedDB(sheetName);
      
      const conflict = this.detectConflict(localData, serverData, timestamp);
      
      if (conflict) {
        await this.resolveConflict('sheet', sheetName, localData, serverData, operation);
      }

      // Update server
      const response = await fetch(`/api/sheets/${sheetName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server update failed: ${response.status}`);
      }

      // Update local cache
      await saveSheetToIndexedDB(sheetName, data);
      
      return { success: true, operationId: operation.id };
    } catch (error) {
      throw new Error(`Sheet update failed: ${error.message}`);
    }
  }

  // Execute drive folder update operation
  async executeDriveFolderUpdate(operation) {
    const { folderId, data, timestamp } = operation.data;
    
    try {
      // Check for conflicts
      const serverData = await this.fetchDriveFolderFromServer(folderId);
      const localData = await getDriveFolderFromIndexedDB(folderId);
      
      const conflict = this.detectConflict(localData, serverData, timestamp);
      
      if (conflict) {
        await this.resolveConflict('drive_folder', folderId, localData, serverData, operation);
      }

      // Update server
      const response = await fetch(`/api/drive/folder/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server update failed: ${response.status}`);
      }

      // Update local cache
      await saveDriveFolderToIndexedDB(folderId, data);
      
      return { success: true, operationId: operation.id };
    } catch (error) {
      throw new Error(`Drive folder update failed: ${error.message}`);
    }
  }

  // Execute document operations
  async executeDocumentCreate(operation) {
    const { documentData } = operation.data;
    
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });

      if (!response.ok) {
        throw new Error(`Document creation failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Update local cache if needed
      // (Implementation depends on document storage strategy)
      
      return { success: true, operationId: operation.id, documentId: result.id };
    } catch (error) {
      throw new Error(`Document creation failed: ${error.message}`);
    }
  }

  async executeDocumentUpdate(operation) {
    const { documentId, updates } = operation.data;
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Document update failed: ${response.status}`);
      }

      return { success: true, operationId: operation.id };
    } catch (error) {
      throw new Error(`Document update failed: ${error.message}`);
    }
  }

  async executeDocumentDelete(operation) {
    const { documentId } = operation.data;
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Document deletion failed: ${response.status}`);
      }

      return { success: true, operationId: operation.id };
    } catch (error) {
      throw new Error(`Document deletion failed: ${error.message}`);
    }
  }

  // Conflict detection
  detectConflict(localData, serverData, localTimestamp) {
    if (!serverData || !serverData.timestamp) {
      return false; // No server data, no conflict
    }

    if (!localData || !localData.timestamp) {
      return false; // No local data, no conflict
    }

    const serverTime = new Date(serverData.timestamp).getTime();
    const localTime = new Date(localTimestamp).getTime();

    return localTime > serverTime;
  }

  // Conflict resolution
  async resolveConflict(type, identifier, localData, serverData, operation) {
    switch (this.conflictResolutionStrategy) {
      case 'server_wins':
        // Keep server data, discard local changes
        if (type === 'sheet') {
          await saveSheetToIndexedDB(identifier, serverData.data);
        } else if (type === 'drive_folder') {
          await saveDriveFolderToIndexedDB(identifier, serverData.data);
        }
        break;

      case 'client_wins':
        // Keep local data, overwrite server
        if (type === 'sheet') {
          await saveSheetToIndexedDB(identifier, localData.data);
        } else if (type === 'drive_folder') {
          await saveDriveFolderToIndexedDB(identifier, localData.data);
        }
        break;

      case 'merge':
        // Attempt to merge changes (implementation depends on data structure)
        const mergedData = this.mergeData(localData.data, serverData.data);
        if (type === 'sheet') {
          await saveSheetToIndexedDB(identifier, mergedData);
        } else if (type === 'drive_folder') {
          await saveDriveFolderToIndexedDB(identifier, mergedData);
        }
        break;

      case 'manual':
        // Queue for manual resolution
        await this.queueManualResolution(type, identifier, localData, serverData, operation);
        break;
    }
  }

  // Data merging (simplified implementation)
  mergeData(localData, serverData) {
    // This is a simplified merge - real implementation would be more sophisticated
    if (Array.isArray(localData) && Array.isArray(serverData)) {
      // For arrays, combine unique items
      const combined = [...localData, ...serverData];
      return [...new Map(combined.map(item => [item.id || JSON.stringify(item), item])).values()];
    } else if (typeof localData === 'object' && typeof serverData === 'object') {
      // For objects, merge properties
      return { ...serverData, ...localData };
    }
    
    return localData; // Default to local data
  }

  // Queue manual resolution
  async queueManualResolution(type, identifier, localData, serverData, operation) {
    const resolutionQueue = await getMetadataFromIndexedDB('resolution_queue') || { value: [] };
    resolutionQueue.value.push({
      type,
      identifier,
      localData,
      serverData,
      operation,
      timestamp: new Date().toISOString()
    });
    await saveMetadataToIndexedDB('resolution_queue', resolutionQueue);
  }

  // Fetch data from server
  async fetchSheetFromServer(sheetName) {
    try {
      const response = await fetch(`/api/sheets/${sheetName}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch sheet from server:', error);
      return null;
    }
  }

  async fetchDriveFolderFromServer(folderId) {
    try {
      const response = await fetch(`/api/drive/folder/${folderId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch drive folder from server:', error);
      return null;
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      pending: this.operationQueue.filter(op => op.status === 'pending').length,
      failed: this.operationQueue.filter(op => op.status === 'failed').length,
      total: this.operationQueue.length,
      syncInProgress: this.syncInProgress
    };
  }

  // Clear failed operations
  async clearFailedOperations() {
    this.operationQueue = this.operationQueue.filter(op => op.status !== 'failed');
    await saveMetadataToIndexedDB('operation_queue', this.operationQueue);
  }

  // Retry failed operations
  async retryFailedOperations() {
    const failedOps = this.operationQueue.filter(op => op.status === 'failed');
    for (const op of failedOps) {
      op.status = 'pending';
      op.retryCount = 0;
    }
    await saveMetadataToIndexedDB('operation_queue', this.operationQueue);
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }
}

// Singleton instance
export const offlineDataManager = new OfflineDataManager();
export default offlineDataManager;
\`\`\`

## 5. Connection Status Management

### File: `/frontend/src/hooks/useOfflineStatus.js`

\`\`\`javascript
import { useState, useEffect, useCallback } from 'react';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState(null);
  const [connectionType, setConnectionType] = useState(null);
  const [connectionSpeed, setConnectionSpeed] = useState(null);

  const updateConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType);
      setConnectionSpeed(connection.downlink);
    }
  }, []);

  useEffect(() => {
    // Initial connection info
    updateConnectionInfo();

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      // Trigger background sync when coming online
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-data');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic connection check
    const interval = setInterval(() => {
      if (!isOnline && navigator.onLine) {
        handleOnline();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
      
      clearInterval(interval);
    };
  }, [isOnline, updateConnectionInfo]);

  const getConnectionStatus = () => {
    if (!isOnline) return 'offline';
    if (connectionType === 'slow-2g' || connectionType === '2g') return 'poor';
    if (connectionType === '3g') return 'fair';
    if (connectionType === '4g') return 'good';
    return 'excellent';
  };

  const getConnectionIcon = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'offline': return '📡';
      case 'poor': return '📶';
      case 'fair': return '📶';
      case 'good': return '📶';
      case 'excellent': return '📶';
      default: return '📡';
    }
  };

  return {
    isOnline,
    lastOnlineTime,
    connectionType,
    connectionSpeed,
    connectionStatus: getConnectionStatus(),
    connectionIcon: getConnectionIcon(),
    updateConnectionInfo
  };
};
\`\`\`

## 6. PWA Installation Manager

### File: `/frontend/src/components/PWAManager.js`

\`\`\`javascript
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Download, Smartphone, Globe, Wifi, WifiOff } from 'lucide-react';

const PWAManager = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const installPromptRef = useRef(null);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setInstallPrompt(e);
      installPromptRef.current = e;
      
      // Show custom install prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setInstallPrompt(null);
      installPromptRef.current = null;
      
      toast.success('MDRRMO Dashboard installed successfully!', {
        duration: 5000,
        action: {
          label: 'Great!',
          onClick: () => toast.dismiss()
        }
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    checkInstallation();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      const result = await installPrompt.prompt();
      
      if (result.outcome === 'accepted') {
        toast.success('Installation started...', {
          duration: 3000
        });
      } else {
        toast.info('Installation cancelled', {
          duration: 3000
        });
      }

      setShowInstallPrompt(false);
      setInstallPrompt(null);
      installPromptRef.current = null;
    } catch (error) {
      console.error('Installation failed:', error);
      toast.error('Installation failed. Please try again.', {
        duration: 5000
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't clear installPrompt so user can try again later
  };

  const handleSkip = () => {
    setShowInstallPrompt(false);
    setInstallPrompt(null);
    installPromptRef.current = null;
    
    // Store preference to not show again
    localStorage.setItem('pwa-install-skip', 'true');
  };

  // Don't show if user has skipped or app is installed
  if (isInstalled || localStorage.getItem('pwa-install-skip') || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start gap-3">
        <div className="bg-teal-100 p-2 rounded-full">
          <Download className="w-5 h-5 text-teal-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install MDRRMO Dashboard
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Get the full experience with offline access, push notifications, and desktop integration.
          </p>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              Works on mobile
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Works offline
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-teal-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install App
                </>
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
          
          <button
            onClick={handleSkip}
            className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAManager;
\`\`\`

## 7. Offline Indicator Component

### File: `/frontend/src/components/OfflineIndicator.js`

\`\`\`javascript
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, WifiIcon, Signal, RefreshCw, AlertTriangle } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setConnectionType(connection.effectiveType);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      setIsChecking(false);
      
      // Auto-hide after 3 seconds when back online
      setTimeout(() => {
        setShowDetails(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowDetails(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateConnectionInfo);
    }

    updateConnectionInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  const getConnectionStatus = () => {
    if (!isOnline) return { status: 'offline', color: 'red', icon: WifiOff };
    if (connectionType === 'slow-2g' || connectionType === '2g') return { status: 'poor', color: 'orange', icon: Wifi };
    if (connectionType === '3g') return { status: 'fair', color: 'yellow', icon: Wifi };
    if (connectionType === '4g') return { status: 'good', color: 'green', icon: Wifi };
    return { status: 'excellent', color: 'blue', icon: Wifi };
  };

  const status = getConnectionStatus();

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      setIsOnline(response.ok);
      if (response.ok) {
        setLastOnlineTime(new Date());
      }
    } catch (error) {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isOnline && status.status === 'excellent') {
    return null; // Don't show indicator when connection is excellent
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isOnline ? 'opacity-75 hover:opacity-100' : 'opacity-100'
    }`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
        {/* Main Indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full bg-${status.color}-100`}>
              <status.icon className={`w-4 h-4 text-${status.color}-600`} />
            </div>
            <div>
              <div className="font-medium text-sm">
                {isOnline ? 'Connection Status' : 'You are Offline'}
              </div>
              <div className={`text-xs ${
                isOnline ? 'text-gray-500' : `text-${status.color}-600`
              }`}>
                {isOnline ? status.status : 'Limited functionality available'}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Signal className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isOnline && (
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Check Connection
                </>
              )}
            </button>
          )}
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors border border-gray-200 rounded-md"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${
                  isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {connectionType && (
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-medium capitalize">{connectionType}</span>
                </div>
              )}
              
              {lastOnlineTime && (
                <div className="flex justify-between">
                  <span>Last Online:</span>
                  <span className="font-medium">
                    {lastOnlineTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {!isOnline && (
                <div className="flex items-center gap-2 text-orange-600 mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">Some features may not work offline</span>
                </div>
              )}
            </div>
            
            {!isOnline && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Offline Features:</strong> Maps, cached data, and local documents are still available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
\`\`\`

## 8. Background Sync Hook

### File: `/frontend/src/hooks/useBackgroundSync.js`

\`\`\`javascript
import { useState, useEffect, useCallback } from 'react';
import { offlineDataManager } from '../services/OfflineDataManager';

export const useBackgroundSync = () => {
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    failedOperations: 0
  });

  const [showSyncIndicator, setShowSyncIndicator] = useState(false);

  const updateSyncStatus = useCallback(async () => {
    const queueStatus = offlineDataManager.getQueueStatus();
    
    setSyncStatus(prev => ({
      ...prev,
      pendingOperations: queueStatus.pending,
      failedOperations: queueStatus.failed,
      isSyncing: queueStatus.syncInProgress
    }));
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await offlineDataManager.processQueue();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date()
      }));
      
      setShowSyncIndicator(true);
      setTimeout(() => setShowSyncIndicator(false), 3000);
    } catch (error) {
      console.error('Background sync failed:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  const clearFailedOperations = useCallback(async () => {
    await offlineDataManager.clearFailedOperations();
    await updateSyncStatus();
  }, [updateSyncStatus]);

  const retryFailedOperations = useCallback(async () => {
    await offlineDataManager.retryFailedOperations();
    await updateSyncStatus();
  }, [updateSyncStatus]);

  useEffect(() => {
    // Initial status update
    updateSyncStatus();

    // Listen for online events to trigger sync
    const handleOnline = () => {
      setTimeout(triggerSync, 1000); // Small delay to ensure connection is stable
    };

    window.addEventListener('online', handleOnline);

    // Periodic status updates
    const interval = setInterval(updateSyncStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [updateSyncStatus, triggerSync]);

  // Auto-sync when coming online
  useEffect(() => {
    if (navigator.onLine && syncStatus.pendingOperations > 0) {
      triggerSync();
    }
  }, [navigator.onLine, syncStatus.pendingOperations, triggerSync]);

  return {
    ...syncStatus,
    showSyncIndicator,
    triggerSync,
    clearFailedOperations,
    retryFailedOperations,
    updateSyncStatus
  };
};
\`\`\`

This comprehensive specification provides detailed implementations for all the core PWA components needed to enable advanced offline functionality and desktop installation capabilities. Each component is designed to work together to create a seamless offline-first experience for the MDRRMO Pio Duran application.
