"use client";

import React from 'react';
import type { SyncStatus } from '@/lib/hybridStorage';

interface CloudSyncStatusProps {
  status: SyncStatus;
  isEnabled: boolean;
  onSync?: () => void;
}

export function CloudSyncStatus({ status, isEnabled, onSync }: CloudSyncStatusProps) {
  if (!isEnabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 10v4m0 0l-2-2m2 2l2-2" />
        </svg>
        <span>Local storage only</span>
        <span className="text-xs text-violet-300/70">(Upgrade for cloud sync)</span>
      </div>
    );
  }

  const statusConfig = {
    'local-only': {
      icon: (
        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      text: 'Pending sync',
      color: 'text-yellow-400',
    },
    'syncing': {
      icon: (
        <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      text: 'Syncing...',
      color: 'text-blue-400',
    },
    'synced': {
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M9 12l2 2 4-4" />
        </svg>
      ),
      text: 'Synced to cloud',
      color: 'text-emerald-400',
    },
    'error': {
      icon: (
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 8v4m0 4h.01" />
        </svg>
      ),
      text: 'Sync error',
      color: 'text-red-400',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 text-sm ${config.color}`}>
      {config.icon}
      <span>{config.text}</span>
      {status === 'error' && onSync && (
        <button
          onClick={onSync}
          className="text-xs underline hover:text-violet-300 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Compact badge version for session lists
 */
export function SyncBadge({ status }: { status: SyncStatus }) {
  const badges = {
    'local-only': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
        Local
      </span>
    ),
    'syncing': (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Sync
      </span>
    ),
    'synced': (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Cloud
      </span>
    ),
    'error': (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-300 border border-red-500/30">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Error
      </span>
    ),
  };

  return badges[status];
}
