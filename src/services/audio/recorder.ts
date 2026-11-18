import { generateId } from '@/lib/utils';
import { AudioRecording } from '@/types';
import { db } from '@/services/database';

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private onDurationUpdate?: (duration: number) => void;
  private onVolumeUpdate?: (volume: number) => void;

  public isRecording: boolean = false;
  public isPaused: boolean = false;
  public duration: number = 0;

  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  static getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  async startRecording(callbacks?: {
    onDurationUpdate?: (duration: number) => void;
    onVolumeUpdate?: (volume: number) => void;
  }): Promise<void> {
    if (!AudioRecordingService.isSupported()) {
      throw new Error('A API de gravação de áudio não é suportada neste navegador.');
    }

    this.onDurationUpdate = callbacks?.onDurationUpdate;
    this.onVolumeUpdate = callbacks?.onVolumeUpdate;
    this.audioChunks = [];
    this.duration = 0;

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permissão do microfone negada. Conceda acesso nas permissões do navegador.');
      }
      throw new Error(`Falha ao acessar o microfone: ${error.message}`);
    }

    // Setup AudioContext for real-time sound volume analysis
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.audioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.startVolumeMonitoring();
      }
    } catch (e) {
      console.warn('AudioContext visualization not available:', e);
    }

    const mimeType = AudioRecordingService.getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    try {
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.audioStream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // collect chunks every 250ms
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();

    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.duration += 1;
        this.onDurationUpdate?.(this.duration);
      }
    }, 1000);
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
    }
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!this.isRecording) return;
      if (this.analyser && !this.isPaused) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        this.onVolumeUpdate?.(normalized);
      }
      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    this.animFrameId = requestAnimationFrame(checkVolume);
  }

  async stopRecording(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Nenhuma gravação em andamento.'));
      }

      this.mediaRecorder.onstop = async () => {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close().catch(() => {});
        }
        if (this.audioStream) {
          this.audioStream.getTracks().forEach((track) => track.stop());
        }

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const recordId = generateId();
        const fileName = `audio_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;

        const audioEntity: AudioRecording = {
          id: recordId,
          createdAt: Date.now(),
          duration: Math.max(1, this.duration),
          mimeType,
          blob: audioBlob,
          fileName,
          size: audioBlob.size,
        };

        try {
          await db.audio_recordings.add(audioEntity);
          this.isRecording = false;
          this.isPaused = false;
          resolve(audioEntity);
        } catch (dbErr) {
          reject(dbErr);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  cancelRecording(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
    }
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.duration = 0;
  }
}
