'use client';

import React from 'react';
import {
  Mic,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Tag,
  Volume2,
} from 'lucide-react';
import { DailyEntry, Task } from '@/types';
import { getGreeting, formatDateBR } from '@/lib/utils';
import { ActiveTab } from '@/components/BottomNav';

interface DashboardViewProps {
  userName: string;
  todayEntry: DailyEntry | null;
  recentEntries: DailyEntry[];
  pendingTasks: Task[];
  onOpenRecord: () => void;
  onSelectEntry: (entry: DailyEntry) => void;
  onNavigate: (tab: ActiveTab) => void;
  onToggleTask: (taskId: string, currentStatus: 'todo' | 'completed') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userName,
  todayEntry,
  recentEntries,
  pendingTasks,
  onOpenRecord,
  onSelectEntry,
  onNavigate,
  onToggleTask,
}) => {
  const greeting = getGreeting();
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bottom-nav-safe">
      {/* 1. Header & Greeting */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs text-secondary font-medium capitalize">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <span>{todayFormatted}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-primary">
          {greeting}, <span className="text-accent">{userName}</span>
        </h2>
        <p className="text-xs text-secondary">
          {todayEntry
            ? 'Você já registrou parte do seu dia. Quer acrescentar algo?'
            : 'Como foi o seu dia até agora? Registre suas ideias e acontecimentos.'}
        </p>
      </div>

      {/* 2. Primary Record Call to Action */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-graphite to-surface border border-border shadow-xl">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-accent/10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="space-y-1 max-w-[200px]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-accent">
              Voz Primeiro
            </span>
            <h3 className="text-base font-bold text-primary">
              {todayEntry ? 'Atualizar Registro' : 'Registrar meu dia'}
            </h3>
            <p className="text-[11px] text-secondary">
              Grave em segundos. A IA organiza acontecimentos e tarefas.
            </p>
          </div>

          <button
            onClick={onOpenRecord}
            className="w-14 h-14 rounded-2xl bg-accent hover:bg-accent-hover text-background flex items-center justify-center shadow-lg shadow-accent/25 active:scale-95 transition-all"
            aria-label="Gravar áudio do dia"
          >
            <Mic className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 3. Today's Entry Overview (if exists) */}
      {todayEntry && (
        <div
          onClick={() => onSelectEntry(todayEntry)}
          className="p-4 rounded-2xl bg-surface border border-accent/30 hover:border-accent/60 transition-all cursor-pointer space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Registro de Hoje
            </span>
            <span className="text-[10px] text-secondary font-mono">
              {new Date(todayEntry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-primary">{todayEntry.title}</h4>

          <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
            {todayEntry.summary || todayEntry.rawText}
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              {todayEntry.audioId && (
                <span className="px-2 py-0.5 rounded bg-surface-subtle border border-border text-[10px] text-secondary flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-accent" />
                  Áudio
                </span>
              )}
              {todayEntry.aiOrganized && (
                <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-[10px] text-accent flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-accent" />
                  Organizado
                </span>
              )}
            </div>
            <span className="text-xs text-accent flex items-center gap-1 font-medium">
              Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}

      {/* 4. Pending Tasks Widget */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            <span>Tarefas Pendentes ({pendingTasks.length})</span>
          </h3>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
          >
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-4 rounded-xl bg-surface/50 border border-border/60 text-center text-xs text-secondary">
            Nenhuma tarefa pendente no momento. Bom trabalho!
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden pr-2">
                  <button
                    onClick={() => onToggleTask(task.id, task.status)}
                    className="w-5 h-5 rounded-lg border border-border hover:border-accent flex items-center justify-center shrink-0 transition-colors"
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </button>
                  <span className="text-xs text-primary font-medium truncate">
                    {task.title}
                  </span>
                </div>
                {task.priority === 'high' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                    Urgente
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. AI Memory Quick Consultation Widget */}
      <div
        onClick={() => onNavigate('memory')}
        className="p-4 rounded-2xl bg-surface border border-border hover:border-accent/40 transition-all cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Sparkles className="w-5 h-5 fill-accent" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary">Memória Inteligente</h4>
            <p className="text-[11px] text-secondary">
              Pergunte: &quot;O que aconteceu ontem?&quot; ou &quot;Quais ideias tive?&quot;
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-secondary" />
      </div>

      {/* 6. Recent Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Últimos Registros</span>
          </h3>
          <button
            onClick={() => onNavigate('timeline')}
            className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
          >
            Histórico completo <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="p-6 rounded-2xl bg-surface/50 border border-border/60 text-center space-y-2">
            <p className="text-xs text-secondary">Nenhum relato salvo ainda.</p>
            <p className="text-[11px] text-secondary/60">
              Toque no botão central abaixo para gravar seu primeiro dia!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentEntries.slice(0, 4).map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="p-3.5 rounded-xl bg-surface border border-border hover:border-border/80 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-accent">
                    {formatDateBR(entry.date)}
                  </span>
                  {entry.audioId && (
                    <Volume2 className="w-3.5 h-3.5 text-secondary" />
                  )}
                </div>

                <h4 className="text-xs font-semibold text-primary truncate">
                  {entry.title}
                </h4>

                <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                  {entry.summary || entry.rawText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
