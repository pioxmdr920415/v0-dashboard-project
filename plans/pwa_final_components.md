# PWA Final Components and Implementation Guide

## 9. Push Notification Service

### File: `/frontend/src/services/NotificationService.js`

\`\`\`javascript
// Push Notification Service
class NotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = null;
    this.subscription = null;
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  }

  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    this.permission = await this.getPermission();
    
    if (this.permission === 'granted') {
      await this.subscribeToPush();
    }

    return this.permission === 'granted';
  }

  async getPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  async subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  async unsubscribeFromPush() {
    if (!this.subscription) return false;

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer(this.subscription);
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return false;
    }
  }

  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions = {
        body: options.body || '',
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        tag: options.tag || 'mdrrmo-notification',
        data: options.data || {},
        actions: options.actions || [
          {
            action: 'open',
            title: 'Open App',
            icon: '/icons/icon-192x192.png'
          }
        ],
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        vibrate: options.vibrate || [200, 100, 200]
      };

      await registration.showNotification(title, notificationOptions);
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  async getNotificationPermission() {
    return Notification.permission;
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    if (permission === 'granted') {
      await this.subscribeToPush();
    }

    return permission;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Emergency notification methods
  async sendEmergencyNotification(message, priority = 'high') {
    const options = {
      body: message,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/icon-72x72.png',
      tag: 'emergency',
      requireInteraction: true,
      silent: priority === 'low' ? false : true,
      vibrate: [500, 200, 500, 200, 500],
      actions: [
        {
          action: 'acknowledge',
          title: 'Acknowledge',
          icon: '/icons/check-icon.png'
        },
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };

    return await this.showNotification('🚨 Emergency Alert', options);
  }

  async sendDataSyncNotification(count) {
    const options = {
      body: `${count} data operations completed successfully`,
      icon: '/icons/sync-icon.png',
      tag: 'sync-complete',
      actions: [
        {
          action: 'view',
          title: 'View Changes',
          icon: '/icons/view-icon.png'
        }
      ]
    };

    return await this.showNotification('Sync Complete', options);
  }

  async sendOfflineNotification() {
    const options = {
      body: 'You are now working offline. Changes will sync when connection is restored.',
      icon: '/icons/offline-icon.png',
      tag: 'offline-mode',
      requireInteraction: false,
      silent: true
    };

    return await this.showNotification('Working Offline', options);
  }
}

// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;
\`\`\`

## 10. Offline Context Provider

### File: `/frontend/src/context/OfflineContext.js`

\`\`\`javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineDataManager } from '../services/OfflineDataManager';
import { notificationService } from '../services/NotificationService';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState(null);
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    failed: 0,
    total: 0,
    syncInProgress: false
  });
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  // Initialize offline data management
  useEffect(() => {
    offlineDataManager.initialize();
    checkNotificationPermission();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      
      // Notify user when back online
      if (notificationPermission === 'granted') {
        notificationService.showNotification('Back Online', {
          body: 'Connection restored. Syncing data...',
          icon: '/icons/online-icon.png',
          tag: 'connection-restored'
        });
      }
      
      // Trigger sync when online
      offlineDataManager.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      
      // Notify user when offline
      if (notificationPermission === 'granted') {
        notificationService.sendOfflineNotification();
      }
    };

    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setConnectionType(connection.effectiveType);
      }
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
  }, [notificationPermission]);

  // Update queue status periodically
  useEffect(() => {
    const updateQueueStatus = () => {
      const status = offlineDataManager.getQueueStatus();
      setQueueStatus(status);
    };

    updateQueueStatus();
    const interval = setInterval(updateQueueStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestNotificationPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return null;
    }
  };

  const queueOperation = useCallback(async (operation) => {
    const operationId = await offlineDataManager.queueOperation(operation);
    
    // Update queue status immediately
    const status = offlineDataManager.getQueueStatus();
    setQueueStatus(status);
    
    return operationId;
  }, []);

  const processQueue = useCallback(async () => {
    await offlineDataManager.processQueue();
    const status = offlineDataManager.getQueueStatus();
    setQueueStatus(status);
  }, []);

  const clearFailedOperations = useCallback(async () => {
    await offlineDataManager.clearFailedOperations();
    const status = offlineDataManager.getQueueStatus();
    setQueueStatus(status);
  }, []);

  const retryFailedOperations = useCallback(async () => {
    await offlineDataManager.retryFailedOperations();
    const status = offlineDataManager.getQueueStatus();
    setQueueStatus(status);
  }, []);

  const getConnectionStatus = () => {
    if (!isOnline) return 'offline';
    if (connectionType === 'slow-2g' || connectionType === '2g') return 'poor';
    if (connectionType === '3g') return 'fair';
    if (connectionType === '4g') return 'good';
    return 'excellent';
  };

  const value = {
    // Connection status
    isOnline,
    connectionType,
    connectionStatus: getConnectionStatus(),
    showOfflineBanner,
    setShowOfflineBanner,
    
    // Queue management
    queueStatus,
    queueOperation,
    processQueue,
    clearFailedOperations,
    retryFailedOperations,
    
    // Notifications
    notificationPermission,
    requestNotificationPermission,
    showNotification: notificationService.showNotification,
    sendEmergencyNotification: notificationService.sendEmergencyNotification,
    sendDataSyncNotification: notificationService.sendDataSyncNotification,
    
    // Utilities
    getConnectionIcon: () => {
      const status = getConnectionStatus();
      switch (status) {
        case 'offline': return '📡';
        case 'poor': return '📶';
        case 'fair': return '📶';
        case 'good': return '📶';
        case 'excellent': return '📶';
        default: return '📡';
      }
    }
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
\`\`\`

## 11. Integration with Main App

### File: `/frontend/src/App.js` (Updated)

\`\`\`javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationContextProvider } from './context/NotificationContext';
import { OfflineProvider } from './context/OfflineContext';
import { AppProvider } from './context/AppContext';
import Dashboard from './components/Dashboard';
import MapsViewer from './components/MapsViewer';
import PWAManager from './components/PWAManager';
import OfflineIndicator from './components/OfflineIndicator';
import OfflineBanner from './components/OfflineBanner';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NotificationContextProvider>
          <OfflineProvider>
            <Router>
              <div className="App">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/maps" element={<MapsViewer />} />
                  {/* Add other routes as needed */}
                </Routes>
                
                {/* PWA Installation Manager */}
                <PWAManager />
                
                {/* Offline Status Indicator */}
                <OfflineIndicator />
                
                {/* Offline Banner (when offline) */}
                <OfflineBanner />
                
                {/* Toast Notifications */}
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      style: {
                        background: '#009688',
                      },
                    },
                    error: {
                      duration: 5000,
                      style: {
                        background: '#dc3545',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </OfflineProvider>
        </NotificationContextProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
\`\`\`

## 12. Offline Banner Component

### File: `/frontend/src/components/OfflineBanner.js`

\`\`\`javascript
import React from 'react';
import { useOffline } from '../context/OfflineContext';
import { WifiOff, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';

const OfflineBanner = () => {
  const { isOnline, showOfflineBanner, setShowOfflineBanner, connectionStatus, processQueue } = useOffline();

  if (isOnline || !showOfflineBanner) {
    return null;
  }

  const handleRetrySync = () => {
    setShowOfflineBanner(false);
    // Will automatically show again when offline operations are attempted
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-1 rounded-full">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">You are offline</div>
              <div className="text-sm opacity-90">
                Some features may not be available. Changes will sync when connection is restored.
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm bg-red-600 px-2 py-1 rounded text-xs">
              {connectionStatus}
            </span>
            <button
              onClick={handleRetrySync}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowOfflineBanner(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
\`\`\`

## 13. Implementation Guide and Checklist

### Phase 1: Foundation Setup (Priority: High)

1. **Create PWA Manifest**
   - [ ] Create `/frontend/public/manifest.json`
   - [ ] Generate PWA icons (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
   - [ ] Create screenshots for manifest
   - [ ] Add manifest link to `index.html`

2. **Enhanced Service Worker**
   - [ ] Create `/frontend/public/service-worker-v2.js`
   - [ ] Update service worker registration in main app
   - [ ] Create offline fallback page (`/frontend/public/offline.html`)

3. **Update App Configuration**
   - [ ] Add PWA meta tags to `index.html`
   - [ ] Update build configuration for PWA assets

### Phase 2: Core Offline Functionality (Priority: High)

1. **Offline Data Management**
   - [ ] Implement `/frontend/src/services/OfflineDataManager.js`
   - [ ] Update existing IndexedDB utilities for offline operations
   - [ ] Add conflict resolution logic

2. **Connection Status Management**
   - [ ] Implement `/frontend/src/hooks/useOfflineStatus.js`
   - [ ] Create `/frontend/src/context/OfflineContext.js`
   - [ ] Add offline status indicators

3. **Background Sync**
   - [ ] Implement `/frontend/src/hooks/useBackgroundSync.js`
   - [ ] Add sync queue management
   - [ ] Integrate with existing API calls

### Phase 3: User Experience (Priority: Medium)

1. **PWA Installation**
   - [ ] Implement `/frontend/src/components/PWAManager.js`
   - [ ] Add installation prompts
   - [ ] Create installation guidance

2. **Offline Indicators**
   - [ ] Implement `/frontend/src/components/OfflineIndicator.js`
   - [ ] Create `/frontend/src/components/OfflineBanner.js`
   - [ ] Add connection status visualizations

3. **Push Notifications**
   - [ ] Implement `/frontend/src/services/NotificationService.js`
   - [ ] Add notification permissions handling
   - [ ] Create emergency notification system

### Phase 4: Integration and Testing (Priority: Medium)

1. **App Integration**
   - [ ] Update `/frontend/src/App.js` with new providers
   - [ ] Integrate offline hooks into existing components
   - [ ] Add offline handling to map components

2. **Testing and Optimization**
   - [ ] Test offline functionality across scenarios
   - [ ] Test PWA installation on different platforms
   - [ ] Optimize cache strategies
   - [ ] Performance testing

### Phase 5: Polish and Deployment (Priority: Low)

1. **Documentation**
   - [ ] Create user documentation for offline features
   - [ ] Create developer documentation
   - [ ] Add help tooltips

2. **Deployment**
   - [ ] Configure HTTPS for production
   - [ ] Update deployment scripts
   - [ ] Monitor PWA metrics

## Testing Scenarios

### Offline Testing
1. **Complete Offline Mode**
   - Disable network connection
   - Verify app loads from cache
   - Test offline data operations
   - Test reconnection behavior

2. **Poor Connection**
   - Simulate slow network
   - Test fallback strategies
   - Verify timeout handling

3. **Intermittent Connection**
   - Test connection drops during operations
   - Verify queue management
   - Test conflict resolution

### PWA Testing
1. **Installation**
   - Test installation on different browsers
   - Verify desktop shortcuts
   - Test app launch behavior

2. **Push Notifications**
   - Test notification permissions
   - Verify emergency notifications
   - Test notification actions

3. **Background Sync**
   - Test sync when offline
   - Verify sync when online
   - Test conflict resolution

## Success Metrics

1. **Installation Rate**: Target 30% of users install PWA
2. **Offline Usage**: Target 50% of sessions use offline features
3. **Sync Success Rate**: Target 95% sync success rate
4. **User Satisfaction**: Target 4.5/5 rating for offline experience
5. **Performance**: Target <3s offline page load time

This comprehensive implementation guide provides a complete roadmap for implementing advanced PWA features that will enable desktop installation and robust offline functionality for the MDRRMO Pio Duran application.
