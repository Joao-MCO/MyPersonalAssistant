import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { cidinhaAgent } from "@/lib/agent";
import { cookies } from "next/headers";
import { getSystemPrompt } from "@/lib/prompt";
import { google } from "googleapis";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get("google_auth_tokens");

        if (!tokenCookie) {
            return new Response(JSON.stringify({ error: "Utilizador não autenticado" }), { status: 401 });
        }

        let user_credentials = JSON.parse(tokenCookie.value);
        const formData = await req.formData();
        const input_text = formData.get("input_text") as string;
        const session_messages = JSON.parse((formData.get("session_messages") as string) || "[]");
        const files = formData.getAll("files") as File[];

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI,
        );

        if (user_credentials?.expiry_date && user_credentials.expiry_date <= Date.now() && user_credentials.refresh_token) {
            oauth2Client.setCredentials(user_credentials);
            const { credentials } = await oauth2Client.refreshAccessToken();
            user_credentials = credentials; // Atualiza a variável local
            cookieStore.set("google_auth_tokens", JSON.stringify(credentials), { httpOnly: true });
        }

        const userInfoCookie = cookieStore.get("user_info");
        const user = userInfoCookie ? JSON.parse(userInfoCookie.value) : { name: "Tubarãozinho" };

        const history = [new SystemMessage(getSystemPrompt(user.name)), ...session_messages].map(
            (msg: { role: string; type: string; content: string }) => {
                if (msg.role === "user" || msg.type === "human") return new HumanMessage(msg.content);
                return new AIMessage(msg.content);
            },
        );

        const MAX_FILES = 3;
        const MAX_CHARS = 3000;
        let fileContent = "";

        for (const file of files.slice(0, MAX_FILES)) {
            const text = await file.text();
            fileContent += `\n\n[Arquivo: ${file.name}]\n${text.slice(0, MAX_CHARS)}`;
        }

        if (input_text || fileContent) {
            history.push(new HumanMessage(`${input_text || ""}\n\nArquivos:\n${fileContent}`));
        }

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const eventStream = cidinhaAgent.streamEvents(
                        { messages: history },
                        {
                            configurable: { user_credentials },
                            recursionLimit: 10,
                            version: "v1",
                        },
                    );

                    for await (const event of eventStream) {
                        if (event.event === "on_tool_start") {
                            const data = JSON.stringify({ type: "tool_start", tool: event.name }) + "\n";
                            controller.enqueue(encoder.encode(data));
                        }

                        if (event.event === "on_tool_end") {
                            const data = JSON.stringify({ type: "tool_end", tool: event.name }) + "\n";
                            controller.enqueue(encoder.encode(data));
                        }

                        if (event.event === "on_llm_stream") {
                            const content = event.data?.chunk?.content || "";
                            if (content) {
                                const data = JSON.stringify({ role: "assistant", content }) + "\n";
                                controller.enqueue(encoder.encode(data));
                            }
                        }
                    }
                } catch (err) {
                    controller.enqueue(
                        encoder.encode(
                            JSON.stringify({
                                type: "error",
                                message: "Erro no processamento",
                            }) + "\n",
                        ),
                    );
                    console.error("Erro no stream:", err);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("Erro na Rota POST:", error);
        return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
    }
}
