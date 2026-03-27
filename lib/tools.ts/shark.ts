import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { CloudClient } from "chromadb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

const embeddingsModel = new GoogleGenerativeAIEmbeddings({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2-preview",
    apiKey: process.env.GEMINI_API_KEY,
    taskType: TaskType.RETRIEVAL_QUERY,
});

export const sharkTool = tool(
    async ({ pergunta, temas }) => {
        console.log(`[Tool] Consultando RAG Shark: ${pergunta}`);
        try {
            const queryTexts = [...(temas || []), pergunta];

            const queryEmbeddings = await embeddingsModel.embedDocuments(queryTexts);
            const client = new CloudClient({
                apiKey: process.env.CHROMA_API_KEY,
                tenant: process.env.CHROMA_TENANT,
                database: process.env.CHROMA_DATABASE,
            });
            const collection = await client.getCollection({ name: "shark_helper" });

            const data = await collection.query({
                queryEmbeddings: queryEmbeddings,
                nResults: 3,
            });
            const documents = data.documents || [];
            const flatDocs = documents.flat().filter((doc) => doc !== null) as string[];

            if (flatDocs.length === 0) {
                return "Não encontrei informações internas sobre esse assunto na base da SharkDev.";
            }

            return flatDocs.join("\n\n---\n\n");
        } catch (error: any) {
            console.error("Erro RAG Shark:", error);
            return "Erro ao consultar base de conhecimento da SharkDev.";
        }
    },
    {
        name: "AjudaShark",
        description:
            "Use esta ferramenta como PADRÃO para responder perguntas técnicas, dúvidas sobre a SharkDev (Blip, Bots, Processos), ou qualquer outra dúvida geral que NÃO seja sobre Agenda, Reuniões ou Notícias.",
        schema: z.object({
            pergunta: z.string().describe("A pergunta exata feita pelo usuário"),
            temas: z.array(z.string()).describe("Lista de temas ou palavras-chave"),
        }),
    },
);
