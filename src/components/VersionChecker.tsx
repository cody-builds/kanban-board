'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

// Register nuclear service worker for aggressive cache management
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`);
      
      console.log('🔧 Service Worker registered');
      
      // Force immediate update check
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New service worker installed, refresh recommended');
            // Trigger immediate refresh for cache updates
            window.location.reload();
          }
        });
      });
      
      // Send cache clear message to service worker
      if (registration.active) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('🧹 Service Worker cache cleared');
          }
        };
        registration.active.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
      }
      
    } catch (error) {
      console.debug('Service worker registration skipped:', error);
    }
  }
};

interface VersionCheckerState {
  showRefreshPrompt: boolean;
  isChecking: boolean;
  autoRefreshing: boolean;
  refreshReason: string;
  countdown: number;
}

// This component provides nuclear cache-busting for mobile browsers
export function VersionChecker() {
  const [state, setState] = useState<VersionCheckerState>({
    showRefreshPrompt: false,
    isChecking: false,
    autoRefreshing: false,
    refreshReason: '',
    countdown: 0,
  });

  // Nuclear cache clear and refresh
  const nuclearRefresh = useCallback(() => {
    setState(prev => ({ ...prev, isChecking: true }));
    
    console.log('💥 Nuclear cache refresh initiated');
    
    Promise.allSettled([
      // Clear Cache API
      'caches' in window ? caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      ) : Promise.resolve(),
      
      // Clear Service Worker
      'serviceWorker' in navigator ? 
        navigator.serviceWorker.getRegistrations().then(regs =>
          Promise.all(regs.map(reg => reg.unregister()))
        ) : Promise.resolve(),
        
      // Clear localStorage
      localStorage.clear(),
      
      // Clear sessionStorage
      sessionStorage.clear()
    ]).then(() => {
      // Add nuclear cache-busting parameters
      const url = new URL(window.location.href);
      url.searchParams.set('_nuclear', Date.now().toString());
      url.searchParams.set('_v', document.querySelector('meta[name="build-version"]')?.getAttribute('content') || 'unknown');
      url.searchParams.set('_clear', '1');
      
      // Hard refresh with cache busting
      window.location.replace(url.toString());
    });
  }, []);

  // Mobile-optimized detection
  const isMobileDevice = useCallback(() => {
    const ua = navigator.userAgent.toLowerCase();
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  }, []);

  const isIOSChrome = useCallback(() => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('crios') || (ua.includes('chrome') && ua.includes('ios'));
  }, []);

  const isIOSSafari = useCallback(() => {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipad/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua);
  }, []);

  // Enhanced Supabase config detection
  const checkSupabaseConfig = useCallback(() => {
    try {
      // Method 1: Check process.env (most reliable when working)
      if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (url.includes('supabase.co')) {
          console.log('✅ Supabase config found via process.env');
          return true;
        }
      }
      
      // Method 2: Check if constants were replaced in the page source
      const pageSource = document.documentElement.outerHTML;
      const supabaseUrlPattern = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/;
      if (supabaseUrlPattern.test(pageSource)) {
        console.log('✅ Supabase config found in page source');
        return true;
      }
      
      // Method 3: Check for Next.js build-time replacement patterns
      const supabaseMarkers = [
        'supabase.co',
        'NEXT_PUBLIC_SUPABASE_URL',
        '__NEXT_BUNDLE_REPLACED__'
      ];
      
      const hasMarkers = supabaseMarkers.some(marker => pageSource.includes(marker));
      if (hasMarkers) {
        console.log('✅ Supabase build markers found');
        return true;
      }
      
      console.warn('❌ No Supabase config detected');
      return false;
    } catch (e) {
      console.warn('❌ Supabase config check failed:', e);
      return false;
    }
  }, []);

  // Comprehensive version and cache check
  const performHealthCheck = useCallback(async () => {
    const isMobile = isMobileDevice();
    const isIOSChromeDevice = isIOSChrome();
    const isIOSSafariDevice = isIOSSafari();
    
    // Skip for desktop browsers unless explicitly needed
    if (!isMobile && !isIOSChromeDevice && !isIOSSafariDevice) {
      return;
    }

    console.log('🔍 Performing health check', { isMobile, isIOSChromeDevice, isIOSSafariDevice });

    const issues: string[] = [];

    // Check 1: HTML version consistency
    const htmlVersion = document.documentElement.dataset.version;
    const metaBuildVersion = document.querySelector('meta[name="build-version"]')?.getAttribute('content');
    
    if (!htmlVersion || !metaBuildVersion || htmlVersion !== metaBuildVersion) {
      issues.push('Version attributes mismatch');
    }

    // Check 2: Supabase configuration
    if (!checkSupabaseConfig()) {
      issues.push('Missing Supabase configuration');
    }

    // Check 3: Network version check (with timeout for mobile)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for mobile
      
      const response = await fetch(`/kanban-board/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.buildTime !== htmlVersion) {
          issues.push('Server version mismatch');
        }
      } else {
        issues.push('Version endpoint unavailable');
      }
    } catch {
      issues.push('Network version check failed');
    }

    // Check 4: Cache-busting parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasRefreshParams = urlParams.has('_cb') || urlParams.has('_nuclear') || urlParams.has('_clear');

    if (issues.length > 0) {
      const reason = issues.join(', ');
      console.log('🚨 Health check failed:', reason);

      // For mobile devices, be very aggressive
      if ((isIOSChromeDevice || isIOSSafariDevice) && !hasRefreshParams) {
        console.log('📱 iOS device with issues detected - starting auto-refresh countdown');
        setState(prev => ({
          ...prev,
          showRefreshPrompt: true,
          autoRefreshing: true,
          refreshReason: reason,
          countdown: 5
        }));
        
        // Auto-refresh countdown
        const countdownInterval = setInterval(() => {
          setState(prev => {
            if (prev.countdown <= 1) {
              clearInterval(countdownInterval);
              nuclearRefresh();
              return prev;
            }
            return { ...prev, countdown: prev.countdown - 1 };
          });
        }, 1000);
        
        return;
      }
      
      // For other mobile devices, show prompt immediately
      setState(prev => ({
        ...prev,
        showRefreshPrompt: true,
        refreshReason: reason
      }));
    } else {
      console.log('✅ Health check passed');
    }
  }, [isMobileDevice, isIOSChrome, isIOSSafari, checkSupabaseConfig, nuclearRefresh]);

  useEffect(() => {
    // Register service worker first
    registerServiceWorker();
    
    // Perform initial health check
    performHealthCheck();
    
    // Set up periodic checks (more frequent for mobile)
    const isMobile = isMobileDevice();
    const checkInterval = isMobile ? 10000 : 30000; // 10s for mobile, 30s for desktop
    
    const interval = setInterval(performHealthCheck, checkInterval);
    
    return () => clearInterval(interval);
  }, [performHealthCheck, isMobileDevice]);

  if (!state.showRefreshPrompt) return null;

  const isMobile = isMobileDevice();
  const refreshText = state.isChecking 
    ? 'Clearing cache...' 
    : isMobile 
      ? 'Fix sync issue' 
      : 'Refresh for latest';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border-2 border-red-200 rounded-lg shadow-xl p-3 max-w-sm animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800">
            {state.autoRefreshing ? 'Auto-refreshing...' : 'Cache Issue Detected'}
          </span>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          {state.refreshReason}
        </p>
        
        {state.autoRefreshing && state.countdown > 0 && (
          <div className="text-center mb-2">
            <div className="text-lg font-bold text-blue-600">
              {state.countdown}
            </div>
            <div className="text-xs text-gray-500">
              Auto-refresh in...
            </div>
          </div>
        )}
        
        <button
          onClick={nuclearRefresh}
          disabled={state.isChecking}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={state.isChecking ? 'animate-spin' : ''} />
          {refreshText}
        </button>
        
        {isMobile && (
          <div className="text-xs text-gray-500 text-center mt-1">
            This fixes iOS Chrome cache issues
          </div>
        )}
      </div>
    </div>
  );
}
