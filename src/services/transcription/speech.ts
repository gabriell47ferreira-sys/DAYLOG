import { generateId } from '@/lib/utils';
import { Transcription } from '@/types';
import { db } from '@/services/database';

// Extend window for Web Speech API types
interface IWindow extends Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SpeechRecognition?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webkitSpeechRecognition?: any;
}

export class SpeechTranscriptionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private isListening: boolean = false;
  private accumulatedText: string = '';
  private interimText: string = '';

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  startRecognition(options: {
    language?: string;
    onInterimResult?: (currentFullText: string, interimChunk: string) => void;
    onFinalResult?: (finalText: string) => void;
    onError?: (errorMsg: string) => void;
  }): void {
    if (!SpeechTranscriptionService.isSupported()) {
      options.onError?.('Reconhecimento de voz (Web Speech) não disponível neste navegador. Use a entrada manual.');
      return;
    }

    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'pt-BR';

      this.accumulatedText = '';
      this.interimText = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.accumulatedText += (this.accumulatedText ? ' ' : '') + transcript.trim();
          } else {
            currentInterim += transcript;
          }
        }
        this.interimText = currentInterim;
        const fullDisplay = this.accumulatedText + (currentInterim ? ` ${currentInterim}` : '');
        options.onInterimResult?.(fullDisplay, currentInterim);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal silence, don't crash
          return;
        }
        if (event.error === 'not-allowed') {
          options.onError?.('Permissão do microfone negada para reconhecimento de fala.');
          return;
        }
        options.onError?.(`Erro no reconhecimento de fala: ${event.error}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onFinalResult?.(this.accumulatedText);
      };

      this.recognition.start();
      this.isListening = true;
    } catch (err: unknown) {
      const error = err as Error;
      options.onError?.(error.message || 'Falha ao iniciar reconhecimento de voz');
    }
  }

  stopRecognition(): string {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
    return this.accumulatedText;
  }

  getCurrentText(): string {
    return (this.accumulatedText + (this.interimText ? ` ${this.interimText}` : '')).trim();
  }

  /**
   * Persists transcription to IndexedDB
   */
  static async saveTranscription(params: {
    entryId?: string;
    audioId?: string;
    text: string;
    source: 'web_speech' | 'manual' | 'server';
    language?: string;
    confidence?: number;
  }): Promise<Transcription> {
    const id = generateId();
    const transcription: Transcription = {
      id,
      entryId: params.entryId,
      audioId: params.audioId,
      createdAt: Date.now(),
      text: params.text.trim(),
      language: params.language || 'pt-BR',
      source: params.source,
      status: 'completed',
      confidence: params.confidence ?? 0.95,
      isEdited: false,
    };

    await db.transcriptions.add(transcription);
    return transcription;
  }
}
