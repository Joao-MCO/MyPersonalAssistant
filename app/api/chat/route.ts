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
        const session_messages = JSON.parse(formData.get("session_messages") as string);
        const files = formData.getAll("files") as File[];

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI,
        );

        if (user_credentials.expiry_date && user_credentials.expiry_date <= Date.now()) {
            const { credentials } = await oauth2Client.refreshAccessToken();

            cookieStore.set("google_auth_tokens", JSON.stringify(credentials), {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 60 * 24 * 7,
            });

            oauth2Client.setCredentials(credentials);
            user_credentials = credentials;
        } else {
            oauth2Client.setCredentials(user_credentials);
        }

        const userInfoCookie = (await cookies()).get("user_info");
        const user = userInfoCookie ? JSON.parse(userInfoCookie.value) : { name: "Tubarãozinho" };

        const history = [new SystemMessage(getSystemPrompt(user.name)), ...session_messages].map((msg: any) => {
            if (msg.role === "user") return new HumanMessage(msg.content);
            return new AIMessage(msg.content);
        });

        // 🧠 PROCESSAMENTO DE VÁRIOS ARQUIVOS
        const MAX_FILES = 3;
        const MAX_CHARS = 3000;

        let fileContent = "";

        for (const file of files.slice(0, MAX_FILES)) {
            const text = await file.text();

            fileContent += `\n\n[Arquivo: ${file.name}]\n${text.slice(0, MAX_CHARS)}`;
        }

        if (input_text || fileContent) {
            history.push(new HumanMessage(`${input_text}\n\nArquivos:\n${fileContent}`));
        }

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    const eventStream = await cidinhaAgent.streamEvents(
                        { messages: history },
                        {
                            configurable: { user_credentials },
                            recursionLimit: 10,
                            version: "v1",
                        },
                    );

                    for await (const event of eventStream) {
                        if (event.event === "on_tool_start") {
                            controller.enqueue(
                                encoder.encode(
                                    JSON.stringify({
                                        type: "tool_start",
                                        tool: event.name,
                                    }) + "\n",
                                ),
                            );
                        }

                        if (event.event === "on_tool_end") {
                            controller.enqueue(
                                encoder.encode(
                                    JSON.stringify({
                                        type: "tool_end",
                                        tool: event.name,
                                    }) + "\n",
                                ),
                            );
                        }

                        if (event.event === "on_chat_model_stream" || event.event === "on_llm_stream") {
                            const chunk = event.data?.chunk;

                            const content =
                                typeof chunk === "string"
                                    ? chunk
                                    : Array.isArray(chunk?.content)
                                      ? chunk.content.map((c:{text:string}) => c.text).join("")
                                      : chunk?.content || chunk?.text || "";

                            if (content) {
                                controller.enqueue(
                                    encoder.encode(
                                        JSON.stringify({
                                            role: "assistant",
                                            content,
                                        }) + "\n",
                                    ),
                                );
                            }
                            console.log("EVENT:", event.event);
                        }
                    }
                    controller.close();
                } catch (err) {
                    console.error("Erro no streaming:", err);

                    controller.enqueue(
                        encoder.encode(
                            JSON.stringify({
                                role: "assistant",
                                content: "❌ Erro no streaming.",
                            }) + "\n",
                        ),
                    );

                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/json",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error(error);
        return new Response("Erro interno", { status: 500 });
    }
}
