import { tool } from "@langchain/core/tools";
import { z } from "zod";

const MAX_TOPICS = 3;
const MAX_ARTICLES_PER_TOPIC = 3;
const MAX_TOTAL_ARTICLES = 6;

export const newsTool = tool(
    async ({ qtde_noticias, assuntos, pais, data_inicio, data_fim }) => {
        console.log(`[Tool] Buscando notícias: qtde=${qtde_noticias}, assuntos='${assuntos}'`);

        const apiKey = process.env.GNEWS_API_KEY;
        if (!apiKey) {
            return "Erro: Chave da API do GNews não configurada (GNEWS_API_KEY).";
        }

        const today = new Date();
        const toDate = data_fim ? `${data_fim}T23:59:59Z` : today.toISOString().split("T")[0] + "T23:59:59Z";

        let fromDate;
        if (data_inicio) {
            fromDate = `${data_inicio}T00:00:00Z`;
        } else {
            const startDate = new Date();
            startDate.setDate(today.getDate() - 2);
            fromDate = startDate.toISOString().split("T")[0] + "T00:00:00Z";
        }

        const defaultTopics = ["technology", "business", "world"];
        const assuntosLower = assuntos.toLowerCase().trim();

        let listaTemas: string[];

        if (!["all", "geral", "noticias", ""].includes(assuntosLower)) {
            listaTemas = assuntos
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
        } else {
            listaTemas = defaultTopics;
        }

        listaTemas = listaTemas.slice(0, MAX_TOPICS);

        const requests = listaTemas.map((tema) => {
            let endpoint = "search";
            let qParam = `q=${encodeURIComponent(tema)}`;

            if (defaultTopics.includes(tema)) {
                endpoint = "top-headlines";
                qParam = `category=${tema}`;
            }

            let url = `https://gnews.io/api/v4/${endpoint}?${qParam}&max=${Math.min(qtde_noticias, MAX_ARTICLES_PER_TOPIC)}&country=${pais}&from=${fromDate}&to=${toDate}&apikey=${apiKey}`;

            if (endpoint === "search") {
                url += "&sortBy=publishedAt";
            }

            return fetch(url)
                .then((res) => res.json())
                .then((data) => ({
                    tema,
                    articles: data.articles || [],
                }))
                .catch((error) => {
                    console.error(`Erro no tema '${tema}':`, error);
                    return { tema, articles: [] };
                });
        });

        const responses = await Promise.all(requests);

        const resultadosFinais: string[] = [];
        const seenTitles = new Set<string>();

        let totalCount = 0;

        for (const { tema, articles } of responses) {
            if (!articles.length) continue;

            const blocoTema: string[] = [];

            for (const article of articles) {
                if (!article.title || seenTitles.has(article.title)) continue;

                seenTitles.add(article.title);

                const desc = article.description || "Ver link.";
                const source = article.source?.name || "GNews";
                const pubDate = article.publishedAt ? article.publishedAt.substring(0, 10) : "";

                blocoTema.push(
                    `- ${article.title}\n  Fonte: ${source} | Data: ${pubDate}\n  Resumo: ${desc}\n  Link: ${article.url}`,
                );

                totalCount++;
                if (totalCount >= MAX_TOTAL_ARTICLES) break;
            }

            if (blocoTema.length > 0) {
                resultadosFinais.push(`\n--- TEMA: ${tema.toUpperCase()} ---`);
                resultadosFinais.push(...blocoTema);
            }

            if (totalCount >= MAX_TOTAL_ARTICLES) break;
        }

        if (resultadosFinais.length === 0) {
            return "Não encontrei informações recentes para estes assuntos.";
        }

        return resultadosFinais.join("\n");
    },
    {
        name: "LerNoticias",
        description:
            "Busca notícias recentes usando GNews. Use para assuntos atuais como tecnologia, mercado, esportes ou notícias gerais.",
        schema: z.object({
            qtde_noticias: z.number().default(3).describe("Quantidade de notícias por tema"),
            assuntos: z.string().default("").describe("Temas separados por vírgula. Ex: 'tecnologia, esportes'"),
            pais: z.string().default("br").describe("Código do país, ex: 'br' ou 'us'"),
            data_inicio: z.string().optional().describe("Formato YYYY-MM-DD. Ex: 2023-10-01"),
            data_fim: z.string().optional().describe("Formato YYYY-MM-DD. Ex: 2023-10-31"),
        }),
    },
);
