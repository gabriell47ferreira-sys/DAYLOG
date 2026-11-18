# DAYLOG AI — Personal AI Journal (Mobile-First & Local-First PWA)

> **O usuário fala. O sistema registra. A IA organiza. O usuário consulta.**

O **DAYLOG AI** é um diário pessoal inteligente mobile-first com arquitetura **Local-First**. Ele permite que você registre acontecimentos cotidianos por voz, organizando tarefas, tópicos, pessoas e relatórios com inteligência artificial efêmera — garantindo que seus dados nunca fiquem armazenados em bancos de dados remotos.

---

## 💎 Identidade Visual e Estética
- **Preto Profundo:** `#080A0B`
- **Grafite:** `#121619`
- **Superfície:** `#191E22`
- **Laranja de Destaque:** `#F59E0B`
- **Branco:** `#F5F5F5`
- **Cinza Secundário:** `#92999F`

---

## 🔒 Princípios de Privacidade & Arquitetura Local-First

- **Hospedagem na Vercel:** Entrega da interface estática e rotas de processamento efêmero de IA sem estado.
- **Armazenamento no Aparelho do Usuário (IndexedDB via Dexie.js):**
  - Áudios gravados originais (Blobs binários)
  - Transcrições textuais
  - Categorias e pessoas identificadas
  - Tarefas e pendências
  - Índices de pesquisa local
  - Configurações do usuário
- **Zero Bancos Remotos:** Não utiliza Supabase, Firebase ou PostgreSQL para armazenar seus relatos privados.
- **Processamento de IA com Consentimento:** Nenhum dado é transmitido sem autorização explícita.
- **Contingência 100% Offline:** Se estiver sem internet ou sem chave de API, o motor heurístico local assume a organização estruturada de tópicos, tarefas e despesas.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js 18+ (recomendado Node 20+)
- npm 9+

### Instalação
```bash
# Clone ou acesse o diretório do projeto
cd "DAYLOG AI"

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador ou acesse pelo celular na mesma rede local.

### Build de Produção
```bash
npm run build
npm start
```

---

## 🌐 Configuração de Variáveis de Ambiente para Deploy na Vercel

Crie um arquivo `.env.local` na raiz do projeto (ou configure nas variáveis de ambiente da sua Vercel):

```env
# Provedor padrão de IA do servidor (opcional - o usuário também pode informar sua chave nas configurações locais)
GEMINI_API_KEY=sua_chave_do_google_ai_studio
# ou
OPENAI_API_KEY=sua_chave_da_openai
```

---

## 📁 Estrutura do Código

```
src/
  app/
    api/
      ai/
        organize/route.ts  # Rota efêmera para extração de tarefas e tópicos
        chat/route.ts      # Rota efêmera para consulta com evidências locais
    layout.tsx             # Root layout com PWA viewport e safe areas
    page.tsx               # Orquestrador central da aplicação
  components/
    Header.tsx             # Barra superior com status online/offline
    BottomNav.tsx          # Barra de navegação inferior mobile-first
  modules/
    dashboard/             # Visão geral do dia e resumo
    voice-journal/         # Gravação de áudio com MediaRecorder e Web Speech
    ai-organizer/          # Modal de revisão e consentimento de IA
    timeline/              # Histórico, calendário e detalhes de relatos
    tasks/                 # Gestão de tarefas vinculadas a relatos
    reports/               # Sínteses e métricas periódicas reais
    ai-memory/             # Chat conversacional contextual com fontes citadas
    settings/              # Backup AES-GCM, privacidade e chaves
  services/
    database/              # Dexie.js e entidades do IndexedDB
    audio/                 # Gravação, volume e blobs
    transcription/         # Web Speech API e entrada manual
    ai/                    # Extrator heurístico offline
    backup/                # Exportação/importação com criptografia AES-GCM
  types/                   # Tipagens TypeScript rigorosas
  styles/                  # Tailwind globals e cores de luxo
docs/
  ARCHITECTURE.md          # Diagrama e decisões de design
  SPRINT_01_REPORT.md      # Relatório detalhado da Sprint 01
  SPRINT_02_REPORT.md      # Relatório detalhado da Sprint 02
  SPRINT_03_REPORT.md      # Relatório detalhado da Sprint 03
  KNOWN_LIMITATIONS.md     # Transparência sobre limitações técnicas
  MOBILE_INSTALLATION_GUIDE.md # Instruções passo a passo de instalação PWA
```

---

## 🧪 Testes Automatizados

Para executar a suíte de testes de validação das rotas, extrator heurístico, prevenção de alucinações e consentimento de privacidade:

```bash
npx tsx scripts/test-suite.js
```
