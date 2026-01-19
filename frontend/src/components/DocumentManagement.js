import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { fetchDriveFolder, fetchDriveFileVersions, restoreDriveFileVersion } from '../utils/api';
import { useApp } from '../context/AppContext';
import {
  ChevronRight, ChevronDown, Folder, FileText, File,
  Search, X, ExternalLink, Maximize2, Download,
  Filter, Calendar, User, Tag, Clock, History,
  Eye, RotateCcw, AlertTriangle, GitCompare, Check,
  FileDiff, ArrowLeft, ArrowRight, MessageCircle,
  MousePointer2, Users, Music, Video, Archive, Code,
  Book, Map, Box, Table
} from 'lucide-react';
import Header from './Header';
import PhotoSwipeGallery from './PhotoSwipeGallery';
import FilePreview, { detectFileType, getFileIcon } from './FilePreview';
import { preparePhotoSwipeItems, convertToHDUrl, isImageFile, isImageMimeType } from '../utils/imageUtils';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useWebSocket } from '../utils/websocket';
import PresenceIndicator from './PresenceIndicator';
import LiveChatSidebar from './LiveChatSidebar';
import CommentsSystem from './CommentsSystem';
import ChangeTracking from './ChangeTracking';
import UserPresenceSystem from './UserPresenceSystem';

const DOCUMENT_ROOT_FOLDER = '15_xiFeXu_vdIe2CYrjGaRCAho2OqhGvo';

// File type options for filter
const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word Document' },
  { value: 'xlsx', label: 'Excel Spreadsheet' },
  { value: 'pptx', label: 'PowerPoint' },
  { value: 'gdoc', label: 'Google Doc' },
  { value: 'gsheet', label: 'Google Sheet' },
  { value: 'gslide', label: 'Google Slides' },
  { value: 'image', label: 'Images' },
  { value: 'text', label: 'Text/CSV' },
  { value: 'code', label: 'Source Code' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'cad', label: 'CAD Files' },
  { value: 'gis', label: 'GIS/Maps' },
  { value: '3d', label: '3D Models' },
  { value: 'archive', label: 'Archives' },
  { value: 'ebook', label: 'eBooks' },
  { value: 'markdown', label: 'Markdown' },
];

// Helper to get Google Drive export/preview URL based on file type
const getGoogleDriveViewUrl = (file) => {
  const fileId = file.id;
  const mimeType = file.mimeType || '';
  
  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${fileId}/preview`;
  }
  
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

// Check if file can be viewed with Google Drive viewer
const isViewableFile = (file) => {
  const mimeType = file.mimeType || '';
  const viewableMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'text/plain',
    'text/csv',
  ];
  return viewableMimeTypes.includes(mimeType);
};

// Check if file can be previewed with our FilePreview component
const isPreviewableFile = (file) => {
  const { category } = detectFileType(file);
  const previewableCategories = [
    'image', 'audio', 'video', 'code', 'text', 
    'csv', 'markdown', 'archive', '3d', 'gis', 
    'cad', 'ebook'
  ];
  return previewableCategories.includes(category);
};

// Get file URL for preview
const getFilePreviewUrl = (file) => {
  if (file.webContentLink) return file.webContentLink;
  if (file.webViewLink) return file.webViewLink;
  if (file.id) return `https://drive.google.com/uc?export=download&id=${file.id}`;
  return null;
};

// Helper functions for file icons and types
const getFileIconEmoji = (mimeType) => {
  const { category } = detectFileType({ mimeType, name: '' });
  const icons = {
    pdf: '📕',
    document: '📝',
    spreadsheet: '📊',
    presentation: '🌅',
    google: '📄',
    image: '🖼️',
    cad: '📐',
    gis: '🗺️',
    '3d': '🎲',
    audio: '🎵',
    video: '🎬',
    archive: '📦',
    code: '💻',
    markdown: '📋',
    csv: '📈',
    ebook: '📚',
    text: '📃',
  };
  return icons[category] || '📄';
};

const getFileTypeLabel = (mimeType, fileName = '') => {
  const { category, type } = detectFileType({ mimeType, name: fileName });
  const labels = {
    pdf: 'PDF Document',
    document: 'Word Document',
    spreadsheet: 'Excel Spreadsheet',
    presentation: 'PowerPoint Presentation',
    google: 'Google Doc/Sheet/Slides',
    image: 'Image File',
    cad: 'CAD File',
    gis: 'GIS Map File',
    '3d': '3D Model',
    audio: 'Audio File',
    video: 'Video File',
    archive: 'Archive File',
    code: 'Source Code',
    markdown: 'Markdown Document',
    csv: 'CSV Spreadsheet',
    ebook: 'eBook File',
    text: 'Text File',
  };
  return labels[category] || 'File';
};

