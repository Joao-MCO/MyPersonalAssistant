import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";
import { RunnableConfig } from "@langchain/core/runnables";

function getGmailService(credentials: any) {
  if (!credentials) return null;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(credentials);
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export const checkEmailTool = tool(
  async (args, config: RunnableConfig) => {
    const credentials = config?.configurable?.user_credentials;
    const gmail = getGmailService(credentials);

    if (!gmail) return "Usuário não logado. Por favor, faça login no Google.";

    try {
      const filtros = [];
      if (args.query) filtros.push(args.query);
      if (args.data_inicio) filtros.push(`after:${args.data_inicio}`);
      if (args.data_fim) filtros.push(`before:${args.data_fim}`);

      const q = filtros.join(" ");
      const res = await gmail.users.messages.list({
        userId: "me",
        q,
        maxResults: args.max_results,
      });

      const messages = res.data.messages || [];
      if (messages.length === 0) return "Nenhum e-mail encontrado.";

      const emailsRetornados = [];
      const details = await Promise.all(
        messages.map(msg => gmail.users.messages.get({
                userId: 'me', id: msg.id, format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date'],
            }))
        );
        for(const detail of details){
            const headers = detail.data.payload?.headers || [];
            const subject = headers.find(h => h.name === "Subject")?.value || "Sem assunto";
            const sender = headers.find(h => h.name === "From")?.value || "Desconhecido";
            const snippet = detail.data.snippet || "Sem resumo";

            emailsRetornados.push(`De: ${sender}\nAssunto: ${subject}\nResumo: ${snippet}...`);
        }

      return emailsRetornados.join("\n\n---\n\n");
    } catch (error: any) {
      console.error("Erro CheckEmail:", error);
      return `Erro ao ler emails: ${error.message}`;
    }
  },
  {
    name: "ConsultarEmail",
    description: "Consultar emails na caixa de entrada do usuário.",
    schema: z.object({
      max_results: z.number().default(5),
      query: z.string().optional(),
      data_inicio: z.string().optional().describe("Formato YYYY/MM/DD"),
      data_fim: z.string().optional().describe("Formato YYYY/MM/DD"),
    }),
  }
);

export const sendEmailTool = tool(
  async (args, config: RunnableConfig) => {
    const credentials = config?.configurable?.user_credentials;
    const gmail = getGmailService(credentials);

    if (!gmail) return "Usuário não logado. Por favor, faça login no Google.";

    try {
      const messageParts = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        "MIME-Version: 1.0",
        `Content-Type: text/${args.body_type}; charset="UTF-8"`,
        "",
        args.body,
      ];

      const message = messageParts.join("\n");
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      });

      return "Email enviado com sucesso.";
    } catch (error: any) {
      console.error("Erro SendEmail:", error);
      return `Erro ao enviar email: ${error.message}`;
    }
  },
  {
    name: "EnviarEmail",
    description: "Enviar email para um ou mais destinatários.",
    schema: z.object({
      to: z.string().describe("Email do destinatário"),
      subject: z.string().describe("Assunto do email"),
      body: z.string().describe("Corpo do email"),
      body_type: z.string().default("plain").describe("plain ou html"),
    }),
  }
);
