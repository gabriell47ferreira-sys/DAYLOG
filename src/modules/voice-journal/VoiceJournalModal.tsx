'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Check,
  FileText,
  Volume2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { AudioRecordingService } from '@/services/audio/recorder';
import { SpeechTranscriptionService } from '@/services/transcription/speech';
import { formatAudioDuration, generateId, getTodayDateString } from '@/lib/utils';
import { db } from '@/services/database';
import { AudioRecording, DailyEntry } from '@/types';

interface VoiceJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntrySaved: (entry: DailyEntry) => void;
  onTriggerAIOrganize?: (entry: DailyEntry) => void;
}

export const VoiceJournalModal: React.FC<VoiceJournalModalProps> = ({
  isOpen,
  onClose,
  onEntrySaved,
  onTriggerAIOrganize,
}) => {
  const [recorderService] = useState(() => new AudioRecordingService());
  const [transcriberService] = useState(() => new SpeechTranscriptionService());

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [savedAudio, setSavedAudio] = useState<AudioRecording | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Check Web Speech support
  const isSpeechSupported = SpeechTranscriptionService.isSupported();

  useEffect(() => {
    return () => {
      // Clean up when unmounting
      recorderService.cancelRecording();
      transcriberService.stopRecognition();
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [recorderService, transcriberService, audioBlobUrl]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setErrorMsg(null);
    try {
      await recorderService.startRecording({
        onDurationUpdate: (d) => setDuration(d),
        onVolumeUpdate: (v) => setAudioLevel(v),
      });
      setRecordingState('recording');

      // Start Web Speech transcription if supported
      if (isSpeechSupported) {
        transcriberService.startRecognition({
          language: 'pt-BR',
          onInterimResult: (full, interim) => {
            setTranscriptionText(full);
            setInterimText(interim);
          },
          onError: (err) => {
            console.warn('Speech recognition warning:', err);
          },
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Falha ao acessar o microfone.');
      setRecordingState('idle');
    }
  };

  const handlePause = () => {
    recorderService.pauseRecording();
    setRecordingState('paused');
  };

  const handleResume = () => {
    recorderService.resumeRecording();
    setRecordingState('recording');
  };

  const handleStop = async () => {
    try {
      const finalTranscribed = transcriberService.stopRecognition();
      if (finalTranscribed) {
        setTranscriptionText(finalTranscribed);
      }
      setInterimText('');

      const audio = await recorderService.stopRecording();
      setSavedAudio(audio);
      const url = URL.createObjectURL(audio.blob);
      setAudioBlobUrl(url);
      setRecordingState('review');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Erro ao processar gravação.');
      setRecordingState('idle');
    }
  };

  const handleCancel = () => {
    recorderService.cancelRecording();
    transcriberService.stopRecognition();
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
    }
    setRecordingState('idle');
    setDuration(0);
    setAudioLevel(0);
    setTranscriptionText('');
    setSavedAudio(null);
    setAudioBlobUrl(null);
    onClose();
  };

  const handleSaveAndOrganize = async (triggerAI: boolean = false) => {
    if (!transcriptionText.trim() && !savedAudio) {
      setErrorMsg('Adicione uma gravação de voz ou digite seu relato.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const entryId = generateId();
      const today = getTodayDateString();

      // Save transcription if we have text
      let transcriptionId: string | undefined = undefined;
      if (transcriptionText.trim()) {
        const transRecord = await SpeechTranscriptionService.saveTranscription({
          entryId,
          audioId: savedAudio?.id,
          text: transcriptionText.trim(),
          source: savedAudio ? 'web_speech' : 'manual',
          language: 'pt-BR',
        });
        transcriptionId = transRecord.id;
      }

      // Link audio to this entry if recorded
      if (savedAudio) {
        await db.audio_recordings.update(savedAudio.id, { entryId });
      }

      // Auto-extract preliminary title
      const cleanText = transcriptionText.trim();
      const defaultTitle = cleanText
        ? cleanText.split(/[.?!]/)[0]?.substring(0, 45) || 'Registro do Dia'
        : 'Relato em Áudio';

      const newEntry: DailyEntry = {
        id: entryId,
        date: today,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: defaultTitle,
        rawText: cleanText,
        audioId: savedAudio?.id,
        transcriptionId,
        categoryIds: ['cat-personal'],
        aiOrganized: false,
      };

      await db.daily_entries.add(newEntry);
      onEntrySaved(newEntry);

      if (triggerAI && onTriggerAIOrganize) {
        onTriggerAIOrganize(newEntry);
      }

      handleCancel();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(`Erro ao salvar relato: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-graphite rounded-t-3xl sm:rounded-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h2 className="text-sm font-semibold text-primary">Diário de Voz</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded-full text-secondary hover:text-primary hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start space-x-2 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RECORDING / IDLE STATE */}
          {recordingState !== 'review' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              {/* Visual Timer and Pulse */}
              <div className="relative flex items-center justify-center">
                {recordingState === 'recording' && (
                  <div
                    className="absolute rounded-full bg-accent/20 transition-all duration-150"
                    style={{
                      width: `${120 + audioLevel * 1.2}px`,
                      height: `${120 + audioLevel * 1.2}px`,
                    }}
                  />
                )}
                <div
                  className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center z-10 transition-colors ${
                    recordingState === 'recording'
                      ? 'border-accent bg-accent/10 recording-glow'
                      : recordingState === 'paused'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-border bg-surface'
                  }`}
                >
                  <span className="text-2xl font-mono font-bold text-primary">
                    {formatAudioDuration(duration)}
                  </span>
                  <span className="text-[10px] text-secondary mt-1">
                    {recordingState === 'recording'
                      ? 'Gravando...'
                      : recordingState === 'paused'
                      ? 'Pausado'
                      : 'Toque para gravar'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                {recordingState === 'idle' ? (
                  <button
                    onClick={handleStart}
                    className="w-16 h-16 rounded-full bg-accent hover:bg-accent-hover text-background flex items-center justify-center shadow-lg shadow-accent/25 active:scale-95 transition-all"
                  >
                    <Mic className="w-8 h-8 stroke-[2.5]" />
                  </button>
                ) : (
                  <>
                    {/* Pause / Resume */}
                    {recordingState === 'recording' ? (
                      <button
                        onClick={handlePause}
                        className="w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border text-primary flex items-center justify-center transition-all"
                        title="Pausar"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleResume}
                        className="w-12 h-12 rounded-full bg-accent text-background flex items-center justify-center transition-all"
                        title="Continuar"
                      >
                        <Play className="w-5 h-5 ml-0.5 fill-background" />
                      </button>
                    )}

                    {/* Stop & Finish */}
                    <button
                      onClick={handleStop}
                      className="w-16 h-16 rounded-full bg-destructive text-primary flex items-center justify-center shadow-lg shadow-destructive/30 active:scale-95 transition-all"
                      title="Concluir Gravação"
                    >
                      <Square className="w-7 h-7 fill-primary" />
                    </button>

                    {/* Discard */}
                    <button
                      onClick={handleCancel}
                      className="w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border text-secondary hover:text-destructive flex items-center justify-center transition-all"
                      title="Descartar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Mode switch: Voice or Manual input */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualInput(!isManualInput)}
                  className="text-xs text-secondary hover:text-primary flex items-center space-x-1.5 underline underline-offset-4"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isManualInput ? 'Ocultar teclado' : 'Prefiro digitar meu relato'}</span>
                </button>
              </div>
            </div>
          )}

          {/* REVIEW & TRANSCRIPTION STATE */}
          {(recordingState === 'review' || isManualInput) && (
            <div className="space-y-4">
              {/* Audio playback card if audio exists */}
              {audioBlobUrl && (
                <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleAudioPlay}
                      className="w-10 h-10 rounded-full bg-accent/20 hover:bg-accent/30 text-accent flex items-center justify-center transition-colors"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5 fill-accent" />
                      )}
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-primary">Gravação original</p>
                      <p className="text-[11px] text-secondary font-mono">{formatAudioDuration(duration)}</p>
                    </div>
                  </div>
                  <Volume2 className="w-4 h-4 text-secondary mr-2" />
                  <audio
                    ref={audioPlayerRef}
                    src={audioBlobUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                </div>
              )}

              {/* Live or Editable Transcription */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-secondary flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    <span>Transcrição do Relato</span>
                  </label>
                  {!isSpeechSupported && (
                    <span className="text-[10px] text-accent/80">Web Speech indisponível (digite abaixo)</span>
                  )}
                </div>

                <textarea
                  value={transcriptionText}
                  onChange={(e) => setTranscriptionText(e.target.value)}
                  placeholder="Seu relato transcrito aparecerá aqui em tempo real. Você também pode digitar ou corrigir livremente..."
                  rows={6}
                  className="w-full rounded-xl bg-surface border border-border px-3.5 py-3 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-accent/80 resize-none transition-colors"
                />

                {interimText && (
                  <p className="text-xs italic text-accent/70 px-1">
                    Ouvindo: &quot;{interimText}&quot;...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {(recordingState === 'review' || isManualInput) && (
          <div className="px-5 py-4 border-t border-border bg-graphite/90 flex flex-col space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Simple Save */}
              <button
                disabled={isSaving || !transcriptionText.trim()}
                onClick={() => handleSaveAndOrganize(false)}
                className="py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Localmente</span>
              </button>

              {/* Save & Trigger AI Organizer */}
              <button
                disabled={isSaving || !transcriptionText.trim()}
                onClick={() => handleSaveAndOrganize(true)}
                className="py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-semibold flex items-center justify-center space-x-2 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-background" />
                <span>Organizar com IA</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-secondary">
              Seus dados nunca saem do seu dispositivo sem a sua confirmação explícita.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
