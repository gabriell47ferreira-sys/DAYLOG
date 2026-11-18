'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Tag,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { DailyEntry, Task, Category, Person } from '@/types';
import { formatDateBR } from '@/lib/utils';
import { db } from '@/services/database';

interface ReportsViewProps {
  entries: DailyEntry[];
  tasks: Task[];
  categories: Category[];
  people: Person[];
  onBack: () => void;
  onSelectEntry: (entry: DailyEntry) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  entries,
  tasks,
  categories,
  people,
  onBack,
  onSelectEntry,
}) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [aiReportSummary, setAiReportSummary] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Filter entries according to period
  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return entries.filter((e) => {
      if (period === 'week') {
        return now - e.createdAt <= 7 * dayMs;
      }
      if (period === 'month') {
        return now - e.createdAt <= 30 * dayMs;
      }
      return true;
    });
  }, [entries, period]);

  // Tasks in period
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'todo');

  // Category frequency
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredEntries) {
      for (const catId of e.categoryIds) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([id, count]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          id,
          name: cat?.name || 'Geral',
          color: cat?.color || '#F59E0B',
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries, categories]);

  const handleGenerateAISummary = async () => {
    if (filteredEntries.length === 0) return;
    setIsGeneratingAI(true);
    try {
      const snippets = filteredEntries.map((e) => `${e.date} (${e.title}): ${e.summary || e.rawText}`).join('\n\n');
      const userSettings = await db.user_settings.get('default');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Gere um relatório executivo estruturado com os principais acontecimentos, conquistas e focos de atenção com base nos seguintes relatos do período (${period}):\n\n${snippets}`,
          contextSnippets: filteredEntries.map((e) => ({
            id: e.id,
            date: e.date,
            title: e.title,
            content: (e.summary || e.rawText).substring(0, 250),
          })),
          consent: true,
          userApiKey: userSettings?.userApiKey,
          provider: userSettings?.aiProvider || 'gemini',
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        setAiReportSummary(resJson.answer);
      }
    } catch (err) {
      console.error('Error generating AI report:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span>Relatórios & Sínteses</span>
        </h2>
        <div className="w-12" />
      </div>

      {/* Period Selector */}
      <div className="flex bg-surface p-1 rounded-xl border border-border">
        <button
          onClick={() => setPeriod('week')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            period === 'week' ? 'bg-accent text-background shadow' : 'text-secondary hover:text-primary'
          }`}
        >
          Semanal
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            period === 'month' ? 'bg-accent text-background shadow' : 'text-secondary hover:text-primary'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            period === 'all' ? 'bg-accent text-background shadow' : 'text-secondary hover:text-primary'
          }`}
        >
          Geral
        </button>
      </div>

      {/* Key Numbers Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-surface border border-border text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Relatos</span>
          <p className="text-xl font-bold text-accent font-mono">{filteredEntries.length}</p>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Pendentes</span>
          <p className="text-xl font-bold text-primary font-mono">{pendingTasks.length}</p>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Concluídas</span>
          <p className="text-xl font-bold text-success font-mono">{completedTasks.length}</p>
        </div>
      </div>

      {/* AI Period Synthesis */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-accent">
            <Sparkles className="w-4 h-4 fill-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Síntese Inteligente do Período</h3>
          </div>
          <button
            disabled={isGeneratingAI || filteredEntries.length === 0}
            onClick={handleGenerateAISummary}
            className="px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent text-[11px] font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40"
          >
            {isGeneratingAI ? 'Gerando...' : 'Gerar com IA'}
          </button>
        </div>

        {aiReportSummary ? (
          <div className="p-3.5 rounded-xl bg-graphite border border-border/70 text-xs text-primary leading-relaxed whitespace-pre-wrap">
            {aiReportSummary}
          </div>
        ) : (
          <p className="text-xs text-secondary leading-relaxed">
            Gera uma síntese narrativa e estruturada cruzando todos os relatos do período selecionado.
          </p>
        )}
      </div>

      {/* Category distribution */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          <span>Categorias Mais Frequentes</span>
        </h3>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-secondary/60 italic">Nenhuma categoria registrada no período.</p>
        ) : (
          <div className="space-y-2">
            {categoryStats.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">{cat.name}</span>
                  <span className="text-secondary font-mono text-[11px]">{cat.count} relatos</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-graphite overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(100, (cat.count / Math.max(1, filteredEntries.length)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* People mentioned summary */}
      {people.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>Pessoas Mais Mencionadas</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {people.slice(0, 8).map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 rounded-lg bg-graphite border border-border text-xs text-primary flex items-center gap-1.5"
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-accent font-mono">({p.mentionCount})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
