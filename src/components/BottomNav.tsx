'use client';

import React from 'react';
import { Home, Calendar, CheckSquare, MessageSquare, Mic } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'timeline' | 'tasks' | 'memory' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenRecord: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenRecord,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-graphite/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center justify-around select-none">
      {/* Dashboard */}
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
          activeTab === 'dashboard'
            ? 'text-accent'
            : 'text-secondary hover:text-primary active:scale-95'
        }`}
        aria-label="Início"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium">Início</span>
      </button>

      {/* Timeline */}
      <button
        onClick={() => onTabChange('timeline')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
          activeTab === 'timeline'
            ? 'text-accent'
            : 'text-secondary hover:text-primary active:scale-95'
        }`}
        aria-label="Linha do Tempo"
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium">Histórico</span>
      </button>

      {/* Center Voice Record Button */}
      <div className="relative -top-5 flex flex-col items-center">
        <button
          onClick={onOpenRecord}
          className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-background flex items-center justify-center shadow-lg shadow-accent/25 active:scale-90 transition-transform focus:outline-none border-2 border-background"
          aria-label="Gravar Novo Relato"
        >
          <Mic className="w-7 h-7 stroke-[2.5]" />
        </button>
        <span className="text-[10px] font-semibold text-accent mt-0.5">Gravar</span>
      </div>

      {/* Tasks */}
      <button
        onClick={() => onTabChange('tasks')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
          activeTab === 'tasks'
            ? 'text-accent'
            : 'text-secondary hover:text-primary active:scale-95'
        }`}
        aria-label="Tarefas"
      >
        <CheckSquare className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium">Tarefas</span>
      </button>

      {/* AI Memory */}
      <button
        onClick={() => onTabChange('memory')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
          activeTab === 'memory'
            ? 'text-accent'
            : 'text-secondary hover:text-primary active:scale-95'
        }`}
        aria-label="Memória IA"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium">Memória</span>
      </button>
    </nav>
  );
};
