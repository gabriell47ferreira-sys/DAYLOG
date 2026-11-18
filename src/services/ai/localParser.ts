import { AIOrganizationResult } from '@/types';

/**
 * Intelligent client-side heuristic parser for offline mode or when external AI is not configured.
 * Extracts tasks, people, categories, ideas, dates and expenses from Portuguese text using regex and linguistic patterns.
 */
export function extractHeuristicOrganization(rawText: string): AIOrganizationResult {
  const text = rawText.trim();
  const lines = text.split(/\n+/);
  const firstSentence = text.split(/[.?!]/)[0]?.trim() || 'Registro do Dia';
  const title = firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;

  // Extract tasks: matches lines or phrases with "preciso", "tenho que", "fazer", "enviar", "comprar", "lembrar de", "agendar", "pagar", "- [ ]", etc.
  const taskPatterns = [
    /(?:preciso|tenho que|devo|fazer|lembrar de|agendar|enviar|pagar|comprar|organizar|revisar|ligar para)\s+([^.?!,;]+)/gi,
    /[-*•]\s*(?:tarefa|todo:?)?\s*([^.\n]+)/gi,
  ];

  const tasks: { title: string; priority: 'low' | 'medium' | 'high'; dueDate?: string }[] = [];
  const taskSet = new Set<string>();

  for (const pattern of taskPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const taskTitle = match[1]?.trim();
      if (taskTitle && taskTitle.length > 4 && !taskSet.has(taskTitle.toLowerCase())) {
        taskSet.add(taskTitle.toLowerCase());
        const isUrgent = /(?:urgente|hoje|imediato|rápido|atenção)/i.test(taskTitle);
        tasks.push({
          title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
          priority: isUrgent ? 'high' : 'medium',
        });
      }
    }
  }

  // Extract People (Capitalized names following "com", "para", "conversou com", "reunião com", etc.)
  const peoplePattern = /(?:com|para|encontrei|falou com|reunião com|dr\.|dra\.)\s+([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+)?)/g;
  const peopleSet = new Set<string>();
  let matchPerson;
  while ((matchPerson = peoplePattern.exec(text)) !== null) {
    const name = matchPerson[1]?.trim();
    if (name && name.length > 2 && !['Hoje', 'Amanhã', 'Ontem', 'Deus', 'Dia'].includes(name)) {
      peopleSet.add(name);
    }
  }

  // Extract Expenses (R$ 50, 100 reais, etc.)
  const expensePattern = /(?:R\$\s*[\d.,]+|[\d.,]+\s*(?:reais|dólares|mil reais))/gi;
  const expenses = text.match(expensePattern) || [];

  // Extract Dates mentioned
  const datePattern = /(?:hoje|amanhã|ontem|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
  const dates = Array.from(new Set(text.match(datePattern) || []));

  // Extract Ideas / Insights
  const ideaPattern = /(?:ideia|insight|pensei em|tive uma reflexão|percebi que|conclusão:?)\s+([^.?!]+)/gi;
  const ideas: string[] = [];
  let matchIdea;
  while ((matchIdea = ideaPattern.exec(text)) !== null) {
    if (matchIdea[1]) {
      ideas.push(matchIdea[1].trim());
    }
  }

  // Detect Categories based on keywords
  const categories: string[] = [];
  const lower = text.toLowerCase();
  if (/(trabalho|reunião|cliente|projeto|empresa|escritório|código|sprint|deploy)/i.test(lower)) {
    categories.push('Trabalho');
  }
  if (/(pessoal|família|casa|amigo|vida|jantar|almoço|viagem)/i.test(lower)) {
    categories.push('Pessoal');
  }
  if (/(ideia|insight|projeto|futuro|invenção|estudo|livro|aprendizado)/i.test(lower)) {
    categories.push('Ideias & Insights');
  }
  if (/(treino|academia|corrida|médico|remédio|saúde|sono|cansaço|dieta)/i.test(lower)) {
    categories.push('Saúde & Bem-estar');
  }
  if (/(gastei|comprei|paguei|dinheiro|investimento|banco|fatura|reais|valor)/i.test(lower)) {
    categories.push('Finanças');
  }

  if (categories.length === 0) {
    categories.push('Pessoal');
  }

  // Summary
  const summary = lines.length > 1 ? lines.slice(0, 3).join(' ') : text.substring(0, 200);

  return {
    title,
    summary: summary.length > 250 ? summary.substring(0, 247) + '...' : summary,
    categories,
    people: Array.from(peopleSet),
    locations: [],
    ideas,
    tasks: tasks.slice(0, 8),
    datesMentioned: dates,
    expensesMentioned: Array.from(new Set(expenses)),
  };
}
