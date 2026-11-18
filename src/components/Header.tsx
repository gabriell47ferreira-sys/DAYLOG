'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Settings, Wifi, WifiOff, Smartphone } from 'lucide-react';
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

      <div className="flex items-center space-x-1.5">
        {/* Install App Quick Pill */}
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/40 text-accent text-[11px] font-semibold hover:bg-accent/25 transition-colors"
          title="Instalar Aplicativo no Celular"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>

        {/* Reports shortcut */}
        <button
          onClick={onOpenReports}
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors border border-border"
          aria-label="Relatórios"
          title="Relatórios e Insights"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary transition-colors border border-border"
          aria-label="Configurações"
          title="Configurações e Backup"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
