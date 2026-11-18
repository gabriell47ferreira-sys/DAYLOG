'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Tag,
  Users,
  CheckSquare,
  Lightbulb,
  DollarSign,
  Calendar,
  Lock,
} from 'lucide-react';
import { DailyEntry, AIOrganizationResult, Task, Person } from '@/types';
import { db } from '@/services/database';
import { generateId } from '@/lib/utils';
import { extractHeuristicOrganization } from '@/services/ai/localParser';

interface AIOrganizerModalProps {
  isOpen: boolean;
  entry: DailyEntry | null;
  onClose: () => void;
  onComplete: (updatedEntry: DailyEntry) => void;
}

export const AIOrganizerModal: React.FC<AIOrganizerModalProps> = ({
  isOpen,
  entry,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<'consent' | 'processing' | 'review'>('consent');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [organizedData, setOrganizedData] = useState<AIOrganizationResult | null>(null);
  const [sourceNotice, setSourceNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable review states
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableSummary, setEditableSummary] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [extractedTasks, setExtractedTasks] = useState<{ title: string; priority: 'low' | 'medium' | 'high'; dueDate?: string }[]>([]);

  if (!isOpen || !entry) return null;

  const handleStartProcessing = async (allowExternalAI: boolean) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setStep('processing');

    try {
      if (!allowExternalAI) {
        // Run purely client-side local extraction
        const localResult = extractHeuristicOrganization(entry.rawText);
        setupReview(localResult, 'Processamento local sem conexão externa');
        return;
      }

      // Check user settings for API key
      const userSettings = await db.user_settings.get('default');

      const response = await fetch('/api/ai/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: entry.rawText,
          consent: true,
          userApiKey: userSettings?.userApiKey,
          provider: userSettings?.aiProvider || 'gemini',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha no serviço de IA externa.');
      }

      const resJson = await response.json();
      const result: AIOrganizationResult = resJson.data;
      const notice = resJson.warning || (resJson.source === 'gemini' ? 'Organizado com Gemini 1.5' : 'Organizado com IA');
      setupReview(result, notice);
    } catch (err: unknown) {
      console.warn('AI remote error, falling back locally:', err);
      // Fallback locally
      const fallback = extractHeuristicOrganization(entry.rawText);
      setupReview(fallback, 'Organização gerada pelo motor local seguro');
    } finally {
      setIsProcessing(false);
    }
  };

  const setupReview = (data: AIOrganizationResult, notice: string) => {
    setOrganizedData(data);
    setSourceNotice(notice);
    setEditableTitle(data.title || entry.title);
    setEditableSummary(data.summary || '');
    setSelectedCategories(data.categories || ['Pessoal']);
    setExtractedTasks(data.tasks || []);
    setStep('review');
  };

  const handleConfirmSave = async () => {
    if (!entry) return;
    setIsProcessing(true);

    try {
      // 1. Save or update Categories
      const categoryIds: string[] = [];
      for (const catName of selectedCategories) {
        const existing = await db.categories.where('name').equalsIgnoreCase(catName).first();
        if (existing) {
          categoryIds.push(existing.id);
        } else {
          const newCat = {
            id: generateId(),
            name: catName,
            color: '#F59E0B',
            isDefault: false,
          };
          await db.categories.add(newCat);
          categoryIds.push(newCat.id);
        }
      }

      // 2. Save People mentioned
      const peopleIds: string[] = [];
      if (organizedData?.people && organizedData.people.length > 0) {
        for (const personName of organizedData.people) {
          const existingPerson = await db.people.where('name').equalsIgnoreCase(personName).first();
          if (existingPerson) {
            await db.people.update(existingPerson.id, {
              mentionCount: existingPerson.mentionCount + 1,
              lastMentionedAt: Date.now(),
            });
            peopleIds.push(existingPerson.id);
          } else {
            const newPerson: Person = {
              id: generateId(),
              name: personName,
              mentionCount: 1,
              firstMentionedAt: Date.now(),
              lastMentionedAt: Date.now(),
            };
            await db.people.add(newPerson);
            peopleIds.push(newPerson.id);
          }

          // Association table
          await db.entry_people.add({
            id: generateId(),
            entryId: entry.id,
            personId: peopleIds[peopleIds.length - 1],
          });
        }
      }

      // 3. Create generated Tasks linked to this entry
      for (const taskItem of extractedTasks) {
        const newTask: Task = {
          id: generateId(),
          entryId: entry.id,
          title: taskItem.title,
          priority: taskItem.priority,
          dueDate: taskItem.dueDate,
          status: 'todo',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.tasks.add(newTask);
      }

      // 4. Update the DailyEntry itself
      const updatedEntry: DailyEntry = {
        ...entry,
        title: editableTitle || entry.title,
        summary: editableSummary,
        categoryIds: categoryIds.length > 0 ? categoryIds : entry.categoryIds,
        peopleIds,
        aiOrganized: true,
        aiOrganizedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.daily_entries.put(updatedEntry);

      // 5. Index for AI Memory
      await db.ai_memory_index.put({
        id: generateId(),
        entryId: entry.id,
        keywords: [
          ...selectedCategories,
          ...(organizedData?.ideas || []),
          ...(organizedData?.datesMentioned || []),
        ],
        entities: [
          ...(organizedData?.people || []),
          ...(organizedData?.locations || []),
        ],
        lastIndexedAt: Date.now(),
      });

      onComplete(updatedEntry);
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(`Erro ao salvar organização: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeTask = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-graphite rounded-t-3xl sm:rounded-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-accent fill-accent" />
            <h2 className="text-sm font-semibold text-primary">Organizador Inteligente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-secondary hover:text-primary hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: PRIVACY & CONSENT */}
          {step === 'consent' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-center space-x-2.5 text-accent">
                  <Lock className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Privacidade Local-First</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Por padrão, seu diário é 100% privado e reside apenas neste dispositivo.
                  Para extrair tópicos, pessoas e tarefas avançadas com IA, você pode autorizar o envio apenas deste relato para processamento seguro no servidor, ou escolher a organização 100% local no aparelho.
                </p>
                <div className="p-2.5 rounded-xl bg-graphite/70 border border-border text-[11px] text-secondary/80">
                  <span className="font-medium text-primary">Relato a processar:</span> &quot;{entry.rawText.substring(0, 100)}...&quot;
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleStartProcessing(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/20 transition-all"
                >
                  <Sparkles className="w-4 h-4 fill-background" />
                  <span>Autorizar e Organizar com IA</span>
                </button>

                <button
                  onClick={() => handleStartProcessing(false)}
                  className="w-full py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Lock className="w-4 h-4 text-secondary" />
                  <span>Organizar 100% Offline (Local)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING LOADER */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs text-secondary font-medium animate-pulse">
                Identificando acontecimentos, tarefas e pessoas...
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT */}
          {step === 'review' && organizedData && (
            <div className="space-y-4">
              {sourceNotice && (
                <div className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[11px] text-accent flex items-center justify-between">
                  <span>{sourceNotice}</span>
                  <span className="text-[10px] text-secondary">Revise antes de salvar</span>
                </div>
              )}

              {/* Title Edit */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Título Sugerido
                </label>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-primary focus:border-accent outline-none"
                />
              </div>

              {/* Summary Edit */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Resumo
                </label>
                <textarea
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-secondary focus:border-accent outline-none resize-none"
                />
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center space-x-1">
                  <Tag className="w-3 h-3 text-accent" />
                  <span>Categorias Detectadas</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategories.map((cat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-primary font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* People Identified */}
              {organizedData.people && organizedData.people.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center space-x-1">
                    <Users className="w-3 h-3 text-accent" />
                    <span>Pessoas Mencionadas</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {organizedData.people.map((p, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Extracted */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center space-x-1">
                  <CheckSquare className="w-3 h-3 text-accent" />
                  <span>Tarefas Identificadas ({extractedTasks.length})</span>
                </label>
                {extractedTasks.length === 0 ? (
                  <p className="text-xs text-secondary/60 italic">Nenhuma tarefa detectada neste relato.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {extractedTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.priority === 'high' ? 'bg-destructive' : 'bg-accent'
                            }`}
                          />
                          <span className="text-primary font-medium">{t.title}</span>
                        </div>
                        <button
                          onClick={() => removeTask(idx)}
                          className="text-secondary hover:text-destructive p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ideas or Expenses */}
              {organizedData.ideas && organizedData.ideas.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center space-x-1">
                    <Lightbulb className="w-3 h-3 text-yellow-400" />
                    <span>Ideias & Reflexões</span>
                  </label>
                  <ul className="text-xs text-secondary space-y-1 pl-1">
                    {organizedData.ideas.map((idea, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-accent">•</span>
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {organizedData.expensesMentioned && organizedData.expensesMentioned.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    <span>Valores Mencionados</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {organizedData.expensesMentioned.map((exp, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="px-5 py-4 border-t border-border bg-graphite/95 flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-border text-secondary hover:text-primary text-xs font-semibold transition-all"
            >
              Descartar
            </button>
            <button
              disabled={isProcessing}
              onClick={handleConfirmSave}
              className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/20 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar Organização</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
