'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Task, DailyEntry } from '@/types';
import { generateId, formatDateBR } from '@/lib/utils';
import { db } from '@/services/database';

interface TasksViewProps {
  tasks: Task[];
  entries: DailyEntry[];
  onTasksChanged: () => void;
  onSelectEntry: (entry: DailyEntry) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  entries,
  onTasksChanged,
  onSelectEntry,
}) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'completed'>('todo');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState<string>('');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'todo') return t.status === 'todo';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task: Task = {
      id: generateId(),
      title: newTitle.trim(),
      priority: newPriority,
      dueDate: newDueDate || undefined,
      status: 'todo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.tasks.add(task);
    setNewTitle('');
    setNewDueDate('');
    setNewPriority('medium');
    setIsCreating(false);
    onTasksChanged();
  };

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'todo' ? 'completed' : 'todo';
    await db.tasks.update(task.id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    onTasksChanged();
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
    onTasksChanged();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-accent" />
            <span>Tarefas & Pendências</span>
          </h2>
          <p className="text-xs text-secondary">
            Organizadas manualmente ou extraídas dos relatos
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold transition-all flex items-center gap-1 shadow-md shadow-accent/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="text-xs">Nova</span>
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('todo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            filter === 'todo'
              ? 'bg-accent text-background border-accent'
              : 'bg-surface text-secondary border-border'
          }`}
        >
          Pendentes ({tasks.filter((t) => t.status === 'todo').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            filter === 'completed'
              ? 'bg-accent text-background border-accent'
              : 'bg-surface text-secondary border-border'
          }`}
        >
          Concluídas ({tasks.filter((t) => t.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            filter === 'all'
              ? 'bg-accent text-background border-accent'
              : 'bg-surface text-secondary border-border'
          }`}
        >
          Todas ({tasks.length})
        </button>
      </div>

      {/* Create Task Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateTask}
          className="p-4 rounded-2xl bg-surface border border-accent/40 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">
              Criar Nova Tarefa
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 text-secondary hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="O que você precisa fazer?"
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-graphite border border-border text-xs text-primary focus:border-accent outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase">Prioridade</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-2 py-1.5 mt-0.5 rounded-xl bg-graphite border border-border text-xs text-primary outline-none focus:border-accent"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta (Urgente)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase">Prazo (opcional)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-2 py-1.5 mt-0.5 rounded-xl bg-graphite border border-border text-xs text-primary outline-none focus:border-accent"
              >
              </input>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-accent text-background text-xs font-bold shadow-md shadow-accent/20"
          >
            Adicionar Tarefa
          </button>
        </form>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 rounded-2xl bg-surface/50 border border-border/60 text-center space-y-2">
          <p className="text-xs text-secondary">
            {filter === 'todo'
              ? 'Tudo em dia! Nenhuma tarefa pendente.'
              : 'Nenhuma tarefa encontrada neste filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const originEntry = task.entryId
              ? entries.find((e) => e.id === task.entryId)
              : null;

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-xl bg-surface border border-border flex items-start justify-between space-x-3 transition-colors"
              >
                <div className="flex items-start space-x-3 overflow-hidden">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      task.status === 'completed'
                        ? 'bg-accent border-accent text-background'
                        : 'border-border hover:border-accent text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="space-y-1 overflow-hidden">
                    <p
                      className={`text-xs font-medium leading-snug break-words ${
                        task.status === 'completed'
                          ? 'line-through text-secondary'
                          : 'text-primary'
                      }`}
                    >
                      {task.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px]">
                      {task.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30 font-semibold">
                          Urgente
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-secondary flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-accent" />
                          {formatDateBR(task.dueDate)}
                        </span>
                      )}
                      {originEntry && (
                        <button
                          type="button"
                          onClick={() => onSelectEntry(originEntry)}
                          className="text-accent hover:underline flex items-center gap-0.5"
                        >
                          <span>Origem: {originEntry.title.substring(0, 20)}...</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-secondary hover:text-destructive shrink-0"
                  title="Excluir tarefa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
