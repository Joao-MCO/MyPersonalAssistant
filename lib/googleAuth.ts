import { google, Auth, gmail_v1 } from 'googleapis';

// Configuração básica do cliente
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export class GoogleServiceFactory {
  static async getGmailService(userTokens: any) {
    oauth2Client.setCredentials(userTokens);

    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        console.log("Novo Refresh Token recebido:", tokens.refresh_token);
      }
      console.log("Novo Access Token gerado:", tokens.access_token);
    });

    try {
      await oauth2Client.getAccessToken();

      return google.gmail({ version: 'v1', auth: oauth2Client });
    } catch (error) {
      console.error("Erro ao validar credenciais Google:", error);
      return null;
    }
  }
}
