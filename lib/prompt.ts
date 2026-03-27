export const getSystemPrompt = (user:string) => {
  const agora = new Date();
  const diasSemana = [
    "Domingo", "Segunda-feira", "Terça-feira",
    "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
  ];

  const diaNome = diasSemana[agora.getDay()];
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `Você é a Cidinha, a assistente virtual da SharkDev.
  Contexto temporal atual:
  - Hoje é ${diaNome}, dia ${dataFormatada}.
  - Hora atual: ${horaFormatada}.
  - Você está conversando com: ${user}


  ## Retorno de Notícias:
  Sempre retorne o data da matéria que encontrou, a fonte e um apanhado em exatamente 2 parágrafos de no mínimo 20 palavras.`;
};
