import { NextRequest, NextResponse } from 'next/server';
import { extractHeuristicOrganization } from '@/services/ai/localParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, consent, userApiKey, provider } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texto não fornecido.' }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json(
        { error: 'Consentimento explícito não concedido para processamento de IA.' },
        { status: 403 }
      );
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    // If no key is available or user is simulating offline fallback
    if (!apiKey) {
      const heuristic = extractHeuristicOrganization(text);
      return NextResponse.json({
        data: heuristic,
        source: 'local_heuristic',
        message: 'Organização estruturada gerada pelo motor local (chave de IA externa não configurada).',
      });
    }

    // Use Gemini if GEMINI_API_KEY exists or provider is gemini
    const isGemini = (userApiKey && provider === 'gemini') || process.env.GEMINI_API_KEY;

    if (isGemini) {
      const geminiKey = (userApiKey && provider === 'gemini') ? userApiKey : (process.env.GEMINI_API_KEY || apiKey);
      const prompt = `Você é o organizador inteligente do DAYLOG AI, um diário pessoal.
Analise o relato do usuário a seguir e retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown de código e sem texto extra antes ou depois) com o seguinte esquema:
{
  "title": "título curto e expressivo para o dia (máx 6 palavras)",
  "summary": "resumo conciso em 2 a 3 frases em português",
  "categories": ["lista de categorias identificadas, ex: Trabalho, Pessoal, Finanças, Saúde, Ideias"],
  "people": ["nomes de pessoas mencionadas"],
  "locations": ["lugares ou cidades mencionados"],
  "ideas": ["ideias, reflexões ou insights identificados"],
  "tasks": [
    {
      "title": "ação a ser realizada",
      "priority": "low" | "medium" | "high",
      "dueDate": "YYYY-MM-DD ou null se não mencionada"
    }
  ],
  "datesMentioned": ["datas ou dias da semana mencionados"],
  "expensesMentioned": ["valores ou gastos mencionados"]
}

Relato do usuário:
"""
${text}
"""`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', errorText);
        // Fallback to local heuristic parser smoothly
        const fallback = extractHeuristicOrganization(text);
        return NextResponse.json({
          data: fallback,
          source: 'local_heuristic_fallback',
          warning: 'Falha temporária na API externa de IA. Motor de contingência local ativado.',
        });
      }

      const resJson = await response.json();
      const rawOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) {
        throw new Error('Resposta vazia da IA.');
      }

      const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);

      return NextResponse.json({
        data: parsedData,
        source: 'gemini',
      });
    }

    // Fallback if OpenAI
    if (process.env.OPENAI_API_KEY || (userApiKey && provider === 'openai')) {
      const openAiKey = (userApiKey && provider === 'openai') ? userApiKey : (process.env.OPENAI_API_KEY || apiKey);
      const prompt = `Analise o relato do usuário e retorne estritamente JSON:
{
  "title": "título curto",
  "summary": "resumo conciso",
  "categories": ["categorias"],
  "people": ["pessoas"],
  "locations": ["lugares"],
  "ideas": ["ideias"],
  "tasks": [{"title": "tarefa", "priority": "medium", "dueDate": null}],
  "datesMentioned": ["datas"],
  "expensesMentioned": ["valores"]
}

Relato:
${text}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const fallback = extractHeuristicOrganization(text);
        return NextResponse.json({
          data: fallback,
          source: 'local_heuristic_fallback',
          warning: 'Falha na conexão com OpenAI. Motor local ativado.',
        });
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      const parsedData = JSON.parse(content);
      return NextResponse.json({ data: parsedData, source: 'openai' });
    }

    const fallback = extractHeuristicOrganization(text);
    return NextResponse.json({ data: fallback, source: 'local_heuristic' });
  } catch (error: unknown) {
    console.error('AI Organize error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar relato com IA.' },
      { status: 500 }
    );
  }
}
