import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_SHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID;

// Create axios instance for backend
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Online/Offline detection
export const isOnline = () => {
  return navigator.onLine;
};

// ==================== Google Sheets API (Direct) ====================
const getSheetUrl = (sheetName) => {
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
};

const parseGoogleSheetsResponse = (text) => {
  try {
    // Remove the JavaScript wrapper
    const jsonStr = text.substring(47, text.length - 2);
    const data = JSON.parse(jsonStr);
    
    if (!data.table || !data.table.rows) {
      return [];
    }
    
    const headers = data.table.cols.map(col => col.label || '');
    const rows = [];
    
    for (const row of data.table.rows) {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[headers[i]] = cell ? cell.v : '';
      });
      rows.push(obj);
    }
    
    return rows;
  } catch (error) {
    console.error('Error parsing Google Sheets response:', error);
    return [];
  }
};

export const fetchSheetData = async (sheetName) => {
  try {
    const response = await axios.get(getSheetUrl(sheetName), {
      timeout: 30000,
    });
    
    const data = parseGoogleSheetsResponse(response.data);
    
    // Cache to IndexedDB for offline support (handled by AppContext)
    // No need to cache to backend anymore
    
    return {
      success: true,
      data: data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    // Try cached data from IndexedDB if online fetch fails
    throw error; // Let calling code handle offline fallback
  }
};

export const fetchCachedSheetData = async (sheetName) => {
  // This is now handled by IndexedDB through AppContext
  // Backend cache is optional fallback
  try {
    const response = await apiClient.get(`/cache/sheets/${sheetName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching cached sheet ${sheetName}:`, error);
    throw error;
  }
};

// ==================== Google Drive API (Direct) ====================
export const fetchDriveFolder = async (folderId) => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents&fields=files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,webContentLink,createdTime,modifiedTime,owners,lastModifyingUser,size)&key=${GOOGLE_API_KEY}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
    });
    
    const files = response.data.files || [];
    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    
    const result = {
      folders: folders,
      files: regularFiles,
    };
    
    // Cache to IndexedDB for offline support (handled by AppContext)
    // No need to cache to backend anymore
    
    return {
      success: true,
      data: result,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching Drive folder ${folderId}:`, error);
    // Let calling code handle offline fallback with IndexedDB
    throw error;
  }
};

export const fetchCachedDriveFolder = async (folderId) => {
  // This is now handled by IndexedDB through AppContext
  // Backend cache is optional fallback
  try {
    const response = await apiClient.get(`/cache/drive/folder/${folderId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching cached Drive folder ${folderId}:`, error);
    throw error;
  }
};

// Google Drive File Versions API (still through backend as it requires auth)
export const fetchDriveFileVersions = async (fileId) => {
  try {
    const response = await apiClient.get(`/drive/file/${fileId}/versions`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Drive file versions ${fileId}:`, error);
    throw error;
  }
};

export const restoreDriveFileVersion = async (fileId, versionId) => {
  try {
    const response = await apiClient.post(`/drive/file/${fileId}/versions/${versionId}/restore`);
    return response.data;
  } catch (error) {
    console.error(`Error restoring Drive file version ${fileId}/${versionId}:`, error);
    throw error;
  }
};

// Sync API - No longer syncs from backend, just returns success
// All syncing is now done directly from frontend to Google APIs
export const syncAllData = async () => {
  // This is now a no-op since we sync directly from frontend
  // Return success to maintain compatibility
  return {
    success: true,
    message: 'Sync initiated from frontend',
    timestamp: new Date().toISOString()
  };
};

export const getCacheStatus = async () => {
  try {
    const response = await apiClient.get('/cache/status');
    return response.data;
  } catch (error) {
    console.error('Error getting cache status:', error);
    throw error;
  }
};

export default apiClient;
