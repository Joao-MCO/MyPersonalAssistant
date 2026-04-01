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
        process.env.GOOGLE_REDIRECT_URI,
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

            const pad = (n: number) => String(n).padStart(2, "0");

            const formatLocalISO = (d: typeof meeting_date) => {
                const pad = (n: number) => String(n).padStart(2, "0");

                return `${d.year}-${pad(d.month)}-${pad(d.day)}T${pad(d.hours)}:${pad(d.minutes)}:00`;
            };

            const startISO = formatLocalISO(meeting_date);

            const endDate = {
                ...meeting_date,
                minutes: meeting_date.minutes + meet_length,
            };

            const endISO = formatLocalISO(endDate);

            const eventBody: any = {
                summary: args.description,
                start: { dateTime: startISO, timeZone: args.timezone },
                end: { dateTime: endISO, timeZone: args.timezone },
                conferenceData: {
                    createRequest: {
                        requestId: uuidv4(),
                        conferenceSolutionKey: { type: "hangoutsMeet" },
                    },
                },
            };

            if (args.attendees && args.attendees.length > 0) {
                eventBody.attendees = args.attendees.map((email: string) => ({ email }));
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
    },
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

            const output = events.map((ev) => {
                const when = ev.start?.dateTime || ev.start?.date;
                return `- ID: ${ev.id} | Data/Hora: ${when} | Título: ${ev.summary || "Sem título"}`;
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
    },
);

export const deleteEventTool = tool(
    async (args, config: RunnableConfig) => {
        const credentials = config?.configurable?.user_credentials;
        const calendar = getCalendarService(credentials);
        if (!calendar) return "Usuário não logado.";

        try {
            await calendar.events.delete({
                calendarId: args.email,
                eventId: args.event_id,
            });

            return "Evento excluído com sucesso da sua agenda!";
        } catch (error: any) {
            console.error("Erro DeleteEvent:", error);
            return `Erro ao excluir evento: ${error.message}`;
        }
    },
    {
        name: "ExcluirEvento",
        description:
            "Excluir um compromisso existente no Google Calendar usando o ID do evento. SEMPRE consulte a agenda antes para obter o ID correto.",
        schema: z.object({
            email: z.string().default("primary").describe("O calendário do usuário, o padrão é 'primary'"),
            event_id: z.string().describe("O ID exato do evento a ser excluído (obtido pela ferramenta ConsultarAgenda)"),
        }),
    },
);

export const freeBusyTool = tool(
    async (args, config: RunnableConfig) => {
        const credentials = config?.configurable?.user_credentials;
        const calendar = getCalendarService(credentials);
        if (!calendar) return "Usuário não logado.";

        try {
            const parseDate = (d: z.infer<typeof dateSchema>) => {
                return new Date(Date.UTC(d.year, d.month - 1, d.day, d.hours, d.minutes)).toISOString();
            };

            const res = await calendar.freebusy.query({
                requestBody: {
                    timeMin: parseDate(args.start_date),
                    timeMax: parseDate(args.end_date),
                    items: [{ id: args.email }],
                },
            });

            const busySlots = res.data.calendars?.[args.email]?.busy || [];
            if (busySlots.length === 0) return "A agenda está totalmente livre neste período.";

            const output = busySlots.map((slot) => `- Ocupado de: ${slot.start} até ${slot.end}`);
            return `Horários ocupados encontrados:\n${output.join("\n")}\n\nQualquer horário fora destes blocos está livre.`;
        } catch (error: any) {
            return `Erro ao consultar disponibilidade: ${error.message}`;
        }
    },
    {
        name: "ProcurarTempoLivre",
        description: "Verifica os blocos de tempo em que o usuário está ocupado para encontrar espaços livres para marcar reuniões.",
        schema: z.object({
            email: z.string().default("primary"),
            start_date: dateSchema,
            end_date: dateSchema,
        }),
    }
);
