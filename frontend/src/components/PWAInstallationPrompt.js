import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, Monitor, 
  X, Wifi, WifiOff, RefreshCw,
  Info, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';

const PWAInstallationPrompt = ({ showInstallButton = false }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Listen for custom event to show prompt
    const handleShowInstallPrompt = () => {
      setShowPrompt(true);
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

    // Connection status monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    checkInstallation();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('show-install-prompt', handleShowInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('show-install-prompt', handleShowInstallPrompt);
    };
  }, [toast]);

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
    toast({
      title: "Install from Browser Menu",
      description: "Click the three dots menu in your browser and select 'Install MDRRMO Pio Duran'.",
      duration: 8000,
    });
  };

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      return {
        title: "Chrome/Edge Instructions",
        steps: [
          "Click the three dots menu (⋮) in your browser",
          "Select 'Install MDRRMO Pio Duran'",
          "Follow the installation prompts"
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        title: "Firefox Instructions", 
        steps: [
          "Click the menu button (☰) in your browser",
          "Select 'Install MDRRMO Pio Duran'",
          "Follow the installation prompts"
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        title: "Safari Instructions",
        steps: [
          "Click the share button (📤) in your browser",
          "Select 'Add to Home Screen'",
          "Follow the installation prompts"
        ]
      };
    } else {
      return {
        title: "General Instructions",
        steps: [
          "Click the three dots menu (⋮) in your browser",
          "Look for an 'Install' or 'Add to Home Screen' option",
          "Follow the installation prompts"
        ]
      };
    }
  };

  if (isInstalled) {
    return null; // Don't show prompt if already installed
  }

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
                      <Smartphone className="w-4 h-4 mr-2" />
                      Install from Browser Menu
                    </Button>
                    <div className="text-xs text-gray-500 text-center">
                      {getInstallInstructions().title}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {getInstallInstructions().steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="font-mono text-gray-400">{index + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
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

      {/* Floating Install Button (optional, default true) */}
      {showInstallButton && !showPrompt && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white p-3"
            onClick={() => setShowPrompt(true)}
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  );
};

export default PWAInstallationPrompt;
