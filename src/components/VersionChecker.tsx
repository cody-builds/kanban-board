'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Register service worker for cache management
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, will prompt for refresh
            console.log('New service worker installed, refresh recommended');
          }
        });
      });
    } catch (error) {
      console.debug('Service worker registration skipped:', error);
    }
  }
};

// This component checks for version mismatches and helps users get the latest version
export function VersionChecker() {
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Check version on mount and periodically
    const checkVersion = async () => {
      try {
        // Fetch version.json with cache-busting query param
        const response = await fetch(`/kanban-board/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const serverVersion = data.buildTime;
        
        // Get the version embedded in the HTML
        const htmlVersion = document.documentElement.dataset.version;
        
        // If versions don't match, we have a stale cache
        if (htmlVersion && serverVersion && htmlVersion !== serverVersion) {
          console.log('Version mismatch detected:', { htmlVersion, serverVersion });
          setShowRefreshPrompt(true);
        }
      } catch (e) {
        // Silently fail - version check is optional
        console.debug('Version check skipped:', e);
      }
    };

    // Check immediately
    checkVersion();
    
    // Check every 30 seconds for updates
    const interval = setInterval(checkVersion, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsChecking(true);
    // Clear caches and hard refresh
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Force reload from server
    window.location.reload();
  };

  if (!showRefreshPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-pulse">
      <button
        onClick={handleRefresh}
        disabled={isChecking}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
        {isChecking ? 'Refreshing...' : 'New version available - Click to refresh'}
      </button>
    </div>
  );
}
