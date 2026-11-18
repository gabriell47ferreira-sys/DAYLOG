import Dexie, { type Table } from 'dexie';
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

export class DaylogDatabase extends Dexie {
  daily_entries!: Table<DailyEntry, string>;
  audio_recordings!: Table<AudioRecording, string>;
  transcriptions!: Table<Transcription, string>;
  categories!: Table<Category, string>;
  tasks!: Table<Task, string>;
  people!: Table<Person, string>;
  entry_people!: Table<EntryPerson, string>;
  ai_summaries!: Table<AISummary, string>;
  ai_conversations!: Table<AIConversation, string>;
  ai_messages!: Table<AIMessage, string>;
  ai_memory_index!: Table<AIMemoryIndex, string>;
  user_settings!: Table<UserSettings, string>;

  constructor() {
    super('DaylogAIDatabase');

    this.version(1).stores({
      daily_entries: 'id, date, createdAt, updatedAt, aiOrganized, *categoryIds, *peopleIds',
      audio_recordings: 'id, entryId, createdAt',
      transcriptions: 'id, entryId, audioId, createdAt, status',
      categories: 'id, name, isDefault',
      tasks: 'id, entryId, dueDate, priority, status, createdAt',
      people: 'id, name, mentionCount, lastMentionedAt',
      entry_people: 'id, entryId, personId, [entryId+personId]',
      ai_summaries: 'id, entryId, type, period, createdAt',
      ai_conversations: 'id, createdAt, updatedAt',
      ai_messages: 'id, conversationId, timestamp',
      ai_memory_index: 'id, entryId, *keywords, *entities',
      user_settings: 'id',
    });
  }
}

export const db = new DaylogDatabase();

// Default seed categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-personal', name: 'Pessoal', color: '#10B981', isDefault: true },
  { id: 'cat-work', name: 'Trabalho', color: '#3B82F6', isDefault: true },
  { id: 'cat-ideas', name: 'Ideias & Insights', color: '#F59E0B', isDefault: true },
  { id: 'cat-health', name: 'Saúde & Bem-estar', color: '#EC4899', isDefault: true },
  { id: 'cat-finance', name: 'Finanças', color: '#8B5CF6', isDefault: true },
  { id: 'cat-projects', name: 'Projetos', color: '#06B6D4', isDefault: true },
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  userName: 'Explorador',
  theme: 'dark',
  language: 'pt-BR',
  hasConsentedAI: false,
  aiProvider: 'gemini',
  speechLang: 'pt-BR',
  autoTranscribe: true,
  updatedAt: Date.now(),
};

/**
 * Initializes database seeds safely without overriding existing data
 */
export async function initializeDatabase() {
  try {
    const categoriesCount = await db.categories.count();
    if (categoriesCount === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }

    const settings = await db.user_settings.get('default');
    if (!settings) {
      await db.user_settings.add(DEFAULT_SETTINGS);
    }
  } catch (err) {
    console.error('Error initializing database seeds:', err);
  }
}