// Versions Panel Component - Displays version history with timestamps and author info
const VersionsPanel = ({ file, onViewVersion, onDownloadVersion, onRestoreVersion, onCompareVersions }) => {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState(null);
  const { showToast } = useApp();

  useEffect(() => {
    loadVersions();
  }, [file?.id]);

  const loadVersions = async () => {
    if (!file?.id) return;
    setIsLoading(true);
    try {
      const response = await fetchDriveFileVersions(file.id);
      // Mock version data for demonstration - in production, use actual API response
      const mockVersions = [
        {
          id: 'v3',
          versionNumber: 3,
          modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          lastModifyingUser: { displayName: 'John Doe', photoLink: null },
          size: file.size || '1.2 MB',
          mimeType: file.mimeType,
          keepForever: false,
          isCurrent: true,
        },
        {
          id: 'v2',
          versionNumber: 2,
          modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          lastModifyingUser: { displayName: 'Jane Smith', photoLink: null },
          size: '1.1 MB',
          mimeType: file.mimeType,
          keepForever: false,
          isCurrent: false,
        },
        {
          id: 'v1',
          versionNumber: 1,
          modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          lastModifyingUser: { displayName: 'John Doe', photoLink: null },
          size: '980 KB',
          mimeType: file.mimeType,
          keepForever: true,
          isCurrent: false,
        },
      ];
      setVersions(mockVersions);
    } catch (error) {
      console.error('Failed to load versions:', error);
      showToast('Failed to load version history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVersion = (versionId) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length < 2) {
        return [...prev, versionId];
      }
      return [prev[1], versionId];
    });
  };

  const handleViewVersion = (version) => {
    onViewVersion(version);
  };

  const handleDownloadVersion = (version) => {
    onDownloadVersion(version);
  };

  const handleRestoreClick = (version) => {
    setVersionToRestore(version);
    setShowRestoreDialog(true);
  };

  const handleRestoreConfirm = async () => {
    if (versionToRestore) {
      await onRestoreVersion(versionToRestore);
      setShowRestoreDialog(false);
      setVersionToRestore(null);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompareVersions(selectedVersions);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading versions...</p>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <History className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Version History</h3>
        <p className="text-gray-600 text-center">
          This file doesn't have any previous versions available.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compare toolbar */}
      {selectedVersions.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-amber-800">
            {selectedVersions.length} version(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedVersions([])}
              className="text-amber-700 border-amber-300"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleCompare}
              disabled={selectedVersions.length !== 2}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
          </div>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`bg-white border-2 rounded-lg p-4 transition-all ${
                selectedVersions.includes(version.id)
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedVersions.includes(version.id)}
                  onChange={() => handleSelectVersion(version.id)}
                  className="mt-1 w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFileIconEmoji(version.mimeType || file.mimeType)}</span>
                      <span className="font-semibold text-gray-900">
                        Version {version.versionNumber}
                      </span>
                      {version.isCurrent && (
                        <Badge className="bg-green-500 text-white text-xs">Current</Badge>
                      )}
                      {version.keepForever && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1 text-green-500" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{version.size}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(version.modifiedTime), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {version.lastModifyingUser?.displayName || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewVersion(version)}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadVersion(version)}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    {!version.isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreClick(version)}
                        className="text-xs text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restore confirmation dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore version {versionToRestore?.versionNumber}? 
              This will create a new version with the content from that version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Conflict View Component - Shows comparison between two versions
const ConflictView = ({ file, versions, onClose, onResolve }) => {
  const [diffView, setDiffView] = useState('side-by-side');
  
  const version1 = versions[0];
  const version2 = versions[1];

  // Mock diff data - in production, this would come from actual document comparison
  const mockDiffData = {
    additions: 15,
    deletions: 8,
    modifications: 5,
    changes: [
      { type: 'addition', line: 10, content: 'New section added here', author: 'John Doe', timestamp: '2 hours ago' },
      { type: 'deletion', line: 15, content: 'Old content removed', author: 'Jane Smith', timestamp: '2 hours ago' },
      { type: 'modification', line: 20, oldContent: 'Original text', newContent: 'Modified text', author: 'John Doe', timestamp: '2 hours ago' },
      { type: 'addition', line: 25, content: 'Another new paragraph', author: 'Jane Smith', timestamp: '1 day ago' },
      { type: 'modification', line: 30, oldContent: 'Data old', newContent: 'Data updated', author: 'John Doe', timestamp: '2 days ago' },
    ]
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h3 className="font-semibold text-gray-900">
              Conflict Resolution
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDiffView('side-by-side')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  diffView === 'side-by-side'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setDiffView('unified')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  diffView === 'unified'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unified
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-red-700">Version {version1?.versionNumber}</span>
              <Badge variant="destructive" className="text-xs">Older</Badge>
            </div>
            <p className="text-xs text-gray-600">
              {format(new Date(version1?.modifiedTime), 'PPpp')}
            </p>
            <p className="text-xs text-gray-600">
              by {version1?.lastModifyingUser?.displayName}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-green-700">Version {version2?.versionNumber}</span>
              <Badge className="bg-green-500 text-white text-xs">Newer</Badge>
            </div>
            <p className="text-xs text-gray-600">
              {format(new Date(version2?.modifiedTime), 'PPpp')}
            </p>
            <p className="text-xs text-gray-600">
              by {version2?.lastModifyingUser?.displayName}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3">
          <span className="text-sm text-gray-600">
            <span className="font-medium text-green-600">+{mockDiffData.additions}</span> additions
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-medium text-red-600">-{mockDiffData.deletions}</span> deletions
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-medium text-amber-600">{mockDiffData.modifications}</span> modifications
          </span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto p-4">
        {diffView === 'side-by-side' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-red-100 px-3 py-2 border-b border-red-200">
                <span className="text-sm font-medium text-red-700">Version {version1?.versionNumber}</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-2">
                {mockDiffData.changes.map((change, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${
                      change.type === 'deletion' ? 'bg-red-50' : 'bg-transparent'
                    }`}
                  >
                    {change.type === 'deletion' && (
                      <span className="text-red-600">{change.content}</span>
                    )}
                    {change.type === 'modification' && (
                      <span className="text-red-600 line-through">{change.oldContent}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-green-100 px-3 py-2 border-b border-green-200">
                <span className="text-sm font-medium text-green-700">Version {version2?.versionNumber}</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-2">
                {mockDiffData.changes.map((change, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${
                      change.type === 'addition' ? 'bg-green-50' :
                      change.type === 'modification' ? 'bg-yellow-50' : 'bg-transparent'
                    }`}
                  >
                    {change.type === 'addition' && (
                      <span className="text-green-600">{change.content}</span>
                    )}
                    {change.type === 'modification' && (
                      <span className="text-green-600">{change.newContent}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 font-mono text-sm space-y-1">
              {mockDiffData.changes.map((change, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    change.type === 'addition' ? 'bg-green-50' :
                    change.type === 'deletion' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}
                >
                  <span className={`inline-block w-12 text-xs font-medium ${
                    change.type === 'addition' ? 'text-green-600' :
                    change.type === 'deletion' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {change.type === 'addition' && '+'}{change.type === 'deletion' && '-'}{change.type === 'modification' && '~'}
                  </span>
                  <span className="text-gray-700">
                    {change.type === 'modification' ? `${change.oldContent} → ${change.newContent}` : change.content}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    ({change.author}, {change.timestamp})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resolution actions */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600">
              Select a version to resolve the conflict
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onResolve(version1)}>
              Keep Version {version1?.versionNumber}
            </Button>
            <Button variant="default" onClick={() => onResolve(version2)}>
              Keep Version {version2?.versionNumber}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Document Viewer Modal Component with Versions tab
const DocumentViewerModal = ({ file, onClose, onShowVersions }) => {
  const [viewerType, setViewerType] = useState('google');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [versions, setVersions] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showConflictView, setShowConflictView] = useState(false);
  const { showToast } = useApp();
  
  const { category } = detectFileType(file);
  const isNewPreviewType = isPreviewableFile(file);
  const previewUrl = getFilePreviewUrl(file);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    }
  }, [isFullscreen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [handleKeyDown]);

  if (!file) return null;

  const googleViewUrl = getGoogleDriveViewUrl(file);
  
  const nativeViewerDocs = file.webContentLink 
    ? [{ uri: file.webContentLink, fileName: file.name }]
    : [{ uri: `https://drive.google.com/uc?export=download&id=${file.id}`, fileName: file.name }];

  const handleViewVersion = (version) => {
    // Open version in new tab
    window.open(`https://drive.google.com/file/d/${file.id}/view?usp=sharing`, '_blank');
    showToast(`Opening version ${version.versionNumber}`, 'info');
  };

  const handleDownloadVersion = (version) => {
    // Trigger download
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}&version=${version.id}`;
    window.open(downloadUrl, '_blank');
    showToast(`Downloading version ${version.versionNumber}`, 'info');
  };

  const handleRestoreVersion = async (version) => {
    try {
      await restoreDriveFileVersion(file.id, version.id);
      showToast(`Version ${version.versionNumber} restored successfully`, 'success');
      // Reload versions
      setVersions(prev => prev.map(v => ({ ...v, isCurrent: v.id === version.id })));
    } catch (error) {
      showToast('Failed to restore version', 'error');
    }
  };

  const handleCompareVersions = (selectedVersionIds) => {
    const selected = versions.filter(v => selectedVersionIds.includes(v.id));
    setSelectedVersions(selected);
    setShowConflictView(true);
  };

  const handleConflictResolve = (selectedVersion) => {
    showToast(`Conflict resolved by selecting version ${selectedVersion.versionNumber}`, 'success');
    setShowConflictView(false);
    setSelectedVersions([]);
    setActiveTab('versions');
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}
      onClick={(e) => e.target === e.currentTarget && !showConflictView && onClose()}
      data-testid="document-viewer-modal"
    >
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">{getFileIconEmoji(file.mimeType)}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-gray-500">{getFileTypeLabel(file.mimeType, file.name)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Viewer type toggle - only show for traditional document types */}
            {!isNewPreviewType && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setViewerType('google')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewerType === 'google' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="viewer-toggle-google"
                >
                  Google Viewer
                </button>
                <button
                  onClick={() => setViewerType('native')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewerType === 'native' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="viewer-toggle-native"
                >
                  Native Viewer
                </button>
              </div>
            )}
            
            {/* Category badge for new preview types */}
            {isNewPreviewType && (
              <Badge className="mr-2 bg-amber-500 text-white">
                {category.charAt(0).toUpperCase() + category.slice(1)} Preview
              </Badge>
            )}
            
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in Google Drive"
              data-testid="open-in-drive-btn"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </a>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              data-testid="fullscreen-btn"
            >
              <Maximize2 className="w-5 h-5 text-gray-600" />
            </button>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Close (Esc)"
              data-testid="close-viewer-btn"
            >
              <X className="w-5 h-5 text-gray-600 hover:text-red-600" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        {!showConflictView && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b border-gray-200">
            <TabsList className="bg-gray-50 h-12 px-4">
              <TabsTrigger 
                value="view" 
                className="data-[state=active]:bg-white data-[state=active]:text-amber-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </TabsTrigger>
              <TabsTrigger 
                value="versions" 
                className="data-[state=active]:bg-white data-[state=active]:text-amber-700"
              >
                <History className="w-4 h-4 mr-2" />
                Versions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        
        <div className="flex-1 overflow-hidden bg-gray-100">
          {showConflictView ? (
            <ConflictView
              file={file}
              versions={selectedVersions}
              onClose={() => setShowConflictView(false)}
              onResolve={handleConflictResolve}
            />
          ) : activeTab === 'versions' ? (
            <VersionsPanel
              file={file}
              onViewVersion={handleViewVersion}
              onDownloadVersion={handleDownloadVersion}
              onRestoreVersion={handleRestoreVersion}
              onCompareVersions={handleCompareVersions}
            />
          ) : isNewPreviewType ? (
            // Use new FilePreview component for supported file types
            <FilePreview file={file} url={previewUrl} />
          ) : viewerType === 'google' ? (
            <iframe
              src={googleViewUrl}
              className="w-full h-full border-0"
              title={`Document viewer: ${file.name}`}
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              data-testid="google-drive-iframe"
            />
          ) : (
            <div className="w-full h-full" data-testid="native-doc-viewer">
              <DocViewer
                documents={nativeViewerDocs}
                pluginRenderers={DocViewerRenderers}
                style={{ height: '100%' }}
                config={{
                  header: {
                    disableHeader: true,
                    disableFileName: true,
                  },
                  pdfVerticalScrollByDefault: true,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Recursive folder tree component
const FolderTree = ({ 
  data, 
  level = 0, 
  expandedFolders, 
  selectedFolderId, 
  folderContents, 
  toggleExpand, 
  handleFolderClick 
}) => {
  if (!data?.folders?.length) return null;

  return (
    <div className={`space-y-1 ${level > 0 ? 'ml-4 mt-1 border-l-2 border-gray-200 pl-2' : ''}`}>
      {data.folders.map((folder) => {
        const isExpanded = expandedFolders[folder.id];
        const isSelected = selectedFolderId === folder.id;
        const hasLoadedContents = folderContents[folder.id];

        return (
          <div key={folder.id}>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(folder.id);
                }}
                className="flex items-center justify-center p-1 hover:bg-amber-100 rounded transition-all"
              >
                <span className="transition-transform duration-200">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </span>
              </button>
              <button
                onClick={() => handleFolderClick(folder.id, folder.name)}
                className={`flex items-center gap-2 flex-1 p-2 rounded-lg transition-all text-left ${
                  isSelected 
                    ? 'bg-amber-100 border-2 border-amber-500' 
                    : 'hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Folder className={`w-5 h-5 ${isSelected ? 'text-amber-600' : 'text-yellow-500'}`} />
                <span className={`text-sm font-medium truncate ${isSelected ? 'text-amber-700' : 'text-gray-700'}`}>
                  {folder.name}
                </span>
              </button>
            </div>
            
            {isExpanded && (
              <div className="ml-4">
                {folderContents[folder.id] ? (
                  folderContents[folder.id].folders?.length > 0 ? (
                    <FolderTree 
                      data={folderContents[folder.id]} 
                      level={level + 1}
                      expandedFolders={expandedFolders}
                      selectedFolderId={selectedFolderId}
                      folderContents={folderContents}
                      toggleExpand={toggleExpand}
                      handleFolderClick={handleFolderClick}
                    />
                  ) : (
                    <div className="p-2 text-xs text-gray-400 italic">No subfolders</div>
                  )
                ) : (
                  <div className="p-2 text-xs text-gray-400">Loading...</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({ 
  filters, 
  setFilters, 
  authors, 
  tags,
  onClearFilters 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasActiveFilters = useMemo(() => {
    return filters.searchTerm || 
           filters.fileType !== 'all' || 
           filters.dateFrom || 
           filters.dateTo || 
           filters.author !== 'all' ||
           (filters.tags && filters.tags.length > 0);
  }, [filters]);

  const handleDateFromSelect = (date) => {
    setFilters(prev => ({ ...prev, dateFrom: date }));
  };

  const handleDateToSelect = (date) => {
    setFilters(prev => ({ ...prev, dateTo: date }));
  };

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Main search bar row */}
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents by name, content, or full-text..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
          />
          {filters.searchTerm && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* File Type Filter */}
        <Select
          value={filters.fileType}
          onValueChange={(value) => setFilters(prev => ({ ...prev, fileType: value }))}
        >
          <SelectTrigger className="w-[160px] border-2 border-gray-200 focus:border-amber-500">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Author Filter */}
        <Select
          value={filters.author}
          onValueChange={(value) => setFilters(prev => ({ ...prev, author: value }))}
        >
          <SelectTrigger className="w-[160px] border-2 border-gray-200 focus:border-amber-500">
            <SelectValue placeholder="Author" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Authors</SelectItem>
            {authors.map((author) => (
              <SelectItem key={author} value={author}>
                {author}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle advanced filters */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`border-2 ${isExpanded ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && !isExpanded && (
            <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
              Active
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced filters panel */}
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap items-end gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date From
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-[180px] justify-start text-left font-normal border-2 ${
                      filters.dateFrom ? 'border-amber-500 bg-white' : 'border-gray-200'
                    }`}
                  >
                    {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={handleDateFromSelect}
                    initialFocus
                    maxDate={filters.dateTo || new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date To
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-[180px] justify-start text-left font-normal border-2 ${
                      filters.dateTo ? 'border-amber-500 bg-white' : 'border-gray-200'
                    }`}
                  >
                    {filters.dateTo ? format(filters.dateTo, 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={handleDateToSelect}
                    initialFocus
                    minDate={filters.dateFrom}
                    maxDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all ${
                        filters.tags?.includes(tag) 
                          ? 'bg-amber-500 hover:bg-amber-600' 
                          : 'border-gray-300 text-gray-600 hover:border-amber-500'
                      }`}
                      onClick={() => {
                        setFilters(prev => {
                          const currentTags = prev.tags || [];
                          const newTags = currentTags.includes(tag)
                            ? currentTags.filter(t => t !== tag)
                            : [...currentTags, tag];
                          return { ...prev, tags: newTags };
                        });
                      }}
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">No tags available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DocumentManagement = () => {
  const { isOnline, showToast, cacheDriveFolderData, getCachedDriveFolderData } = useApp();
  const navigate = useNavigate();
  
  const [rootFolderData, setRootFolderData] = useState({ folders: [], files: [] });
  const [folderContents, setFolderContents] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [displayedFiles, setDisplayedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState(null);
  
  // Advanced search filters state
  const [filters, setFilters] = useState({
    searchTerm: '',
    fileType: 'all',
    dateFrom: null,
    dateTo: null,
    author: 'all',
    tags: [],
  });
  
  // Collaborative editing state
  const [collaborativeUsers, setCollaborativeUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isChangeTrackingOpen, setIsChangeTrackingOpen] = useState(false);
  const [isUserPresenceOpen, setIsUserPresenceOpen] = useState(false);
  
  // Mock current user data - in production, this would come from auth context
  const currentUserId = useRef(`user-${Math.random().toString(36).substr(2, 9)}`);
  const currentUser = useMemo(() => ({
    id: currentUserId.current,
    name: 'Current User',
    email: 'current@example.com',
    avatar: null
  }), []);
  
  // WebSocket connection for real-time collaboration
  const { isConnected, sendMessage, onMessage, offMessage } = useWebSocket(
    viewerFile?.id || selectedFolderId || 'global',
    currentUserId.current
  );
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isConnected) return;

    const handlePresenceUpdate = (message) => {
      setCollaborativeUsers(prevUsers => {
        // Update or add user
        const existingUserIndex = prevUsers.findIndex(u => u.id === message.user.id);
        const updatedUsers = [...prevUsers];
        
        if (existingUserIndex >= 0) {
          updatedUsers[existingUserIndex] = message.user;
        } else {
          updatedUsers.push(message.user);
        }
        
        return updatedUsers;
      });
    };

    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleCommentUpdate = (message) => {
      setComments(prev => {
        if (message.action === 'add') {
          return [...prev, message.comment];
        } else if (message.action === 'edit') {
          return prev.map(c => c.id === message.comment.id ? message.comment : c);
        } else if (message.action === 'delete') {
          return prev.filter(c => c.id !== message.comment.id);
        }
        return prev;
      });
    };

    const handleSelectionUpdate = (message) => {
      setSelections(prev => {
        const existingIndex = prev.findIndex(s => s.userId === message.selection.userId);
        const updatedSelections = [...prev];
        
        if (existingIndex >= 0) {
          updatedSelections[existingIndex] = message.selection;
        } else {
          updatedSelections.push(message.selection);
        }
        
        return updatedSelections;
      });
    };

    onMessage('presence', handlePresenceUpdate);
    onMessage('chat', handleChatMessage);
    onMessage('comment', handleCommentUpdate);
    onMessage('selection', handleSelectionUpdate);

    return () => {
      offMessage('presence', handlePresenceUpdate);
      offMessage('chat', handleChatMessage);
      offMessage('comment', handleCommentUpdate);
      offMessage('selection', handleSelectionUpdate);
    };
  }, [isConnected, onMessage, offMessage]);
  
  // Send presence updates periodically
  useEffect(() => {
    if (!isConnected || !viewerFile) return;

    const interval = setInterval(() => {
      sendMessage({
        type: 'presence',
        user: {
          ...currentUser,
          isActive: true,
          isEditing: true,
          lastActivity: new Date().toISOString(),
          currentDocument: viewerFile.name
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, viewerFile, currentUser, sendMessage]);
  
  // Handle chat messages
  const handleSendChatMessage = (message) => {
    if (isConnected) {
      sendMessage({
        type: 'chat',
        ...message,
        userId: currentUserId.current,
        userName: currentUser.name
      });
    }
  };
  
  // Handle comments
  const handleAddComment = (comment) => {
    if (isConnected) {
      const newComment = {
        ...comment,
        id: `comment-${Date.now()}`,
        userId: currentUserId.current,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        replies: []
      };
      
      sendMessage({
        type: 'comment',
        action: 'add',
        comment: newComment
      });
    }
  };
  
  const handleReplyComment = (parentId, text) => {
    if (isConnected) {
      const reply = {
        id: `reply-${Date.now()}`,
        text,
        userId: currentUserId.current,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: []
      };
      
      sendMessage({
        type: 'comment',
        action: 'reply',
        parentId,
        reply
      });
    }
  };
  
  const handleEditComment = (commentId, text) => {
    if (isConnected) {
      sendMessage({
        type: 'comment',
        action: 'edit',
        commentId,
        text
      });
    }
  };
  
  const handleDeleteComment = (commentId) => {
    if (isConnected) {
      sendMessage({
        type: 'comment',
        action: 'delete',
        commentId
      });
    }
  };
  
  const handleLikeComment = (commentId) => {
    if (isConnected) {
      sendMessage({
        type: 'comment',
        action: 'like',
        commentId,
        userId: currentUserId.current
      });
    }
  };
  
  // Toggle collaborative features
  const toggleChat = () => setIsChatOpen(!isChatOpen);
  const toggleComments = () => setIsCommentsOpen(!isCommentsOpen);
  const toggleChangeTracking = () => setIsChangeTrackingOpen(!isChangeTrackingOpen);
  const toggleUserPresence = () => setIsUserPresenceOpen(!isUserPresenceOpen);

  // Extract unique authors and tags from all files
  const { authors, tags } = useMemo(() => {
    const allFiles = [
      ...(rootFolderData.files || []),
      ...Object.values(folderContents).flatMap(f => f.files || [])
    ];
    
    const uniqueAuthors = [...new Set(
      allFiles
        .map(f => f.owners?.[0]?.displayName || f.lastModifyingUser?.displayName)
        .filter(Boolean)
    )].sort();
    
    // Extract tags from properties or name patterns
    const uniqueTags = [...new Set(
      allFiles
        .flatMap(f => [
          ...(f.properties?.tags || []),
          ...(f.appProperties?.tags || [])
        ])
        .filter(Boolean)
    )].sort();
    
    return { authors: uniqueAuthors, tags: uniqueTags };
  }, [rootFolderData, folderContents]);

  useEffect(() => {
    loadRootFolder();
  }, []);

  // Update displayed files when selection changes
  useEffect(() => {
    if (selectedFolderId && folderContents[selectedFolderId]) {
      setDisplayedFiles(folderContents[selectedFolderId].files || []);
    } else if (!selectedFolderId) {
      setDisplayedFiles(rootFolderData.files || []);
    }
  }, [rootFolderData, selectedFolderId, folderContents]);

  const loadRootFolder = async () => {
    setIsLoading(true);
    try {
      const result = await fetchDriveFolder(DOCUMENT_ROOT_FOLDER);
      const folderData = result.data || { folders: [], files: [] };
      setRootFolderData(folderData);
      setDisplayedFiles(folderData.files || []);
      await cacheDriveFolderData(DOCUMENT_ROOT_FOLDER, folderData);
    } catch (error) {
      const cached = await getCachedDriveFolderData(DOCUMENT_ROOT_FOLDER);
      if (cached && cached.data) {
        setRootFolderData(cached.data);
        setDisplayedFiles(cached.data.files || []);
        showToast('Loaded cached documents', 'info');
      } else {
        showToast('Failed to load documents', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderContents = async (folderId) => {
    if (folderContents[folderId]) return folderContents[folderId];

    try {
      const result = await fetchDriveFolder(folderId);
      const data = result.data || { folders: [], files: [] };
      setFolderContents(prev => ({ ...prev, [folderId]: data }));
      await cacheDriveFolderData(folderId, data);
      return data;
    } catch (error) {
      const cached = await getCachedDriveFolderData(folderId);
      if (cached && cached.data) {
        setFolderContents(prev => ({ ...prev, [folderId]: cached.data }));
        return cached.data;
      }
      console.error('Failed to load folder contents');
      return { folders: [], files: [] };
    }
  };

  const toggleExpand = async (folderId) => {
    const isCurrentlyExpanded = expandedFolders[folderId];
    
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));

    if (!isCurrentlyExpanded && !folderContents[folderId]) {
      await loadFolderContents(folderId);
    }
  };

  const handleFolderClick = async (folderId, folderName) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setIsLoading(true);

    try {
      let data;
      if (folderContents[folderId]) {
        data = folderContents[folderId];
      } else {
        data = await loadFolderContents(folderId);
      }
      setDisplayedFiles(data.files || []);
    } catch (error) {
      showToast('Failed to load folder contents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRootClick = () => {
    setSelectedFolderId(null);
    setSelectedFolderName('');
    setDisplayedFiles(rootFolderData.files || []);
  };

  // Advanced filtering logic
  const filteredFiles = useMemo(() => {
    let result = displayedFiles;

    // Full-text search on name and content hints
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(file => 
        file.name?.toLowerCase().includes(searchLower) ||
        file.description?.toLowerCase().includes(searchLower) ||
        file.fullTextExtension?.toLowerCase().includes(searchLower)
      );
    }

    // File type filter
    if (filters.fileType !== 'all') {
      result = result.filter(file => {
        const { category, type } = detectFileType(file);
        switch (filters.fileType) {
          case 'pdf':
            return category === 'pdf';
          case 'docx':
            return category === 'document';
          case 'xlsx':
            return category === 'spreadsheet';
          case 'pptx':
            return category === 'presentation';
          case 'gdoc':
            return category === 'google' && (type === 'document' || file.mimeType?.includes('document'));
          case 'gsheet':
            return category === 'google' && (type === 'spreadsheet' || file.mimeType?.includes('spreadsheet'));
          case 'gslide':
            return category === 'google' && (type === 'presentation' || file.mimeType?.includes('presentation'));
          case 'image':
            return category === 'image';
          case 'text':
            return category === 'text' || category === 'csv';
          case 'code':
            return category === 'code';
          case 'audio':
            return category === 'audio';
          case 'video':
            return category === 'video';
          case 'cad':
            return category === 'cad';
          case 'gis':
            return category === 'gis';
          case '3d':
            return category === '3d';
          case 'archive':
            return category === 'archive';
          case 'ebook':
            return category === 'ebook';
          case 'markdown':
            return category === 'markdown';
          default:
            return true;
        }
      });
    }

    // Author filter
    if (filters.author !== 'all') {
      result = result.filter(file => {
        const fileAuthor = file.owners?.[0]?.displayName || file.lastModifyingUser?.displayName;
        return fileAuthor === filters.author;
      });
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter(file => {
        if (!file.createdDate && !file.modifiedTime) return true;
        
        const fileDate = file.modifiedTime 
          ? new Date(file.modifiedTime) 
          : new Date(file.createdDate);
        
        if (filters.dateFrom && fileDate < filters.dateFrom) return false;
        if (filters.dateTo && fileDate > filters.dateTo) return false;
        
        return true;
      });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(file => {
        const fileTags = [
          ...(file.properties?.tags || []),
          ...(file.appProperties?.tags || [])
        ];
        return filters.tags.some(tag => fileTags.includes(tag));
      });
    }

    return result;
  }, [displayedFiles, filters]);

  const getFileIcon = (mimeType) => {
    return getFileIconEmoji(mimeType);
  };

  const getFileType = (mimeType, fileName = '') => {
    const { category, type } = detectFileType({ mimeType, name: fileName });
    const labels = {
      pdf: 'PDF',
      document: 'DOCX',
      spreadsheet: 'XLSX',
      presentation: 'PPTX',
      google: 'GDOC',
      image: 'IMAGE',
      cad: 'CAD',
      gis: 'GIS',
      '3d': '3D',
      audio: 'AUDIO',
      video: 'VIDEO',
      archive: 'ARCHIVE',
      code: 'CODE',
      markdown: 'MD',
      csv: 'CSV',
      ebook: 'EBOOK',
      text: 'TEXT',
    };
    return labels[category] || 'FILE';
  };

  const handleFileClick = (file, e) => {
    e.preventDefault();
    const fileType = detectFileType(file);
    if (isViewableFile(file) || isImageFile(file.name) || isImageMimeType(file.mimeType)) {
      setViewerFile(file);
    } else if (isPreviewableFile(file)) {
      // Use new FilePreview for supported file types
      setViewerFile(file);
    } else {
      window.open(file.webViewLink, '_blank');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      fileType: 'all',
      dateFrom: null,
      dateTo: null,
      author: 'all',
      tags: [],
    });
  };

  // Separate images and non-images
  const imageFiles = filteredFiles.filter(file => 
    isImageFile(file.name) || isImageMimeType(file.mimeType)
  );
  const nonImageFiles = filteredFiles.filter(file => 
    !isImageFile(file.name) && !isImageMimeType(file.mimeType)
  );

  const photoSwipeItems = preparePhotoSwipeItems(imageFiles, false);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      {viewerFile && (
        <DocumentViewerModal 
          file={viewerFile} 
          onClose={() => setViewerFile(null)} 
        />
      )}
      
      <div className="flex-1 flex overflow-hidden bg-gradient-to-b from-amber-50 to-white">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Documents
              </h3>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100">
            <button
              onClick={handleRootClick}
              className={`flex items-center gap-2 w-full p-2 rounded-lg transition-all text-left ${
                !selectedFolderId 
                  ? 'bg-amber-100 border-2 border-amber-500' 
                  : 'hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <Folder className={`w-5 h-5 ${!selectedFolderId ? 'text-amber-600' : 'text-yellow-500'}`} />
              <span className={`text-sm font-semibold ${!selectedFolderId ? 'text-amber-700' : 'text-gray-700'}`}>
                All Documents
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rootFolderData.folders?.length === 0 && !isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No folders found</p>
              </div>
            ) : (
              <FolderTree 
                data={rootFolderData}
                expandedFolders={expandedFolders}
                selectedFolderId={selectedFolderId}
                folderContents={folderContents}
                toggleExpand={toggleExpand}
                handleFolderClick={handleFolderClick}
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-6 h-6 text-amber-500" />
                Document Management
                {selectedFolderName && (
                  <span className="text-gray-400 font-normal">
                    / {selectedFolderName}
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2">
                {!isOnline && (
                  <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-semibold text-sm">
                    💾 Offline Mode
                  </span>
                )}
                {isOnline && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleChat}
                      className={`border-2 ${isChatOpen ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                      title="Live Chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleComments}
                      className={`border-2 ${isCommentsOpen ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                      title="Comments"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="ml-1">{comments.length}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleChangeTracking}
                      className={`border-2 ${isChangeTrackingOpen ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                      title="Live Cursors"
                    >
                      <MousePointer2 className="w-4 h-4" />
                      <span className="ml-1">{selections.length}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleUserPresence}
                      className={`border-2 ${isUserPresenceOpen ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
                      title="User Presence"
                    >
                      <Users className="w-4 h-4" />
                      <span className="ml-1">{collaborativeUsers.length}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Search & Filter Panel */}
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            authors={authors}
            tags={tags}
            onClearFilters={handleClearFilters}
          />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading documents...</p>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {hasActiveFilters(filters) ? 'No documents match your filters' : 'No documents found'}
                  </h3>
                  <p className="text-gray-600">
                    {hasActiveFilters(filters) 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Select a folder to view documents'}
                  </p>
                </div>
              </div>
            ) : (
              <PhotoSwipeGallery 
                galleryID="document-gallery"
                images={photoSwipeItems}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {imageFiles.map((file, index) => (
                    <a
                      key={file.id}
                      href={convertToHDUrl(file.thumbnailLink || file.webViewLink)}
                      data-pswp-width="2048"
                      data-pswp-height="1536"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                      data-testid={`doc-image-${index}`}
                    >
                      <div className="aspect-video bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-6xl">🖼️</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-gray-900 break-words">{file.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getFileType(file.mimeType)}
                          </Badge>
                          {file.lastModifyingUser && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {file.lastModifyingUser.displayName}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                  
                  {nonImageFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={(e) => handleFileClick(file, e)}
                      className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative"
                      data-testid={`doc-file-${file.id}`}
                    >
                      {isViewableFile(file) && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to View
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-5xl mb-3">{getFileIcon(file.mimeType)}</div>
                        <div className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded inline-block mb-3">
                          {getFileType(file.mimeType)}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 break-words">{file.name}</p>
                        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {file.lastModifyingUser?.displayName || 'Unknown'}
                          </Badge>
                          {file.modifiedTime && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PhotoSwipeGallery>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to check if filters are active
function hasActiveFilters(filters) {
  return filters.searchTerm || 
         filters.fileType !== 'all' || 
         filters.dateFrom || 
         filters.dateTo || 
         filters.author !== 'all' ||
         (filters.tags && filters.tags.length > 0);
}

export default DocumentManagement;
