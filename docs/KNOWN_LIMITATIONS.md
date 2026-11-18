# DAYLOG AI — Limitações Conhecidas & Transparência Técnica

Como diretriz inegociável do projeto, não prometemos capacidades inexistentes. Abaixo estão documentadas as limitações técnicas reais da arquitetura Local-First e dos recursos de navegador atuais:

---

## 1. Transcrição de Áudio (Web Speech API)
- **Dependência do Navegador:** A `Web Speech API` é implementada nativamente pelo navegador (Chrome, Edge, Samsung Internet, Safari moderno). Em navegadores baseados no Chromium, o processamento de voz pode consultar o serviço de reconhecimento de fala da Google.
- **Funcionamento Offline da Transcrição:** Se o dispositivo estiver desconectado e o mecanismo de fala do sistema operacional não tiver o pacote de voz em português baixado localmente, a transcrição por voz poderá falhar.
- **Solução de Contorno Implementada:** O DAYLOG AI detecta a falha ou ausência do serviço e oferece imediatamente a digitação e correção manual do texto.

## 2. Processamento por IA Generativa
- **Necessidade de Conexão com a Internet:** As sínteses narrativas ricas e respostas conversacionais da Memória Pessoal utilizam modelos de linguagem avançados (Google Gemini / OpenAI) que são hospedados na nuvem e exigem internet. Não há modelo LLM de bilhões de parâmetros rodando no motor JavaScript do navegador.
- **Solução de Contorno Implementada:** Quando desconectado ou quando o usuário opta por não enviar dados para a IA externa, o sistema ativa automaticamente o **Extrator Heurístico Local**. Ele identifica tarefas, nomes, categorias e valores usando regras linguísticas e expressões regulares no próprio aparelho, garantindo que o diário nunca pare de funcionar.

## 3. Armazenamento no Navegador (IndexedDB)
- **Limpeza de Dados do Navegador:** Como os dados residem no IndexedDB do dispositivo, se o usuário limpar completamente os dados de navegação e cookies do domínio, o banco de dados local será esvaziado.
- **Recomendação:** É fundamental realizar exportações periódicas através do módulo **Configurações > Exportar Backup Completo** (com senha criptografada).

## 4. Quotas de Áudio
- Gravações de áudio são armazenadas em blobs binários no IndexedDB. O navegador gerencia dinamicamente o espaço livre do disco. Gravações longas (várias horas) podem ocupar centenas de megabytes. Para o uso diário padrão de 1 a 5 minutos por dia, o armazenamento local é virtualmente ilimitado para anos de relatos.
