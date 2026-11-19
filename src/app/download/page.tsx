'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HardDrive,
  Cpu,
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-background text-primary flex justify-center p-4 selection:bg-accent selection:text-background">
      <div className="w-full max-w-md flex flex-col space-y-6 py-4">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs text-secondary hover:text-primary transition-colors py-1.5 px-3 rounded-xl bg-surface border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Diário</span>
          </Link>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent font-semibold">
            Versão v1.0.0
          </span>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-graphite border-2 border-accent/40 shadow-2xl shadow-accent/20 flex items-center justify-center relative overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-accent animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-accent/20 to-transparent pointer-events-none" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              DAYLOG <span className="text-accent">AI</span>
            </h1>
            <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">
              Diário pessoal inteligente, gravação de áudio e privacidade Local-First.
            </p>
          </div>
        </div>

        {/* Technical Badges */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-surface border border-border space-y-1">
            <HardDrive className="w-4 h-4 text-accent mx-auto" />
            <span className="text-[10px] text-secondary uppercase font-semibold block">Tamanho Estimado</span>
            <span className="text-xs font-bold text-primary font-mono">~15 MB (Aprox.)</span>
          </div>
          <div className="p-3 rounded-2xl bg-surface border border-border space-y-1">
            <Cpu className="w-4 h-4 text-accent mx-auto" />
            <span className="text-[10px] text-secondary uppercase font-semibold block">Android</span>
            <span className="text-xs font-bold text-primary font-mono">7.0+</span>
          </div>
          <div className="p-3 rounded-2xl bg-surface border border-border space-y-1">
            <ShieldCheck className="w-4 h-4 text-success mx-auto" />
            <span className="text-[10px] text-secondary uppercase font-semibold block">Segurança</span>
            <span className="text-xs font-bold text-success font-mono">Local-First</span>
          </div>
        </div>

        {/* Primary Download / Install Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-graphite to-surface border border-accent/40 shadow-xl space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-accent text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 fill-accent" />
              <span>Instalação Oficial Android</span>
            </div>
            <h2 className="text-base font-bold text-primary">
              Aplicativo Nativo para Smartphone
            </h2>
            <p className="text-xs text-secondary leading-relaxed">
              Instale o aplicativo diretamente no seu celular Android. Ele roda em tela cheia com ícone exclusivo na tela inicial e acesso offline.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Direct APK Download Button */}
            <button
              onClick={() => setDownloadModalOpen(true)}
              className="w-full py-4 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-background text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/25 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>Baixar Pacote APK (.apk)</span>
            </button>

            {/* Instant Web PWA Button */}
            <Link
              href="/"
              className="w-full py-3 px-4 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-accent" />
              <span>Instalar Instantaneamente via Web (PWA)</span>
            </Link>
          </div>
        </div>

        {/* Installation Instructions Guide */}
        <div className="p-5 rounded-3xl bg-surface border border-border space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-accent" />
            <span>Como Instalar o APK no Android</span>
          </h3>

          <div className="space-y-3 text-xs text-secondary">
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <p className="text-primary font-semibold">Baixe o arquivo .apk</p>
                <p className="text-[11px] text-secondary mt-0.5">
                  Toque no botão de download acima para baixar o arquivo no seu smartphone.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <p className="text-primary font-semibold">Permitir instalação</p>
                <p className="text-[11px] text-secondary mt-0.5">
                  Se o Android exibir aviso de segurança, toque em &quot;Configurações&quot; e habilite &quot;Permitir desta fonte&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div>
                <p className="text-primary font-semibold">Concluir e Abrir</p>
                <p className="text-[11px] text-secondary mt-0.5">
                  Toque em &quot;Instalar&quot;. O ícone oficial do DAYLOG AI aparecerá na sua tela inicial!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-surface-subtle border border-border/80 flex items-start space-x-3 text-xs text-secondary">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            O DAYLOG AI é <strong>100% Local-First</strong>. Seus relatos, gravações de áudio e dados pessoais nunca são salvos em servidores remotos.
          </p>
        </div>

        {/* APK Download / Build Status Modal */}
        {downloadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-graphite rounded-3xl border border-accent/40 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-accent text-background flex items-center justify-center font-bold">
                    <Download className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-bold text-primary">Pacote Android APK</h3>
                </div>
                <button
                  onClick={() => setDownloadModalOpen(false)}
                  className="p-1 text-secondary hover:text-primary rounded-full text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                Você pode gerar e baixar o pacote <strong>.apk</strong> assinado para Android agora através do empacotador oficial:
              </p>

              <div className="space-y-2">
                <a
                  href="https://github.com/gabriell47ferreira-sys/DAYLOG/releases/latest/download/DAYLOG-AI.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-accent/20 text-center"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar APK Direto (GitHub Release)</span>
                </a>

                <a
                  href="https://www.pwabuilder.com/reportcard?site=https://daylogia.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-graphite hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all text-center"
                >
                  <span>Gerador Alternativo (PWABuilder)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                </a>

                <Link
                  href="/"
                  className="w-full py-2.5 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Smartphone className="w-4 h-4 text-accent" />
                  <span>Abrir e Usar Versão PWA Direta</span>
                </Link>
              </div>

              <p className="text-[10px] text-center text-secondary/70">
                Gera pacote assinado compatível com todos os smartphones Android.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
