'use client';

import { useSyncMode } from '@/hooks/useTasks';
import { Cloud, HardDrive, Loader2 } from 'lucide-react';

export function SyncStatus() {
  const { mode, isReady } = useSyncMode();
  
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
  
  return (
    <div className="flex items-center gap-2 text-amber-600 text-sm" title="Local storage mode - tasks not shared between users">
      <HardDrive size={16} />
      <span className="hidden sm:inline">Local Only</span>
    </div>
  );
}
