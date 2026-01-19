import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, RotateCw, Move, RefreshCw, MapPin, Smartphone, Image as ImageIcon, Grid3x3, Settings } from 'lucide-react';

// Import photo-sphere-viewer v5 and its CSS
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

// Import plugins
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/markers-plugin/index.css';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import { ResolutionPlugin } from '@photo-sphere-viewer/resolution-plugin';
import { SettingsPlugin } from '@photo-sphere-viewer/settings-plugin';
import { GalleryPlugin } from '@photo-sphere-viewer/gallery-plugin';

const PhotoSphereViewer = ({ 
  imageUrl, 
  title, 
  onClose, 
  panoramaData = {}, 
  allPanoramas = [] 
}) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [imageQuality, setImageQuality] = useState('HD');
  const [showInfo, setShowInfo] = useState(false);

  const initViewer = useCallback(async () => {
    if (!containerRef.current || !imageUrl) return;

    // Cleanup previous viewer instance
    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
        viewerRef.current = null;
      } catch (e) {
        console.error('Error destroying previous viewer:', e);
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if container still exists after delay
      if (!containerRef.current) {
        throw new Error('Container not available');
      }

      console.log('Initializing Photo Sphere Viewer with URL:', imageUrl);

      // Prepare gallery items for navigation
      const galleryItems = allPanoramas.map((pano, index) => ({
        id: pano.id || `pano-${index}`,
        name: pano.name || `Panorama ${index + 1}`,
        thumbnail: pano.thumbnailLink,
        panorama: pano.hdUrl || pano.url
      }));

      // Prepare plugins configuration
      const plugins = [
        // Markers Plugin - for hotspots
        [MarkersPlugin, {
          markers: panoramaData?.markers || []
        }],
        // Settings Plugin (required for Resolution)
        [SettingsPlugin, {
          persist: true
        }],
        // Resolution Plugin - for quality switching
        [ResolutionPlugin, {
          defaultResolution: 'HD',
          resolutions: [
            {
              id: 'SD',
              label: 'Standard (Fast)',
              panorama: imageUrl.replace('=s2048', '=s1024') // Lower resolution
            },
            {
              id: 'HD',
              label: 'High Quality',
              panorama: imageUrl
            },
            {
              id: 'UHD',
              label: 'Ultra HD',
              panorama: imageUrl.replace('=s2048', '=s4096') // Higher resolution
            }
          ]
        }],
        // Gyroscope Plugin - for mobile devices
        [GyroscopePlugin, {
          touchmove: true,
          absolutePosition: true
        }]
      ];

      // Add Gallery Plugin if multiple panoramas available
      if (allPanoramas.length > 1) {
        plugins.push([GalleryPlugin, {
          items: galleryItems,
          thumbnailSize: { width: 100, height: 75 }
        }]);
      }

      // Add Virtual Tour Plugin if links to other panoramas exist
      if (panoramaData?.links && panoramaData.links.length > 0) {
        plugins.push([VirtualTourPlugin, {
          nodes: panoramaData.links.map((link, index) => ({
            id: link.id || `node-${index}`,
            panorama: link.url,
            name: link.name,
            links: link.connectedNodes || [],
            position: link.position || { yaw: 0, pitch: 0 },
            markers: link.markers || []
          })),
          startNodeId: panoramaData.currentNodeId || 'node-0'
        }]);
      }

      // Initialize Photo Sphere Viewer v5 with plugins
      const viewerInstance = new Viewer({
        container: containerRef.current,
        panorama: imageUrl,
        plugins: plugins,
        navbar: false, // We use custom controls
        defaultZoomLvl: 50,
        minFov: 20, // Lower min FOV for wider initial view
        maxFov: 120, // Higher max FOV for better 360° experience
        loadingTxt: 'Loading panorama...',
        mousewheel: true,
        mousemove: true,
        keyboard: 'always',
        touchmoveTwoFingers: false,
        defaultPitch: panoramaData?.defaultPitch || 0,
        defaultYaw: panoramaData?.defaultYaw || 0,
        fisheye: 0,
        sphereCorrection: panoramaData?.sphereCorrection || { pan: 0, tilt: 0, roll: 0 }, // Ensure proper spherical mapping
        panoData: panoramaData?.panoData || null, // Support for partial panoramas
        moveSpeed: 1.5, // Faster movement for better navigation
        zoomSpeed: 2.0, // Faster zoom
        // Performance optimizations
        withCredentials: false,
        requestHeaders: {},
        canvasBackground: '#000000',
        moveInertia: true,
        size: { width: '100%', height: '100%' }, // Ensure full container usage
      });

      // Event listeners for v5 API
      viewerInstance.addEventListener('ready', () => {
        setIsLoading(false);
        console.log('Photo Sphere Viewer is ready');
        
        // Add default markers if none provided
        const markersPlugin = viewerInstance.getPlugin(MarkersPlugin);
        if (markersPlugin && (!panoramaData?.markers || panoramaData.markers.length === 0)) {
          // Add sample info marker
          markersPlugin.addMarker({
            id: 'info-marker',
            position: { yaw: 0, pitch: 0 },
            html: `<div style="background: rgba(0,0,0,0.8); color: white; padding: 10px 16px; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    <div style="font-weight: bold; margin-bottom: 4px;">ℹ️ Welcome to 360° View</div>
                    <div style="font-size: 12px; color: #ccc;">Click and drag to explore</div>
                   </div>`,
            anchor: 'center center',
            visible: true
          });
          
          // Hide info marker after 5 seconds
          setTimeout(() => {
            try {
              markersPlugin.removeMarker('info-marker');
            } catch (e) {
              // Marker might be already removed
            }
          }, 5000);
        }
      });

      viewerInstance.addEventListener('load-progress', (e) => {
        console.log('Loading progress:', e.progress);
      });

      viewerInstance.addEventListener('click', (e) => {
        console.log('Viewer clicked', e.data);
      });

      // Gallery item click event
      if (allPanoramas.length > 1) {
        try {
          const galleryPlugin = viewerInstance.getPlugin(GalleryPlugin);
          if (galleryPlugin) {
            galleryPlugin.addEventListener('item-select', (e) => {
              console.log('Gallery item selected:', e.item);
            });
          }
        } catch (e) {
          console.log('Gallery plugin not available');
        }
      }

      setViewer(viewerInstance);
      viewerRef.current = viewerInstance;

      // Set timeout to handle cases where ready event doesn't fire
      setTimeout(() => {
        if (viewerRef.current) {
          setIsLoading(false);
        }
      }, 5000);

    } catch (err) {
      console.error('Failed to initialize viewer:', err);
      setError(`Failed to initialize viewer: ${err.message}`);
      setIsLoading(false);
    }
  }, [imageUrl, panoramaData, allPanoramas]);

  useEffect(() => {
    initViewer();

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          viewerRef.current = null;
        } catch (e) {
          console.error('Error destroying viewer:', e);
        }
      }
    };
  }, [imageUrl, retryCount, initViewer]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleZoomIn = () => {
    if (viewer) {
      const currentZoom = viewer.getZoomLevel();
      viewer.zoom(Math.min(currentZoom + 10, 100));
    }
  };

  const handleZoomOut = () => {
    if (viewer) {
      const currentZoom = viewer.getZoomLevel();
      viewer.zoom(Math.max(currentZoom - 10, 0));
    }
  };

  const handleFullscreen = () => {
    if (viewer) {
      viewer.toggleFullscreen();
    }
  };

  const handleAutoRotate = () => {
    if (viewer) {
      // v5 uses different autorotate API - toggle by starting/stopping
      if (viewer.isAutorotateEnabled()) {
        viewer.stopAutorotate();
      } else {
        viewer.startAutorotate();
      }
    }
  };

  const handleResetView = () => {
    if (viewer) {
      viewer.rotate({ yaw: 0, pitch: 0 });
      viewer.zoom(50);
    }
  };

  const toggleGyroscope = () => {
    if (viewer) {
      try {
        const gyroPlugin = viewer.getPlugin(GyroscopePlugin);
        if (gyroPlugin) {
          if (gyroscopeEnabled) {
            gyroPlugin.stop();
            setGyroscopeEnabled(false);
          } else {
            gyroPlugin.start();
            setGyroscopeEnabled(true);
          }
        }
      } catch (e) {
        console.error('Gyroscope not available:', e);
      }
    }
  };

  const toggleGallery = () => {
    if (viewer && allPanoramas.length > 1) {
      try {
        const galleryPlugin = viewer.getPlugin(GalleryPlugin);
        if (galleryPlugin) {
          if (showGallery) {
            galleryPlugin.hide();
          } else {
            galleryPlugin.show();
          }
          setShowGallery(!showGallery);
        }
      } catch (e) {
        console.error('Gallery not available:', e);
      }
    }
  };

  const openSettings = () => {
    if (viewer) {
      try {
        const settingsPlugin = viewer.getPlugin(SettingsPlugin);
        if (settingsPlugin) {
          settingsPlugin.show();
        }
      } catch (e) {
        console.error('Settings not available:', e);
      }
    }
  };

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Viewer Container - Full Screen */}
      <div
        ref={containerRef}
        className="w-full h-full"
        data-testid="photo-sphere-container"
      />

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading panorama...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-white text-lg mb-2">Failed to load panorama</p>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white truncate max-w-md drop-shadow-lg" title={title}>
              {title}
            </h2>
            <span className="text-sm text-teal-400 font-semibold drop-shadow">360° Panorama View</span>
            {panoramaData?.gps && (
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-xs text-gray-300 hover:text-white flex items-center gap-1 transition-colors drop-shadow"
                title="GPS Coordinates"
              >
                <MapPin className="w-3 h-3" />
                {panoramaData.gps.lat}, {panoramaData.gps.lng}
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-lg p-2">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Zoom In"
              data-testid="zoom-in-btn"
              disabled={!viewer}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Zoom Out"
              data-testid="zoom-out-btn"
              disabled={!viewer}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleAutoRotate}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Auto Rotate"
              data-testid="auto-rotate-btn"
              disabled={!viewer}
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Center View"
              data-testid="center-view-btn"
              disabled={!viewer}
            >
              <Move className="w-5 h-5" />
            </button>

            {/* Gyroscope control for mobile */}
            <button
              onClick={toggleGyroscope}
              className={`p-2 rounded transition-colors text-white ${
                gyroscopeEnabled ? 'bg-teal-600 hover:bg-teal-700' : 'hover:bg-gray-700'
              }`}
              title="Toggle Gyroscope (Mobile)"
              data-testid="gyroscope-btn"
              disabled={!viewer}
            >
              <Smartphone className="w-5 h-5" />
            </button>

            {/* Gallery toggle */}
            {allPanoramas.length > 1 && (
              <button
                onClick={toggleGallery}
                className={`p-2 rounded transition-colors text-white ${
                  showGallery ? 'bg-teal-600 hover:bg-teal-700' : 'hover:bg-gray-700'
                }`}
                title="Toggle Gallery"
                data-testid="gallery-btn"
                disabled={!viewer}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            )}

            {/* Settings */}
            <button
              onClick={openSettings}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Settings (Quality, etc.)"
              data-testid="settings-btn"
              disabled={!viewer}
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-white"
              title="Fullscreen"
              data-testid="fullscreen-btn"
              disabled={!viewer}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-600 mx-2"></div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-600 rounded transition-colors text-white"
              title="Close (ESC)"
              data-testid="close-panorama-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && panoramaData?.gps && (
        <div className="absolute top-16 left-4 bg-gray-800 bg-opacity-90 text-white px-4 py-3 rounded-lg border border-gray-700 max-w-sm z-20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span className="font-semibold">GPS Coordinates:</span>
                <span className="text-gray-300">
                  Lat: {panoramaData.gps.lat}, Lng: {panoramaData.gps.lng}
                </span>
              </div>
              {panoramaData.location && (
                <div className="text-sm text-gray-400">
                  Location: {panoramaData.location}
                </div>
              )}
              {panoramaData.description && (
                <div className="text-sm text-gray-400">
                  {panoramaData.description}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Instructions */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-20">
        <div className="flex items-center justify-center gap-6 flex-wrap text-gray-300 text-sm drop-shadow">
          <span>🖱️ Click and drag to look around</span>
          <span>🔍 Scroll to zoom</span>
          <span>⌨️ Use arrow keys to navigate</span>
          {gyroscopeEnabled && <span>📱 Gyroscope active</span>}
          {allPanoramas.length > 1 && <span>🖼️ {allPanoramas.length} panoramas available</span>}
          <span>⚙️ Settings for quality control</span>
          <span>ESC Close viewer</span>
        </div>
      </div>
    </div>
  );
};

export default PhotoSphereViewer;
