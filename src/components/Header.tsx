'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Settings, Wifi, WifiOff } from 'lucide-react';
import { ActiveTab } from './BottomNav';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenReports: () => void;
  activeTab: ActiveTab;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenReports }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-graphite/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full bg-accent animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-primary flex items-center gap-1.5">
            DAYLOG <span className="text-accent text-xs px-1.5 py-0.5 rounded bg-accent/10 border border-accent/30">AI</span>
          </h1>
          <p className="text-[10px] text-secondary">Local-First Journal</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Offline / Online indicator */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isOnline
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-accent/10 text-accent border-accent/30'
          }`}
          title={isOnline ? 'Online (Pronto para IA)' : 'Offline (Modo Local Ativo)'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Local</span>
            </>
          )}
        </div>

        {/* Reports shortcut */}
        <button
          onClick={onOpenReports}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors border border-border"
          aria-label="Relatórios"
          title="Relatórios e Insights"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors border border-border"
          aria-label="Configurações"
          title="Configurações e Backup"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
