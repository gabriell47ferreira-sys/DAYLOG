'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ChevronLeft,
  Shield,
  Download,
  Upload,
  Lock,
  Key,
  Database,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserSettings } from '@/types';
import { db } from '@/services/database';
import { createFullBackup, restoreFullBackup } from '@/services/backup';

interface SettingsViewProps {
  onBack: () => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onDataReset }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'server_default'>('gemini');
  const [hasConsentedAI, setHasConsentedAI] = useState<boolean>(true);

  // Backup states
  const [backupPassword, setBackupPassword] = useState<string>('');
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState<boolean>(false);
  const [isSavedMessage, setIsSavedMessage] = useState<boolean>(false);

  useEffect(() => {
    db.user_settings.get('default').then((saved) => {
      if (saved) {
        setSettings(saved);
        setUserName(saved.userName || 'Explorador');
        setApiKey(saved.userApiKey || '');
        setAiProvider(saved.aiProvider || 'gemini');
        setHasConsentedAI(saved.hasConsentedAI ?? true);
      }
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const updated: UserSettings = {
      ...settings,
      userName: userName.trim() || 'Explorador',
      userApiKey: apiKey.trim() || undefined,
      aiProvider,
      hasConsentedAI,
      updatedAt: Date.now(),
    };

    await db.user_settings.put(updated);
    setSettings(updated);
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2500);
  };

  const handleExportBackup = async () => {
    setIsProcessingBackup(true);
    setBackupStatus(null);
    try {
      const backupResult = await createFullBackup(backupPassword);
      const blob = new Blob([backupResult.data], {
        type: backupResult.isEncrypted ? 'application/octet-stream' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('Backup exportado com sucesso! Arquivo salvo no seu dispositivo.');
    } catch (err: unknown) {
      const error = err as Error;
      setBackupStatus(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBackup(true);
    setBackupStatus(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const content = reader.result as string;
        const result = await restoreFullBackup(content, restorePassword);
        setBackupStatus(`Sucesso! ${result.entriesRestored} relatos restaurados.`);
        onDataReset();
      } catch (err: unknown) {
        const error = err as Error;
        setBackupStatus(`Erro ao restaurar: ${error.message}`);
      } finally {
        setIsProcessingBackup(false);
      }
    };
    reader.onerror = () => {
      setBackupStatus('Falha ao ler arquivo de backup.');
      setIsProcessingBackup(false);
    };
    reader.readAsText(file);
  };

  const handleWipeAllData = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODOS os relatos, áudios e tarefas deste aparelho? Essa ação é irreversível a menos que você tenha um backup exportado.')) {
      await db.daily_entries.clear();
      await db.audio_recordings.clear();
      await db.transcriptions.clear();
      await db.tasks.clear();
      await db.people.clear();
      await db.entry_people.clear();
      await db.ai_summaries.clear();
      await db.ai_messages.clear();
      await db.ai_memory_index.clear();
      alert('Banco local zerado.');
      onDataReset();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-accent" />
          <span>Configurações & Privacidade</span>
        </h2>
        <div className="w-12" />
      </div>

      {isSavedMessage && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* User Profile & IA Key Settings */}
      <form onSubmit={handleSaveSettings} className="p-4 rounded-2xl bg-surface border border-border space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Perfil & Provedor de IA</span>
        </h3>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-secondary uppercase">Seu Nome / Como te chamar</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-graphite border border-border text-xs text-primary focus:border-accent outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-secondary uppercase">Provedor de IA Preferido</label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai' | 'server_default')}
            className="w-full px-3 py-2 rounded-xl bg-graphite border border-border text-xs text-primary focus:border-accent outline-none"
          >
            <option value="gemini">Google Gemini (Recomendado)</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="server_default">Servidor Vercel Padrão</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-secondary uppercase flex items-center gap-1">
              <Key className="w-3 h-3 text-accent" />
              <span>Sua Chave de API Pessoal (Opcional)</span>
            </label>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy... ou sk-..."
            className="w-full px-3 py-2 rounded-xl bg-graphite border border-border text-xs text-primary focus:border-accent outline-none font-mono"
          />
          <p className="text-[10px] text-secondary/80">
            Armazenada exclusivamente no navegador do seu dispositivo. Nunca salva em servidores externos.
          </p>
        </div>

        <div className="pt-1">
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasConsentedAI}
              onChange={(e) => setHasConsentedAI(e.target.checked)}
              className="accent-accent mt-0.5"
            />
            <span className="text-xs text-secondary leading-snug">
              Autorizo o envio de trechos autorizados do meu diário para síntese de IA. (Se desativado, o diário opera 100% offline com extrator local).
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold shadow-md shadow-accent/20 transition-all"
        >
          Salvar Preferências
        </button>
      </form>

      {/* Backup and Restore */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-accent" />
          <span>Backup Local & Restauração</span>
        </h3>

        <p className="text-xs text-secondary leading-relaxed">
          Seus dados e áudios estão salvos no IndexedDB deste navegador. Exporte backups regulares para transferir para outros aparelhos ou arquivar com segurança.
        </p>

        {backupStatus && (
          <div className="p-3 rounded-xl bg-surface-subtle border border-accent/40 text-xs text-accent">
            {backupStatus}
          </div>
        )}

        {/* Export with optional encryption */}
        <div className="space-y-2 p-3 rounded-xl bg-graphite border border-border">
          <span className="text-[11px] font-bold text-primary flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Exportar Backup Completo</span>
          </span>
          <div className="space-y-1">
            <input
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Senha de criptografia (opcional)"
              className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-primary outline-none focus:border-accent"
            />
            <p className="text-[10px] text-secondary">
              Se definir uma senha, o arquivo será criptografado com AES-GCM (256-bit).
            </p>
          </div>
          <button
            disabled={isProcessingBackup}
            onClick={handleExportBackup}
            className="w-full py-2 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isProcessingBackup ? 'Processando...' : 'Baixar Arquivo de Backup'}
          </button>
        </div>

        {/* Restore */}
        <div className="space-y-2 p-3 rounded-xl bg-graphite border border-border">
          <span className="text-[11px] font-bold text-primary flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-accent" />
            <span>Restaurar Backup</span>
          </span>
          <input
            type="password"
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
            placeholder="Senha do arquivo (se foi criptografado)"
            className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-primary outline-none focus:border-accent"
          />
          <label className="w-full py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors">
            <span>Selecionar Arquivo .json ou .daylog</span>
            <input
              type="file"
              accept=".json,.daylog"
              onChange={handleImportBackup}
              disabled={isProcessingBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Technical Limitations and Architecture notice */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-accent" />
          <span>Arquitetura e Limitações</span>
        </h3>
        <ul className="text-xs text-secondary space-y-1.5 leading-relaxed pl-1">
          <li className="flex items-start gap-1.5">
            <span className="text-accent">•</span>
            <span>
              <strong>Local-First:</strong> Gravações, transcrições e tarefas residem exclusivamente no IndexedDB do navegador. Nenhum banco de dados remoto guarda sua privacidade.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-accent">•</span>
            <span>
              <strong>Transcrição:</strong> Usa a Web Speech API do navegador. Em navegadores ou situações sem suporte, você pode digitar ou corrigir livremente.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-accent">•</span>
            <span>
              <strong>IA Externa vs Contingência Local:</strong> Funções avançadas de IA exigem conexão com a internet. Sem internet, o DAYLOG AI ativa automaticamente o extrator heurístico local de tarefas e tópicos.
            </span>
          </li>
        </ul>
      </div>

      {/* Danger Zone: Wipe local database */}
      <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
        <span className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Zona de Perigo</span>
        </span>
        <p className="text-[11px] text-destructive/80">
          Apaga todos os dados locais do aplicativo. Tenha certeza de exportar um backup antes.
        </p>
        <button
          onClick={handleWipeAllData}
          className="w-full py-2 rounded-xl bg-destructive text-primary text-xs font-semibold hover:bg-destructive/90 transition-colors"
        >
          Zerar Banco de Dados Local
        </button>
      </div>
    </div>
  );
};
