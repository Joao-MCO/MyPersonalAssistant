import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";
import { RunnableConfig } from "@langchain/core/runnables";
import { v4 as uuidv4 } from "uuid";

function getCalendarService(credentials: any) {
  if (!credentials) return null;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(credentials);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

const dateSchema = z.object({
  year: z.number(),
  month: z.number(),
  day: z.number(),
  hours: z.number().default(0),
  minutes: z.number().default(0),
});

export const createEventTool = tool(
  async (args, config: RunnableConfig) => {
    const credentials = config?.configurable?.user_credentials;
    const calendar = getCalendarService(credentials);
    if (!calendar) return "Usuário não logado.";

    try {
      const { meeting_date, meet_length } = args;
      const dtStart = new Date(
        meeting_date.year,
        meeting_date.month - 1,
        meeting_date.day,
        meeting_date.hours,
        meeting_date.minutes
      );

      const dtEnd = new Date(dtStart.getTime() + meet_length * 60000);

      const eventBody: any = {
        summary: args.description,
        start: { dateTime: dtStart.toISOString(), timeZone: args.timezone },
        end: { dateTime: dtEnd.toISOString(), timeZone: args.timezone },
        conferenceData: {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      if (args.attendees && args.attendees.length > 0) {
        eventBody.attendees = args.attendees.map(email => ({ email }));
      }

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventBody,
        conferenceDataVersion: 1,
      });

      return `Evento criado com sucesso! Link: ${res.data.htmlLink || "Link indisponível"}`;
    } catch (error: any) {
      console.error("Erro CreateEvent:", error);
      return `Erro ao criar evento: ${error.message}`;
    }
  },
  {
    name: "CriarEvento",
    description: "Criar novos eventos no Google Calendar e gerar link do Meet.",
    schema: z.object({
      meeting_date: dateSchema,
      description: z.string(),
      attendees: z.array(z.string()).optional(),
      meet_length: z.number().default(30).describe("Duração em minutos"),
      timezone: z.string().default("America/Sao_Paulo"),
    }),
  }
);

export const checkCalendarTool = tool(
  async (args, config: RunnableConfig) => {
    const credentials = config?.configurable?.user_credentials;
    const calendar = getCalendarService(credentials);
    if (!calendar) return "Usuário não logado.";

    try {
      const parseDate = (d: z.infer<typeof dateSchema>) => {
        return new Date(Date.UTC(d.year, d.month - 1, d.day, d.hours, d.minutes)).toISOString();
      };

      const res = await calendar.events.list({
        calendarId: args.email,
        timeMin: parseDate(args.start_date),
        timeMax: parseDate(args.end_date),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = res.data.items || [];
      if (events.length === 0) return "Nenhum compromisso encontrado nesse período.";

      const output = events.map(ev => {
        const when = ev.start?.dateTime || ev.start?.date;
        return `- ${when}: ${ev.summary || "Sem título"}`;
      });

      return output.join("\n");
    } catch (error: any) {
      console.error("Erro CheckCalendar:", error);
      return `Erro ao consultar agenda: ${error.message}`;
    }
  },
  {
    name: "ConsultarAgenda",
    description: "Listar compromissos no Google Calendar.",
    schema: z.object({
      email: z.string().default("primary"),
      start_date: dateSchema,
      end_date: dateSchema,
    }),
  }
);
