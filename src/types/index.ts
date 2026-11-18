export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  title: string;
  rawText: string;
  summary?: string;
  audioId?: string;
  transcriptionId?: string;
  categoryIds: string[];
  peopleIds?: string[];
  location?: string;
  mood?: string;
  aiOrganized: boolean;
  aiOrganizedAt?: number;
  tags?: string[];
}

export interface AudioRecording {
  id: string;
  entryId?: string;
  createdAt: number;
  duration: number; // in seconds
  mimeType: string;
  blob: Blob;
  fileName: string;
  size: number;
}

export interface Transcription {
  id: string;
  entryId?: string;
  audioId?: string;
  createdAt: number;
  text: string;
  language: string;
  confidence?: number;
  source: 'web_speech' | 'manual' | 'server';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  isEdited: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export interface Task {
  id: string;
  entryId?: string; // Relationship to source entry
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'completed';
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  mentionCount: number;
  firstMentionedAt: number;
  lastMentionedAt: number;
}

export interface EntryPerson {
  id: string;
  entryId: string;
  personId: string;
}

export interface AISummary {
  id: string;
  entryId?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: string; // YYYY-MM-DD, YYYY-Www, or YYYY-MM
  summary: string;
  highlights: string[];
  actionItems: string[];
  createdAt: number;
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sourceEntryIds?: string[];
  sourceSnippets?: {
    entryId: string;
    date: string;
    title: string;
    snippet: string;
  }[];
  timestamp: number;
  authorizedConsent: boolean;
}

export interface AIMemoryIndex {
  id: string;
  entryId: string;
  keywords: string[];
  entities: string[];
  lastIndexedAt: number;
}

export interface UserSettings {
  id: string; // usually 'default'
  userName: string;
  theme: 'dark';
  language: string;
  hasConsentedAI: boolean;
  userApiKey?: string;
  aiProvider: 'gemini' | 'openai' | 'server_default';
  speechLang: string;
  autoTranscribe: boolean;
  updatedAt: number;
}

// Extracted AI Organization result
export interface AIOrganizationResult {
  title: string;
  summary: string;
  categories: string[];
  people: string[];
  locations: string[];
  ideas: string[];
  tasks: {
    title: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }[];
  datesMentioned: string[];
  expensesMentioned: string[];
}
