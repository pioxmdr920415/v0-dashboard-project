import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Download, X, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';

const BottomStatusBar = () => {
  const { isOnline, isSyncing, lastSyncTime, handleSync } = useApp();
  const { isDarkMode } = useTheme();
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Show prompt after a short delay if user hasn't dismissed it recently
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      const shouldShow = !lastDismissed || (Date.now() - parseInt(lastDismissed)) > 24 * 60 * 60 * 1000; // 24 hours
      
      if (shouldShow) {
        setShowPrompt(true);
      }
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      
      toast({
        title: "App Installed Successfully!",
        description: "You can now use MDRRMO Pio Duran as a desktop application.",
        duration: 5000,
      });
    };

    checkInstallation();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('show-install-prompt', () => setShowPrompt(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('show-install-prompt', () => setShowPrompt(true));
    };
  }, [toast]);

  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        const result = await deferredPrompt.prompt();
        if (result.outcome === 'accepted') {
          toast({
            title: "Installation Started",
            description: "Follow the prompts in your browser to complete installation.",
            duration: 5000,
          });
          setShowPrompt(false);
          localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        }
      } catch (error) {
        console.error('Installation failed:', error);
        toast({
          title: "Installation Failed",
          description: "Please try again or use your browser's menu to install.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstallFromMenu = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = "";
    
    if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      instructions = "Click the three dots menu (⋮) in Chrome/Edge and select 'Install MDRRMO Pio Duran'";
    } else if (userAgent.includes('firefox')) {
      instructions = "Click the menu button (☰) in Firefox and select 'Install MDRRMO Pio Duran'";
    } else if (userAgent.includes('safari')) {
      instructions = "Click the share button (📤) in Safari and select 'Add to Home Screen'";
    } else {
      instructions = "Look for 'Install' or 'Add to Home Screen' option in your browser menu";
    }
    
    toast({
      title: "Install from Browser Menu",
      description: instructions,
      duration: 8000,
    });
  };

  return (
    <>
      {/* Installation Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Install MDRRMO Pio Duran</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Get the best experience with our desktop application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Benefits of Installation
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Works offline - access data without internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Faster loading - cached content and resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Desktop notifications - stay updated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Native app experience - no browser needed</span>
                  </li>
                </ul>
              </div>

              {/* Installation Options */}
              <div className="space-y-3">
                <h4 className="font-semibold">Installation Options</h4>
                
                {isInstallable ? (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleInstallClick}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install Now (Recommended)
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleInstallFromMenu}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Install from Browser Menu
                    </Button>
                  </div>
                )}
              </div>

              {/* Device Compatibility */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                <span>Compatible with:</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">Desktop</Badge>
                  <Badge variant="secondary">Mobile</Badge>
                  <Badge variant="secondary">Tablet</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t transition-all duration-300 ${
          isDarkMode
            ? 'bg-gray-900/90 border-gray-700/50'
            : 'bg-white/90 border-gray-200/50'
        }`}
        data-testid="bottom-status-bar"
      >
        {/* Animated top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient-x opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all ${
                isOnline
                  ? isDarkMode
                    ? 'bg-green-500/10 border-green-400/30 text-green-400'
                    : 'bg-green-500/10 border-green-400/30 text-green-600'
                  : isDarkMode
                    ? 'bg-yellow-500/10 border-yellow-400/30 text-yellow-400'
                    : 'bg-yellow-500/10 border-yellow-400/30 text-yellow-600'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                } animate-pulse`} />
                <span className="text-sm font-semibold">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {lastSyncTime && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Last sync: {formatSyncTime(lastSyncTime)}
                </div>
              )}
            </div>

            {/* Sync Button */}
            {isOnline && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                data-testid="sync-button"
                title="Sync with server"
              >
                {isSyncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync Now</span>
                  </>
                )}
              </button>
            )}

            {/* Install App Button */}
            {!isInstalled && (
              <Button
                onClick={() => setShowPrompt(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                title="Install app"
              >
                <Download className="w-4 h-4" />
                <span>Install App</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BottomStatusBar;
