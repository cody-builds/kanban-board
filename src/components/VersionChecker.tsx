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
  const [autoRefreshing, setAutoRefreshing] = useState(false);

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

  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Detect iOS Chrome for more aggressive cache busting
    const isIOSChrome = () => {
      const ua = navigator.userAgent.toLowerCase();
      return ua.includes('crios') || (ua.includes('chrome') && ua.includes('ios'));
    };

    // Check if Supabase config is available (indicates fresh JS bundle)
    const checkSupabaseConfig = () => {
      try {
        const hasSupabaseUrl = !!(process?.env?.NEXT_PUBLIC_SUPABASE_URL);
        return hasSupabaseUrl;
      } catch {
        return false;
      }
    };

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
          
          // For iOS Chrome, be more aggressive - auto-refresh after 3 seconds
          if (isIOSChrome() && !autoRefreshing) {
            console.log('iOS Chrome detected - auto-refreshing in 3 seconds...');
            setAutoRefreshing(true);
            setTimeout(() => {
              handleRefresh();
            }, 3000);
          }
          
          setShowRefreshPrompt(true);
        }

        // Also check if Supabase config is missing (indicates stale cache)
        if (!checkSupabaseConfig()) {
          console.log('Supabase config missing - likely stale cache');
          
          // On mobile, immediately show refresh prompt
          if (isIOSChrome() || /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
            setShowRefreshPrompt(true);
          }
        }
      } catch (e) {
        // Silently fail - version check is optional
        console.debug('Version check skipped:', e);
      }
    };

    // Check immediately
    checkVersion();
    
    // Check every 15 seconds for updates (more frequent for mobile)
    const interval = setInterval(checkVersion, 15000);
    
    return () => clearInterval(interval);
  }, [autoRefreshing]);

  if (!showRefreshPrompt) return null;

  // Detect mobile for different messaging
  const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
  const refreshText = isMobile 
    ? (isChecking ? 'Refreshing...' : 'Tap to fix sync issues')
    : (isChecking ? 'Refreshing...' : 'New version available - Click to refresh');

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-pulse">
      <button
        onClick={handleRefresh}
        disabled={isChecking}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm max-w-xs"
      >
        <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
        {refreshText}
      </button>
      {autoRefreshing && (
        <div className="mt-2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
          Auto-refreshing in 3s...
        </div>
      )}
    </div>
  );
}
