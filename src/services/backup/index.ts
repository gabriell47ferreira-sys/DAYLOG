import { db } from '@/services/database';
import {
  DailyEntry,
  AudioRecording,
  Transcription,
  Category,
  Task,
  Person,
  EntryPerson,
  AISummary,
  AIConversation,
  AIMessage,
  AIMemoryIndex,
  UserSettings,
} from '@/types';

export interface BackupData {
  version: number;
  timestamp: number;
  daily_entries: DailyEntry[];
  audio_recordings: {
    id: string;
    entryId?: string;
    createdAt: number;
    duration: number;
    mimeType: string;
    base64Data: string;
    fileName: string;
    size: number;
  }[];
  transcriptions: Transcription[];
  categories: Category[];
  tasks: Task[];
  people: Person[];
  entry_people: EntryPerson[];
  ai_summaries: AISummary[];
  ai_conversations: AIConversation[];
  ai_messages: AIMessage[];
  ai_memory_index: AIMemoryIndex[];
  user_settings: UserSettings[];
}

// Convert Blob to Base64 string
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:audio/webm;base64,....."
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Convert Base64 string back to Blob
export async function base64ToBlob(base64: string, fallbackMime: string = 'audio/webm'): Promise<Blob> {
  const parts = base64.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || fallbackMime;
  const binaryString = atob(parts[1] || parts[0]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// Client-side encryption helpers using Web Crypto API (AES-GCM + PBKDF2)
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(dataString: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(dataString)
  );

  const payload = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(encryptedContent)),
  };

  return JSON.stringify(payload);
}

export async function decryptData(encryptedJson: string, password: string): Promise<string> {
  const parsed = JSON.parse(encryptedJson);
  const salt = new Uint8Array(parsed.salt);
  const iv = new Uint8Array(parsed.iv);
  const ciphertext = new Uint8Array(parsed.ciphertext);

  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Creates a complete export of all IndexedDB tables.
 */
export async function createFullBackup(password?: string): Promise<{ data: string; fileName: string; isEncrypted: boolean }> {
  const entries = await db.daily_entries.toArray();
  const rawAudios = await db.audio_recordings.toArray();
  const transcriptions = await db.transcriptions.toArray();
  const categories = await db.categories.toArray();
  const tasks = await db.tasks.toArray();
  const people = await db.people.toArray();
  const entryPeople = await db.entry_people.toArray();
  const aiSummaries = await db.ai_summaries.toArray();
  const aiConversations = await db.ai_conversations.toArray();
  const aiMessages = await db.ai_messages.toArray();
  const aiMemoryIndex = await db.ai_memory_index.toArray();
  const userSettings = await db.user_settings.toArray();

  const serializedAudios = await Promise.all(
    rawAudios.map(async (a) => ({
      id: a.id,
      entryId: a.entryId,
      createdAt: a.createdAt,
      duration: a.duration,
      mimeType: a.mimeType,
      fileName: a.fileName,
      size: a.size,
      base64Data: await blobToBase64(a.blob),
    }))
  );

  const backupObject: BackupData = {
    version: 1,
    timestamp: Date.now(),
    daily_entries: entries,
    audio_recordings: serializedAudios,
    transcriptions,
    categories,
    tasks,
    people,
    entry_people: entryPeople,
    ai_summaries: aiSummaries,
    ai_conversations: aiConversations,
    ai_messages: aiMessages,
    ai_memory_index: aiMemoryIndex,
    user_settings: userSettings,
  };

  const jsonString = JSON.stringify(backupObject, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];

  if (password && password.trim().length > 0) {
    const encrypted = await encryptData(jsonString, password);
    return {
      data: encrypted,
      fileName: `daylog-ai-backup-encrypted-${dateStr}.daylog`,
      isEncrypted: true,
    };
  }

  return {
    data: jsonString,
    fileName: `daylog-ai-backup-${dateStr}.json`,
    isEncrypted: false,
  };
}

/**
 * Restores all data from backup JSON / encrypted file into IndexedDB.
 */
export async function restoreFullBackup(backupContent: string, password?: string): Promise<{ success: boolean; entriesRestored: number }> {
  let jsonString = backupContent;

  if (password && password.trim().length > 0) {
    try {
      jsonString = await decryptData(backupContent, password);
    } catch {
      throw new Error('Falha ao descriptografar backup. Senha incorreta ou arquivo corrompido.');
    }
  }

  let data: BackupData;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Formato de arquivo inválido. Não foi possível decodificar os dados.');
  }

  if (!data.daily_entries || !Array.isArray(data.daily_entries)) {
    throw new Error('Estrutura de dados incompatível com o DAYLOG AI.');
  }

  // Restore audio blobs
  const audioEntities: AudioRecording[] = await Promise.all(
    (data.audio_recordings || []).map(async (sa) => ({
      id: sa.id,
      entryId: sa.entryId,
      createdAt: sa.createdAt,
      duration: sa.duration,
      mimeType: sa.mimeType,
      fileName: sa.fileName,
      size: sa.size,
      blob: await base64ToBlob(sa.base64Data, sa.mimeType),
    }))
  );

  // Transactionally save all tables
  await db.transaction('rw', [
    db.daily_entries,
    db.audio_recordings,
    db.transcriptions,
    db.categories,
    db.tasks,
    db.people,
    db.entry_people,
    db.ai_summaries,
    db.ai_conversations,
    db.ai_messages,
    db.ai_memory_index,
    db.user_settings,
  ], async () => {
    if (data.daily_entries?.length) await db.daily_entries.bulkPut(data.daily_entries);
    if (audioEntities?.length) await db.audio_recordings.bulkPut(audioEntities);
    if (data.transcriptions?.length) await db.transcriptions.bulkPut(data.transcriptions);
    if (data.categories?.length) await db.categories.bulkPut(data.categories);
    if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
    if (data.people?.length) await db.people.bulkPut(data.people);
    if (data.entry_people?.length) await db.entry_people.bulkPut(data.entry_people);
    if (data.ai_summaries?.length) await db.ai_summaries.bulkPut(data.ai_summaries);
    if (data.ai_conversations?.length) await db.ai_conversations.bulkPut(data.ai_conversations);
    if (data.ai_messages?.length) await db.ai_messages.bulkPut(data.ai_messages);
    if (data.ai_memory_index?.length) await db.ai_memory_index.bulkPut(data.ai_memory_index);
    if (data.user_settings?.length) await db.user_settings.bulkPut(data.user_settings);
  });

  return { success: true, entriesRestored: data.daily_entries.length };
}
