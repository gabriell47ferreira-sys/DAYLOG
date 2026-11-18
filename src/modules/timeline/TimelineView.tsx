'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  Filter,
  Volume2,
  Sparkles,
  ChevronRight,
  X,
  Tag,
} from 'lucide-react';
import { DailyEntry, Category } from '@/types';
import { formatDateBR } from '@/lib/utils';

interface TimelineViewProps {
  entries: DailyEntry[];
  categories: Category[];
  onSelectEntry: (entry: DailyEntry) => void;
  onOpenRecord: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  categories,
  onSelectEntry,
  onOpenRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'daily' | 'monthly'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Search Query filter (matches title, rawText, summary, tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = entry.title.toLowerCase().includes(query);
        const inText = entry.rawText.toLowerCase().includes(query);
        const inSummary = entry.summary?.toLowerCase().includes(query) || false;
        if (!inTitle && !inText && !inSummary) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategoryId) {
        if (!entry.categoryIds.includes(selectedCategoryId)) {
          return false;
        }
      }

      // 3. Date filter if set
      if (selectedDate) {
        if (entry.date !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [entries, searchQuery, selectedCategoryId, selectedDate]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bottom-nav-safe">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <span>Histórico & Linha do Tempo</span>
        </h2>
        <span className="text-xs text-secondary font-mono">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'relato' : 'relatos'}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-secondary absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por palavras, pessoas, ideias..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface border border-border text-xs text-primary placeholder:text-secondary/60 focus:border-accent outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-secondary hover:text-primary p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Date picker quick filter */}
      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface border border-border text-xs text-secondary px-3 py-1.5 rounded-xl outline-none focus:border-accent"
        />
        {selectedDate && (
          <button
            onClick={() => setSelectedDate('')}
            className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
          >
            Limpar data
          </button>
        )}
      </div>

      {/* Categories chips horizontal scroll */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
            selectedCategoryId === null
              ? 'bg-accent text-background border-accent font-semibold'
              : 'bg-surface text-secondary border-border hover:border-accent/40'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
              selectedCategoryId === cat.id
                ? 'bg-accent text-background border-accent font-semibold'
                : 'bg-surface text-secondary border-border hover:border-accent/40'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-surface/40 border border-border/60 text-center space-y-3">
          <p className="text-xs text-secondary">
            Nenhum registro encontrado para este filtro ou busca.
          </p>
          <button
            onClick={onOpenRecord}
            className="px-4 py-2 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/25 transition-colors"
          >
            Gravar Novo Relato
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="p-4 rounded-2xl bg-surface border border-border hover:border-accent/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-accent">
                  {formatDateBR(entry.date)}
                </span>
                <div className="flex items-center space-x-1.5">
                  {entry.audioId && (
                    <span className="p-1 rounded-md bg-surface-subtle text-secondary" title="Possui áudio original">
                      <Volume2 className="w-3.5 h-3.5 text-accent" />
                    </span>
                  )}
                  {entry.aiOrganized && (
                    <span className="p-1 rounded-md bg-accent/15 text-accent" title="Organizado por IA">
                      <Sparkles className="w-3.5 h-3.5 fill-accent" />
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                {entry.title}
              </h3>

              <p className="text-xs text-secondary line-clamp-3 leading-relaxed">
                {entry.summary || entry.rawText}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-wrap gap-1">
                  {entry.categoryIds.slice(0, 2).map((catId) => {
                    const catObj = categories.find((c) => c.id === catId);
                    return (
                      <span
                        key={catId}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-graphite border border-border text-secondary"
                      >
                        {catObj?.name || 'Geral'}
                      </span>
                    );
                  })}
                </div>
                <ChevronRight className="w-4 h-4 text-secondary/60 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
