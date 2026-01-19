import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, WifiOff, WifiIcon, 
  RefreshCw, Settings, 
  CheckCircle, AlertTriangle, 
  Clock, Download, Upload
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, completed, error
  const [pendingOperations, setPendingOperations] = useState(0);
  const { toast } = useToast();
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Monitor online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You are now online. Syncing pending operations...",
        duration: 3000,
      });
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "You are now offline. Some features may be limited.",
        variant: "destructive",
        duration: 5000,
      });
    };

    // Monitor connection type changes
    const handleConnectionChange = () => {
      updateConnectionType();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connection', handleConnectionChange);

    // Start periodic connection checks
    startPeriodicChecks();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connection', handleConnectionChange);
      stopPeriodicChecks();
    };
  }, [toast]);

  const updateConnectionType = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType);
    }
  };

  const checkConnection = async () => {
    setIsChecking(true);
    setLastCheck(new Date());
    
    try {
      // Try to fetch a small resource to test connection
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setIsOnline(true);
        updateConnectionType();
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const triggerSync = async () => {
    if (!isOnline) return;
    
    setSyncStatus('syncing');
    
    try {
      // Check for pending operations in service worker
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        // Send message to service worker to check sync status
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          const { pending, hasPending } = event.data;
          setPendingOperations(pending);
          
          if (hasPending) {
            // Trigger background sync
            registration.sync.register('background-sync-queue');
          }
        };
        
        registration.active.postMessage({
          type: 'GET_SYNC_STATUS'
        }, [messageChannel.port2]);
      }
      
      setSyncStatus('completed');
      
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);
    }
  };

  const startPeriodicChecks = () => {
    stopPeriodicChecks();
    checkIntervalRef.current = setInterval(checkConnection, 30000); // Check every 30 seconds
  };

  const stopPeriodicChecks = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  const getConnectionStatus = () => {
    if (isChecking) {
      return {
        status: 'checking',
        color: 'yellow',
        icon: RefreshCw,
        text: 'Checking connection...'
      };
    }
    
    if (!isOnline) {
      return {
        status: 'offline',
        color: 'red',
        icon: WifiOff,
        text: 'Offline'
      };
    }
    
    if (syncStatus === 'syncing') {
      return {
        status: 'syncing',
        color: 'blue',
        icon: RefreshCw,
        text: 'Syncing data...'
      };
    }
    
    if (syncStatus === 'completed') {
      return {
        status: 'synced',
        color: 'green',
        icon: CheckCircle,
        text: 'Sync completed'
      };
    }
    
    return {
      status: 'online',
      color: 'green',
      icon: Wifi,
      text: 'Online'
    };
  };

  const getStatusColor = (color) => {
    const colors = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      blue: 'bg-blue-500'
    };
    return colors[color] || colors.green;
  };

  const status = getConnectionStatus();

  return (
    <div className="fixed top-16 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border p-3 min-w-64">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(status.color)}`} />
            <span className="font-medium text-sm">{status.text}</span>
            {isChecking && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}</span>
          </div>
        </div>

        {/* Connection Details */}
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>Connection Status:</span>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          
          {connectionType && (
            <div className="flex items-center justify-between">
              <span>Connection Type:</span>
              <Badge variant="secondary" className="capitalize">
                {connectionType}
              </Badge>
            </div>
          )}
          
          {pendingOperations > 0 && (
            <div className="flex items-center justify-between">
              <span>Pending Operations:</span>
              <Badge variant="outline">
                <Download className="w-3 h-3 mr-1" />
                {pendingOperations}
              </Badge>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={isChecking}
            className="flex-1 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            Check
          </Button>
          
          {isOnline && pendingOperations > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={triggerSync}
              className="flex-1 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Sync Now
            </Button>
          )}
          
          {!isOnline && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-medium">Limited Functionality</span>
            </div>
            <p>You are currently offline. Some features may not be available.</p>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus === 'syncing' && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Synchronizing data with server...</span>
            </div>
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Sync failed. Please check your connection.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
