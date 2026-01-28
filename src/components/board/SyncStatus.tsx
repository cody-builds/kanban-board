'use client';

import { useState } from 'react';
import { useSyncMode } from '@/hooks/useTasks';
import { Cloud, HardDrive, Loader2, RefreshCw } from 'lucide-react';

export function SyncStatus() {
  const { mode, isReady } = useSyncMode();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Force cache clear and reload
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    
    // Clear localStorage cache marker
    localStorage.removeItem('kanban-cache-version');
    
    // Hard refresh bypassing cache
    window.location.href = window.location.href + '?refresh=' + Date.now();
  };
  
  if (!isReady) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }
  
  if (mode === 'cloud') {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm" title="Tasks sync in real-time between all users">
        <Cloud size={16} />
        <span className="hidden sm:inline">Synced</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
    );
  }
  
  // Local Only - show refresh option to help users get latest version
  return (
    <button 
      onClick={handleForceRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 text-amber-600 text-sm hover:text-amber-700 transition-colors cursor-pointer"
      title="Click to refresh and check for sync updates"
    >
      {isRefreshing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <HardDrive size={16} />
      )}
      <span className="hidden sm:inline">Local Only</span>
      <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
    </button>
  );
}
