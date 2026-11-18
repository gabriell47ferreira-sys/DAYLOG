const assert = require('assert');
const { extractHeuristicOrganization } = require('../src/services/ai/localParser.ts');

async function runTests() {
  console.log('--- INICIANDO BATERIA DE TESTES DAYLOG AI ---');

  // Test 1: Local Heuristic Parser (Offline Mode)
  console.log('1. Testando extrator heurístico local (Modo Offline)...');
  const sampleText = `Hoje tive uma reunião com Carlos sobre o projeto da nova plataforma.
Preciso enviar o relatório financeiro até amanhã.
Lembrar de ligar para a Dra. Mariana para marcar a consulta.
Gastei R$ 150 no mercado.
Tive uma ideia de criar um sistema de diário inteligente para melhorar a produtividade.`;

  const parsed = extractHeuristicOrganization(sampleText);
  assert(parsed.title && parsed.title.length > 0, 'Título deve ser gerado');
  assert(parsed.tasks.length >= 2, `Deveria ter extraído tarefas, extraiu: ${parsed.tasks.length}`);
  assert(parsed.people.some(p => p.includes('Carlos')), 'Deveria ter extraído Carlos como pessoa');
  assert(parsed.categories.includes('Trabalho') || parsed.categories.includes('Finanças'), 'Deveria ter detectado categorias');
  assert(parsed.expensesMentioned.some(e => e.includes('150')), 'Deveria ter detectado R$ 150');
  assert(parsed.ideas.length >= 1, 'Deveria ter detectado a ideia');
  console.log('   ✓ Extrator heurístico aprovado!');

  // Test 2: Privacy Check - No consent
  console.log('2. Testando verificação de consentimento estrito...');
  const { POST: organizeHandler } = require('../src/app/api/ai/organize/route.ts');
  const mockReqNoConsent = {
    json: async () => ({ text: 'Teste', consent: false })
  };
  const resNoConsent = await organizeHandler(mockReqNoConsent);
  assert.strictEqual(resNoConsent.status, 403, 'Requisição sem consentimento explícito deve retornar 403');
  console.log('   ✓ Bloqueio de privacidade sem consentimento aprovado (403)!');

  // Test 3: Fallback when no API Key is set
  console.log('3. Testando resposta segura da API sem credenciais externas...');
  const mockReqConsent = {
    json: async () => ({ text: sampleText, consent: true })
  };
  const resConsent = await organizeHandler(mockReqConsent);
  assert.strictEqual(resConsent.status, 200, 'Deve retornar 200 com fallback heurístico');
  const resJson = await resConsent.json();
  assert(resJson.data && resJson.data.title, 'Deve retornar dados estruturados');
  console.log('   ✓ Motor de contingência ativado sem expor credenciais!');

  // Test 4: AI Memory Chat Context Handling
  console.log('4. Testando rota de AI Memory com evidências e citações...');
  const { POST: chatHandler } = require('../src/app/api/ai/chat/route.ts');
  const mockChatReq = {
    json: async () => ({
      query: 'O que eu conversei com o Carlos?',
      contextSnippets: [
        { id: 'entry-1', date: '2026-11-18', title: 'Reunião do Projeto', content: 'Reunião com Carlos sobre a plataforma.' }
      ],
      consent: true
    })
  };
  const chatRes = await chatHandler(mockChatReq);
  assert.strictEqual(chatRes.status, 200, 'Chat deve responder 200');
  const chatJson = await chatRes.json();
  assert(chatJson.answer && chatJson.sources.length === 1, 'Deve citar a fonte da evidência');
  console.log('   ✓ Citação e evidências do chat aprovadas!');

  // Test 5: Empty context should not invent hallucinated replies
  console.log('5. Testando prevenção de alucinação sem fontes...');
  const mockChatEmptyReq = {
    json: async () => ({
      query: 'Onde passei minhas férias em 2019?',
      contextSnippets: [],
      consent: true
    })
  };
  const chatEmptyRes = await chatHandler(mockChatEmptyReq);
  const chatEmptyJson = await chatEmptyRes.json();
  assert(chatEmptyJson.sources.length === 0, 'Não deve inventar fontes');
  assert(chatEmptyJson.answer.includes('Não encontrei') || chatEmptyJson.answer.includes('nenhum registro'), 'Deve avisar que não encontrou');
  console.log('   ✓ Prevenção de alucinações sem evidências aprovada!');

  console.log('\n=== TODAS AS VALIDAÇÕES DE TESTE FORAM APROVADAS COM SUCESSO! ===');
}

runTests().catch(err => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
