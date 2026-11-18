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
  Smartphone,
  Share2,
  CheckCircle2,
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

  // PWA Install prompt state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  const [selectedMobileTab, setSelectedMobileTab] = useState<'android' | 'ios'>('android');

  // Backup states
  const [backupPassword, setBackupPassword] = useState<string>('');
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState<boolean>(false);
  const [isSavedMessage, setIsSavedMessage] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Listen for browser PWA install event (Android / Chrome)
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

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

  const handleDirectInstallOrDownload = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (e) {
        console.warn('Install prompt error:', e);
      }
    }

    if (isStandalone) {
      alert('O DAYLOG AI já está instalado e funcionando como app no seu dispositivo!');
      return;
    }

    // Direct download of standalone mobile launcher
    handleDownloadLauncher();
  };

  const handleDownloadLauncher = () => {
    const installHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>DAYLOG AI</title>
  <meta name="theme-color" content="#080A0B">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="https://daylogia.vercel.app/manifest.json">
  <link rel="icon" href="https://daylogia.vercel.app/icons/icon-192x192.png">
  <style>
    body { background: #080A0B; color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box; }
    .icon { width: 80px; height: 80px; border-radius: 20px; background: #121619; border: 2px solid #F59E0B; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; }
    .dot { width: 30px; height: 30px; border-radius: 50%; background: #F59E0B; }
    h1 { margin: 0 0 10px 0; font-size: 24px; color: #F5F5F5; }
    p { margin: 0 0 24px 0; color: #92999F; font-size: 14px; }
    .btn { background: #F59E0B; color: #080A0B; padding: 16px 32px; border-radius: 14px; font-weight: bold; text-decoration: none; font-size: 16px; display: inline-block; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3); }
  </style>
</head>
<body>
  <div class="icon"><div class="dot"></div></div>
  <h1>DAYLOG AI</h1>
  <p>Iniciando seu diário pessoal inteligente...</p>
  <a class="btn" href="https://daylogia.vercel.app">Abrir Aplicativo</a>
  <script>
    setTimeout(function() {
      window.location.href = "https://daylogia.vercel.app";
    }, 500);
  </script>
</body>
</html>`;
    const blob = new Blob([installHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DAYLOG-AI.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setInstallSuccess(true);
  };

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
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bottom-nav-safe">
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
          <span>Configurações & Instalação</span>
        </h2>
        <div className="w-12" />
      </div>

      {isSavedMessage && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* NOVO MÓDULO: DOWNLOAD E INSTALAÇÃO DIRETA */}
      <div className="p-4 rounded-2xl bg-surface border border-accent/50 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-accent" />
            <span>Baixar Aplicativo no Celular</span>
          </h3>
          {isStandalone && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success border border-success/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> App Instalado
            </span>
          )}
        </div>

        <p className="text-xs text-secondary leading-relaxed">
          Instale o <strong>DAYLOG AI</strong> direto no seu aparelho. O aplicativo roda com ícone exclusivo na tela de início, tela cheia e armazenamento local.
        </p>

        {installSuccess && (
          <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Ação realizada com sucesso no seu dispositivo!</span>
          </div>
        )}

        {/* Botões de Ação Direta */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDirectInstallOrDownload}
            className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/25 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Instalar Aplicativo Agora</span>
          </button>

          <button
            onClick={handleDownloadLauncher}
            className="w-full py-2.5 px-3 rounded-xl bg-graphite hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4 text-accent" />
            <span>Baixar Arquivo Inicializador (.html)</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-secondary/70">
          Instalação direta • Não requer lojas de aplicativos
        </p>
      </div>

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
