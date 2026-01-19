import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncAllData } from '../utils/api';
import {
  saveSheetToIndexedDB,
  getSheetFromIndexedDB,
  saveDriveFolderToIndexedDB,
  getDriveFolderFromIndexedDB,
  saveMetadataToIndexedDB,
  getMetadataFromIndexedDB,
} from '../utils/indexedDB';
import { dataValidationService } from '../services/DataValidationService';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [toast, setToast] = useState(null);
  const [validationResults, setValidationResults] = useState(new Map());
  const [dataQualityMetrics, setDataQualityMetrics] = useState(new Map());

  // Load last sync time from IndexedDB
  useEffect(() => {
    const loadLastSyncTime = async () => {
      const metadata = await getMetadataFromIndexedDB('lastSyncTime');
      if (metadata) {
        setLastSyncTime(metadata.value);
      }
    };
    loadLastSyncTime();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connection restored. Syncing data...', 'success');
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Using cached data.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync when coming online with validation
  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Sync is now handled directly via Google APIs in components
      // This just updates the sync time
      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      await saveMetadataToIndexedDB('lastSyncTime', syncTime);
      
      showToast('Ready to sync data!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Sync error:', error);
      showToast('Failed to prepare sync', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Validate synced data
  const validateSyncedData = useCallback(async (syncResult) => {
    if (!syncResult) return;

    try {
      // Validate Google Sheets data
      if (syncResult.sheets) {
        for (const [sheetName, data] of Object.entries(syncResult.sheets)) {
          await validateCachedSheetData(sheetName, data);
        }
      }

      // Validate Google Drive data
      if (syncResult.drive) {
        for (const [folderId, data] of Object.entries(syncResult.drive)) {
          await validateCachedDriveData(folderId, data);
        }
      }
    } catch (error) {
      console.error('Validation error during sync:', error);
      showToast('Data validation failed during sync', 'warning');
    }
  }, []);

  // Validate cached sheet data
  const validateCachedSheetData = useCallback(async (sheetName, data) => {
    try {
      const schemaId = `sheet_${sheetName}`;
      const validationResult = dataValidationService.validate(schemaId, data);
      
      // Store validation result
      setValidationResults(prev => {
        const newResults = new Map(prev);
        newResults.set(`${schemaId}_${Date.now()}`, validationResult);
        return newResults;
      });

      // Update quality metrics
      const metrics = dataValidationService.getQualityMetrics(schemaId);
      setDataQualityMetrics(prev => {
        const newMetrics = new Map(prev);
        newMetrics.set(schemaId, metrics);
        return newMetrics;
      });

      // Show validation summary
      if (validationResult.status !== 'valid') {
        const errorCount = validationResult.errors.length;
        const warningCount = validationResult.warnings.length;
        showToast(
          `Sheet '${sheetName}' validation: ${errorCount} errors, ${warningCount} warnings`,
          validationResult.status === 'invalid' ? 'error' : 'warning'
        );
      }
    } catch (error) {
      console.error(`Validation error for sheet ${sheetName}:`, error);
    }
  }, []);

  // Validate cached drive data
  const validateCachedDriveData = useCallback(async (folderId, data) => {
    try {
      const schemaId = `drive_${folderId}`;
      const validationResult = dataValidationService.validate(schemaId, data);
      
      // Store validation result
      setValidationResults(prev => {
        const newResults = new Map(prev);
        newResults.set(`${schemaId}_${Date.now()}`, validationResult);
        return newResults;
      });

      // Update quality metrics
      const metrics = dataValidationService.getQualityMetrics(schemaId);
      setDataQualityMetrics(prev => {
        const newMetrics = new Map(prev);
        newMetrics.set(schemaId, metrics);
        return newMetrics;
      });

      // Show validation summary
      if (validationResult.status !== 'valid') {
        const errorCount = validationResult.errors.length;
        const warningCount = validationResult.warnings.length;
        showToast(
          `Drive folder '${folderId}' validation: ${errorCount} errors, ${warningCount} warnings`,
          validationResult.status === 'invalid' ? 'error' : 'warning'
        );
      }
    } catch (error) {
      console.error(`Validation error for drive folder ${folderId}:`, error);
    }
  }, []);

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Cache data helpers with validation
  const cacheSheetData = useCallback(async (sheetName, data) => {
    await saveSheetToIndexedDB(sheetName, data);
    // Validate cached data
    await validateCachedSheetData(sheetName, data);
  }, [validateCachedSheetData]);

  const getCachedSheetData = useCallback(async (sheetName) => {
    const data = await getSheetFromIndexedDB(sheetName);
    if (data) {
      // Validate retrieved data
      await validateCachedSheetData(sheetName, data);
    }
    return data;
  }, [validateCachedSheetData]);

  const cacheDriveFolderData = useCallback(async (folderId, data) => {
    await saveDriveFolderToIndexedDB(folderId, data);
    // Validate cached data
    await validateCachedDriveData(folderId, data);
  }, [validateCachedDriveData]);

  const getCachedDriveFolderData = useCallback(async (folderId) => {
    const data = await getDriveFolderFromIndexedDB(folderId);
    if (data) {
      // Validate retrieved data
      await validateCachedDriveData(folderId, data);
    }
    return data;
  }, [validateCachedDriveData]);

  // Validation management
  const registerValidationSchema = useCallback((schemaId, schema) => {
    dataValidationService.registerSchema(schemaId, schema);
  }, []);

  const getValidationResults = useCallback((schemaId) => {
    return Array.from(validationResults.values()).filter(result => result.schemaId === schemaId);
  }, [validationResults]);

  const getQualityMetrics = useCallback((schemaId) => {
    return dataQualityMetrics.get(schemaId) || dataValidationService.getQualityMetrics(schemaId);
  }, [dataQualityMetrics]);

  const clearValidationResults = useCallback((schemaId) => {
    dataValidationService.clearResults(schemaId);
    setValidationResults(prev => {
      const newResults = new Map(prev);
      for (const [key, result] of newResults.entries()) {
        if (result.schemaId === schemaId) {
          newResults.delete(key);
        }
      }
      return newResults;
    });
  }, []);

  const value = {
    isOnline,
    isSyncing,
    lastSyncTime,
    toast,
    showToast,
    handleSync,
    cacheSheetData,
    getCachedSheetData,
    cacheDriveFolderData,
    getCachedDriveFolderData,
    // Validation management
    registerValidationSchema,
    getValidationResults,
    getQualityMetrics,
    clearValidationResults,
    validationResults,
    dataQualityMetrics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
