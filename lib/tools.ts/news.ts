import { tool } from "@langchain/core/tools";
import { z } from "zod";

const TOPICOS_PADRAO = [
  "general", "world", "nation", "business", "technology",
  "entertainment", "sports", "science", "health"
];

export const newsTool = tool(
  async ({ qtde_noticias, assuntos, pais }) => {
    console.log(`[Tool] Buscando notícias: qtde=${qtde_noticias}, assuntos='${assuntos}'`);

    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return "Erro: Chave da API do GNews não configurada (GNEWS_API_KEY).";
    }

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 2);

    const fromDate = startDate.toISOString().split('T')[0] + 'T00:00:00Z';
    const toDate = today.toISOString().split('T')[0] + 'T23:59:59Z';

    const assuntosLower = assuntos.toLowerCase().trim();
    let listaTemas = TOPICOS_PADRAO;

    if (!["all", "geral", "noticias", ""].includes(assuntosLower)) {
      listaTemas = assuntos.split(',').map(t => t.trim());
    }

    const resultadosFinais: string[] = [];
    const seenTitles = new Set<string>();

    for (const tema of listaTemas) {
      let endpoint = "search";
      let qParam = `q=${encodeURIComponent(tema)}`;

      if (TOPICOS_PADRAO.includes(tema)) {
        endpoint = "top-headlines";
        qParam = `category=${tema}`;
      }

      let url = `https://gnews.io/api/v4/${endpoint}?${qParam}&max=${qtde_noticias}&country=${pais}&from=${fromDate}&to=${toDate}&apikey=${apiKey}`;

      if (endpoint === "search") {
        url += "&sortBy=publishedAt";
      }

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.articles && data.articles.length > 0) {
          resultadosFinais.push(`\n--- TEMA: ${tema.toUpperCase()} ---`);

          for (const article of data.articles) {
            if (!article.title || seenTitles.has(article.title)) continue;

            seenTitles.add(article.title);

            const desc = article.description || 'Ver link.';
            const source = article.source?.name || 'GNews';
            const pubDate = article.publishedAt ? article.publishedAt.substring(0, 10) : '';

            resultadosFinais.push(
              `- ${article.title}\n  Fonte: ${source} | Data: ${pubDate}\n  Resumo: ${desc}\n  Link: ${article.url}`
            );
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar no GNews para o tema '${tema}':`, error);
      }
    }

    if (resultadosFinais.length === 0) {
      return "Não encontrei informações recentes para estes assuntos.";
    }

    return resultadosFinais.join("\n");
  },
  {
    name: "LerNoticias",
    description: "Busca notícias e atualizações recentes usando o GNews. Use para notícias gerais, esportes, mercado.",
    schema: z.object({
      qtde_noticias: z.number().default(3).describe("Quantidade de notícias a buscar por tema"),
      assuntos: z.string().default("").describe("Temas separados por vírgula. Ex: 'tecnologia, esportes'"),
      pais: z.string().default("br").describe("Código do país, ex: 'br' ou 'us'")
    }),
  }
);
