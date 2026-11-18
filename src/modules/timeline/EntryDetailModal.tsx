'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  Calendar,
  Volume2,
  Tag,
  Users,
  CheckSquare,
} from 'lucide-react';
import { DailyEntry, AudioRecording, Category, Task } from '@/types';
import { db } from '@/services/database';
import { formatDateBR, formatAudioDuration } from '@/lib/utils';

interface EntryDetailModalProps {
  entry: DailyEntry | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onEntryUpdated: (updated: DailyEntry) => void;
  onEntryDeleted: (id: string) => void;
  onTriggerAI: (entry: DailyEntry) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  categories,
  isOpen,
  onClose,
  onEntryUpdated,
  onEntryDeleted,
  onTriggerAI,
}) => {
  const [audioRecording, setAudioRecording] = useState<AudioRecording | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [associatedTasks, setAssociatedTasks] = useState<Task[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!entry) return;
    setEditedText(entry.rawText);
    setEditedTitle(entry.title);
    setIsEditing(false);

    // Load audio if associated
    if (entry.audioId) {
      db.audio_recordings.get(entry.audioId).then((rec) => {
        if (rec) {
          setAudioRecording(rec);
          const url = URL.createObjectURL(rec.blob);
          setAudioUrl(url);
        }
      });
    } else {
      setAudioRecording(null);
      setAudioUrl(null);
    }

    // Load tasks linked to this entry
    db.tasks.where('entryId').equals(entry.id).toArray().then((tasks) => {
      setAssociatedTasks(tasks);
    });

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [entry]);

  if (!isOpen || !entry) return null;

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSaveEdits = async () => {
    if (!entry) return;
    setIsSaving(true);
    try {
      const updated: DailyEntry = {
        ...entry,
        title: editedTitle.trim() || entry.title,
        rawText: editedText.trim(),
        updatedAt: Date.now(),
      };
      await db.daily_entries.put(updated);

      // Also update transcription record if present
      if (entry.transcriptionId) {
        await db.transcriptions.update(entry.transcriptionId, {
          text: editedText.trim(),
          isEdited: true,
        });
      }

      onEntryUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este relato? O áudio e as transcrições também serão removidos.')) {
      return;
    }

    try {
      if (entry.audioId) {
        await db.audio_recordings.delete(entry.audioId);
      }
      if (entry.transcriptionId) {
        await db.transcriptions.delete(entry.transcriptionId);
      }
      await db.tasks.where('entryId').equals(entry.id).delete();
      await db.entry_people.where('entryId').equals(entry.id).delete();
      await db.ai_memory_index.where('entryId').equals(entry.id).delete();
      await db.daily_entries.delete(entry.id);

      onEntryDeleted(entry.id);
      onClose();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-graphite rounded-t-3xl sm:rounded-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-accent">
              {formatDateBR(entry.date)}
            </span>
            <span className="text-xs text-secondary">•</span>
            <span className="text-[11px] text-secondary font-mono">
              {new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
              title={isEditing ? 'Cancelar edição' : 'Editar texto'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-secondary hover:text-destructive hover:bg-surface transition-colors"
              title="Excluir relato"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Audio Player Card if exists */}
          {audioUrl && audioRecording && (
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlayAudio}
                  className="w-10 h-10 rounded-full bg-accent/20 hover:bg-accent/30 text-accent flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 fill-accent" />
                  )}
                </button>
                <div>
                  <p className="text-xs font-semibold text-primary">Gravação de Voz</p>
                  <p className="text-[11px] text-secondary font-mono">
                    {formatAudioDuration(audioRecording.duration)} • {(audioRecording.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Volume2 className="w-4 h-4 text-accent mr-2" />
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Title View or Edit */}
          {isEditing ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Título
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-primary focus:border-accent outline-none"
              />
            </div>
          ) : (
            <h2 className="text-base font-bold text-primary">{entry.title}</h2>
          )}

          {/* Summary if AI organized */}
          {entry.summary && !isEditing && (
            <div className="p-3 rounded-xl bg-surface-subtle border border-border/80 space-y-1">
              <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                <Sparkles className="w-3 h-3 fill-accent" />
                <span>Resumo da IA</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{entry.summary}</p>
            </div>
          )}

          {/* Raw Text / Transcription */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Relato Original
            </label>
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-xs text-primary focus:border-accent outline-none resize-none leading-relaxed"
              />
            ) : (
              <div className="p-3.5 rounded-xl bg-surface border border-border text-xs text-primary leading-relaxed whitespace-pre-wrap">
                {entry.rawText || '(Sem transcrição de texto)'}
              </div>
            )}
          </div>

          {/* Linked Tasks */}
          {associatedTasks.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center space-x-1">
                <CheckSquare className="w-3 h-3 text-accent" />
                <span>Tarefas Relacionadas ({associatedTasks.length})</span>
              </label>
              <div className="space-y-1.5">
                {associatedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-surface border border-border text-xs text-primary flex items-center justify-between"
                  >
                    <span>{t.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        t.status === 'completed'
                          ? 'bg-success/15 text-success'
                          : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {t.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-border bg-graphite/95 flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-border text-secondary text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                disabled={isSaving}
                onClick={handleSaveEdits}
                className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-accent/20"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onClose();
                onTriggerAI(entry);
              }}
              className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/20 transition-all"
            >
              <Sparkles className="w-4 h-4 fill-background" />
              <span>{entry.aiOrganized ? 'Reorganizar com IA' : 'Organizar com IA'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
