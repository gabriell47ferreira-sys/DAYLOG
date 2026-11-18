import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ContextSnippet {
  id: string;
  date: string;
  title: string;
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, contextSnippets, consent, userApiKey, provider } = body as {
      query: string;
      contextSnippets: ContextSnippet[];
      consent: boolean;
      userApiKey?: string;
      provider?: string;
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Pergunta não informada.' }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json(
        { error: 'Consentimento não concedido para consulta de IA.' },
        { status: 403 }
      );
    }

    if (!contextSnippets || contextSnippets.length === 0) {
      return NextResponse.json({
        answer: 'Não encontrei nenhum registro relevante no seu diário local para responder com segurança a essa pergunta.',
        sources: [],
      });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    const formattedContext = contextSnippets
      .map(
        (s, idx) =>
          `[Fonte ${idx + 1}] Data: ${s.date} | Título: ${s.title}\nConteúdo: ${s.content}`
      )
      .join('\n\n---\n\n');

    // If no external API key, provide smart local answer synthesis
    if (!apiKey) {
      const summaryText = `Com base nos seus registros locais encontrados (${contextSnippets.map((s) => s.date).join(', ')}):\n\n` +
        contextSnippets.map((s) => `• Em ${s.date} ("${s.title}"): ${s.content.substring(0, 150)}...`).join('\n\n') +
        `\n\n*(Resposta gerada pelo motor local. Conecte uma chave Gemini nas configurações para respostas conversacionais avançadas).*`;

      return NextResponse.json({
        answer: summaryText,
        sources: contextSnippets.map((s) => ({ id: s.id, date: s.date, title: s.title })),
        mode: 'local_deterministic',
      });
    }

    const isGemini = (userApiKey && provider === 'gemini') || process.env.GEMINI_API_KEY;

    if (isGemini) {
      const geminiKey = (userApiKey && provider === 'gemini') ? userApiKey : (process.env.GEMINI_API_KEY || apiKey);
      const prompt = `Você é a memória pessoal inteligente do DAYLOG AI.
Sua função é responder à pergunta do usuário utilizando ESTRITAMENTE as evidências presentes nos relatos autorizados fornecidos abaixo.
REGRAS:
1. Nunca invente fatos ou acontecimentos que não estejam nos relatos.
2. Cite sempre as datas dos acontecimentos mencionados.
3. Seja conciso, gentil e direto.
4. Se a informação não estiver presente nos relatos fornecidos, responda que não encontrou registros sobre o assunto no diário.

Relatos autorizados do usuário:
${formattedContext}

Pergunta do usuário:
${query}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao comunicar com a API do Gemini.');
      }

      const resJson = await response.json();
      const answer = resJson.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui obter uma resposta.';

      return NextResponse.json({
        answer,
        sources: contextSnippets.map((s) => ({ id: s.id, date: s.date, title: s.title })),
        mode: 'gemini',
      });
    }

    // OpenAI fallback if present
    if (process.env.OPENAI_API_KEY || (userApiKey && provider === 'openai')) {
      const openAiKey = (userApiKey && provider === 'openai') ? userApiKey : (process.env.OPENAI_API_KEY || apiKey);
      const prompt = `Você é o assistente de memória do DAYLOG AI. Responda à pergunta baseando-se estritamente nas fontes:
Fontes:
${formattedContext}

Pergunta: ${query}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com OpenAI.');
      }

      const resJson = await response.json();
      const answer = resJson.choices?.[0]?.message?.content || 'Não consegui obter uma resposta.';

      return NextResponse.json({
        answer,
        sources: contextSnippets.map((s) => ({ id: s.id, date: s.date, title: s.title })),
        mode: 'openai',
      });
    }

    return NextResponse.json({
      answer: 'Não foi possível contatar o serviço de IA.',
      sources: [],
    });
  } catch (error: unknown) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar consulta de memória.' },
      { status: 500 }
    );
  }
}
