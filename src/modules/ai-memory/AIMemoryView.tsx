'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Lock,
  Calendar,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { AIMessage, DailyEntry } from '@/types';
import { db } from '@/services/database';
import { generateId, formatDateBR } from '@/lib/utils';

interface AIMemoryViewProps {
  entries: DailyEntry[];
  onSelectEntry: (entry: DailyEntry) => void;
}

export const AIMemoryView: React.FC<AIMemoryViewProps> = ({
  entries,
  onSelectEntry,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [consentGranted, setConsentGranted] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string>('conv-default');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sampleQuestions = [
    'O que aconteceu nos meus últimos registros?',
    'Quais tarefas e compromissos foram mencionados?',
    'Quais foram minhas principais reflexões recentes?',
    'Com quem eu conversei ou me reuni recentemente?',
  ];

  useEffect(() => {
    // Load messages for default conversation
    db.ai_messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('timestamp')
      .then((loaded) => {
        setMessages(loaded);
      });
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');

    // 1. Save user message
    const userMsg: AIMessage = {
      id: generateId(),
      conversationId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      authorizedConsent: consentGranted,
    };
    await db.ai_messages.add(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. Perform LOCAL search across IndexedDB daily entries
      const qLower = textToSend.toLowerCase();
      // Tokenize terms
      const tokens = qLower
        .replace(/[^\w\sáéíóúâêôãõç]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !['que', 'com', 'para', 'onde', 'como', 'quem', 'meus', 'minhas'].includes(t));

      // Match entries
      const matchedEntries = entries.filter((entry) => {
        const fullContent = (entry.title + ' ' + entry.rawText + ' ' + (entry.summary || '')).toLowerCase();
        if (tokens.length === 0) return true; // match recent
        return tokens.some((token) => fullContent.includes(token));
      });

      // Sort by recency and take top 5 most relevant
      const relevantEntries = (matchedEntries.length > 0 ? matchedEntries : entries.slice(0, 5)).slice(0, 5);

      const snippets = relevantEntries.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        content: (e.summary || e.rawText).substring(0, 300),
      }));

      // 3. Request AI answer with consent check
      const userSettings = await db.user_settings.get('default');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          contextSnippets: snippets,
          consent: consentGranted,
          userApiKey: userSettings?.userApiKey,
          provider: userSettings?.aiProvider || 'gemini',
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do assistente de memória.');
      }

      const resJson = await response.json();

      const assistantMsg: AIMessage = {
        id: generateId(),
        conversationId,
        role: 'assistant',
        content: resJson.answer,
        sourceSnippets: snippets.map((s) => ({
          entryId: s.id,
          date: s.date,
          title: s.title,
          snippet: s.content.substring(0, 80) + '...',
        })),
        sourceEntryIds: snippets.map((s) => s.id),
        timestamp: Date.now(),
        authorizedConsent: consentGranted,
      };

      await db.ai_messages.add(assistantMsg);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const error = err as Error;
      const errorReply: AIMessage = {
        id: generateId(),
        conversationId,
        role: 'assistant',
        content: `Desculpe, ocorreu um erro ao consultar seus registros: ${error.message}`,
        timestamp: Date.now(),
        authorizedConsent: consentGranted,
      };
      await db.ai_messages.add(errorReply);
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm('Limpar histórico desta conversa?')) {
      await db.ai_messages.where('conversationId').equals(conversationId).delete();
      setMessages([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bottom-nav-safe">
      {/* Header */}
      <div className="p-4 border-b border-border bg-graphite/70 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent fill-accent" />
            <span>Memória Pessoal IA</span>
          </h2>
          <p className="text-[11px] text-secondary">
            Respostas baseadas estritamente nos relatos do seu diário
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-secondary hover:text-destructive hover:bg-surface transition-colors"
            title="Limpar mensagens"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="py-6 space-y-5">
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-primary">Converse com seu Diário</h3>
              <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
                Sua memória pessoal busca registros locais e sintetiza respostas baseadas em evidências reais das suas anotações.
              </p>
            </div>

            {/* Quick Sample Questions */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary px-1">
                Sugestões de perguntas:
              </span>
              <div className="space-y-1.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="w-full text-left p-3 rounded-xl bg-surface border border-border hover:border-accent/50 text-xs text-primary transition-all active:scale-[0.99]"
                  >
                    &quot;{q}&quot;
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-background font-medium rounded-tr-sm shadow-md shadow-accent/20'
                    : 'bg-surface text-primary border border-border rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Sources & Evidences citations */}
                {msg.sourceSnippets && msg.sourceSnippets.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                      Fontes consultadas:
                    </span>
                    <div className="flex flex-col space-y-1">
                      {msg.sourceSnippets.map((src, i) => {
                        const targetEntry = entries.find((e) => e.id === src.entryId);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => targetEntry && onSelectEntry(targetEntry)}
                            className="text-left px-2 py-1 rounded bg-graphite border border-border/80 text-[11px] text-secondary hover:text-accent flex items-center justify-between transition-colors"
                          >
                            <span className="truncate mr-2 font-mono">
                              {formatDateBR(src.date)} — {src.title}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-secondary mt-1 px-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-secondary animate-pulse p-2">
            <Sparkles className="w-4 h-4 text-accent animate-spin" />
            <span>Consultando relatos e formulando resposta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-border bg-graphite/95 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Pergunte sobre seus acontecimentos..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs text-primary placeholder:text-secondary/60 focus:border-accent outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover text-background flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
            aria-label="Enviar pergunta"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-secondary px-1">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              className="accent-accent rounded w-3 h-3"
            />
            <span>Autorizar envio de trechos filtrados para IA</span>
          </label>
          <span className="text-accent/90 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Privado
          </span>
        </div>
      </div>
    </div>
  );
};
