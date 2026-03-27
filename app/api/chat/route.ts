import { NextResponse } from 'next/server';
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { cidinhaAgent } from '@/lib/agent';
import { cookies } from 'next/headers';
import { getSystemPrompt } from '@/lib/prompt';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('google_auth_tokens');

    if (!tokenCookie) {
        return NextResponse.json({ error: "Utilizador não autenticado" }, { status: 401 });
    }

    const user_credentials = JSON.parse(tokenCookie.value);
    const { input_text, session_messages } = await req.json();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials(user_credentials);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const res = await oauth2.userinfo.get();

    const history = [new SystemMessage(getSystemPrompt((res.data.name as string)|| "Tubarãozinho")),...session_messages].map((msg: any) => {
      if (msg.role === 'user') return new HumanMessage(msg.content);
      return new AIMessage(msg.content);
    });

    if (input_text) {
      history.push(new HumanMessage(input_text));
    }

    const result = await cidinhaAgent.invoke(
      { messages: history },
      {
        configurable: {
          user_credentials: user_credentials
        }
      }
    );

    const lastMessage = result.messages[result.messages.length - 1];

    return NextResponse.json({
      output: [{
        role: "assistant",
        content: lastMessage.content || "Ação concluída."
      }]
    });

  } catch (error) {
    console.error('Erro na rota de chat:', error);
    return NextResponse.json({
      output: [{ role: "assistant", content: "❌ Erro ao se comunicar com a IA." }]
    }, { status: 500 });
  }
}
