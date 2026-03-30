import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.NEON_CNS
});

export const sqlTool = tool(
    async ({ query }) => {
        try {
            if (!query.toLowerCase().startsWith("select")) {
                return "❌ Apenas queries SELECT são permitidas.";
            }

            const result = await pool.query(query);

            return JSON.stringify(result.rows, null, 2);
        } catch (error) {
            console.error("Erro SQL:", error);
            return "❌ Erro ao executar query.";
        }
    },
    {
        name: "queryDatabase",
        description: `
            Use esta ferramenta SEMPRE que a pergunta envolver futebol, dados, jogos, jogadores, estatísticas ou competições.

            Tabelas disponíveis:

            1. competitions
            - id (integer)
            - name (string)
            - category (string)
            - primary_color (string)
            - secondary_color (string)

            2. teams
            - id (integer)
            - name (string)
            - city (string)
            - country (string)
            - color_primary (string)
            - color_secondary (string)
            - manager_id (integer)

            3. matches
            - id (integer)
            - year (string)
            - round (string)
            - stadium (string)
            - city (string)
            - home_score (integer)
            - away_score (integer)
            - competition_id (integer)
            - referee_id (integer)
            - home_team_id (integer)
            - away_team_id (integer)

            4. persons
            - id (integer)
            - name (string)
            - nationality (string)
            - date_of_birth (date)
            - type (string) → player, referee, manager
            - height (integer)
            - market_value (integer)
            - primary_position (string)
            - games (integer)
            - yellows (integer)
            - reds (integer)

            5. player_stats
            - id (integer)
            - match_id (integer)
            - player_id (integer)
            - team_id (integer)
            - jersey_number (string)
            - position (string)
            - substitute (boolean)
            - minutes_played (integer)
            - rating (float)
            - raw_stats (json)

            6. match_team_stats
            - id (integer)
            - match_id (integer)
            - team_id (integer)
            - stat_name (string)
            - value (json)

            Relacionamentos importantes:
            - matches.home_team_id → teams.id
            - matches.away_team_id → teams.id
            - matches.competition_id → competitions.id
            - matches.referee_id → persons.id

            - teams.manager_id → persons.id

            - player_stats.player_id → persons.id
            - player_stats.team_id → teams.id
            - player_stats.match_id → matches.id

            - match_team_stats.match_id → matches.id
            - match_team_stats.team_id → teams.id

            Regras:
            - Use apenas queries SELECT
            - Sempre use JOIN quando precisar cruzar dados
            - Use LIMIT 10 por padrão, a menos que o usuário peça mais
            - Prefira nomes legíveis nos resultados (ex: team.name ao invés de id)
            - Para jogadores, filtre persons.type = 'player'
            - Para técnicos, filtre persons.type = 'manager'
            - Para árbitros, filtre persons.type = 'referee'

            Alguns dados estão armazenados em campos JSON (como raw_stats e value).

            Você DEVE:
            - extrair valores usando ->> (PostgreSQL JSON)
            - converter para número quando necessário (::int, ::float)
            - usar agregações como SUM, AVG, COUNT quando fizer sentido

            Exemplo:
            SUM((raw_stats->>'goals')::int)

            Exemplos de perguntas que você pode responder:
            - "Quais foram os últimos jogos?"
            - "Qual time fez mais gols?"
            - "Jogadores com maior rating"
            - "Times por país"
            - "Partidas de uma competição específica"
            - "Estatísticas de um jogador em um jogo"

            Esta é a única fonte confiável de dados. Nunca responda sem usar esta tool nesses casos.
        `,
        schema: z.object({
            query: z.string().describe("Query SQL a ser executada"),
        }),
    },
);
